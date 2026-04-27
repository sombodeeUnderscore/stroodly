import { useState, useEffect } from "react";
import type { AgentRunWithSteps, AgentRunStatus } from "@workspace/api-client-react";

interface UseRunStreamResult {
  run: AgentRunWithSteps | null;
  error: string | null;
  isStreaming: boolean;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function useRunStream(agentId: number, task: string, startImmediately: boolean = false): UseRunStreamResult & { start: () => Promise<void> } {
  const [run, setRun] = useState<AgentRunWithSteps | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);

  const start = async () => {
    if (isStreaming) return;
    setIsStreaming(true);
    setError(null);

    try {
      const response = await fetch(`/api/agents/${agentId}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task }),
      });

      if (!response.ok) {
        throw new Error("Failed to start run");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      const decoder = new TextDecoder();
      
      let currentRun: AgentRunWithSteps = {
        id: Date.now(),
        agentId,
        agentName: "Agent",
        task,
        status: "running" as AgentRunStatus,
        stepCount: 0,
        createdAt: new Date().toISOString(),
        steps: []
      };

      setRun(currentRun);

      let buffer = "";

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          
          const dataStr = line.replace("data: ", "").trim();
          if (!dataStr) continue;

          let event: Record<string, unknown>;
          try {
            event = JSON.parse(dataStr) as Record<string, unknown>;
          } catch {
            console.error("Failed to parse SSE message, skipping line");
            continue;
          }

          if (event.type === "step") {
            currentRun = {
              ...currentRun,
              stepCount: currentRun.stepCount + 1,
              steps: [...currentRun.steps, event.step as AgentRunWithSteps["steps"][number]]
            };
            setRun(currentRun);
          } else if (event.type === "done") {
            currentRun = {
              ...currentRun,
              status: "completed" as AgentRunStatus,
              output: typeof event.output === "string" ? event.output : undefined,
              completedAt: new Date().toISOString(),
              id: typeof event.runId === "number" ? event.runId : currentRun.id
            };
            setRun(currentRun);
            setIsStreaming(false);
            return;
          } else if (event.type === "error") {
            const msg = typeof event.message === "string" ? event.message : "Agent run failed";
            setError(msg);
            setRun(prev => prev ? { ...prev, status: "failed" as AgentRunStatus } : prev);
            setIsStreaming(false);
            break outer;
          }
        }
      }
    } catch (err: unknown) {
      const msg = errorMessage(err);
      setError(msg);
      setRun(prev => prev ? { ...prev, status: "failed" as AgentRunStatus } : prev);
    } finally {
      setIsStreaming(false);
    }
  };

  useEffect(() => {
    if (startImmediately && agentId && task) {
      start();
    }
  }, [startImmediately, agentId, task]);

  return { run, error, isStreaming, start };
}
