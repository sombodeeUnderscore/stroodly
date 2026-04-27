import { db } from "@workspace/db";
import { agentsTable, agentRunsTable, runStepsTable, toolsTable, type Agent } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { AsyncLocalStorage } from "node:async_hooks";
import { ChatOpenAI } from "@langchain/openai";
import { DynamicTool, DynamicStructuredTool, type Tool } from "@langchain/core/tools";
import { z } from "zod";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from "@langchain/core/messages";
import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import type { Serialized } from "@langchain/core/load/serializable";
import type { LLMResult } from "@langchain/core/outputs";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { makeBuiltinTool, BUILTIN_TOOL_METADATA, callLLM } from "../builtin-tools";

export type RunStepEvent = {
  stepIndex: number;
  type: string;
  content: string;
  toolName?: string;
  runId: number;
  createdAt: string;
};

export type EmitFn = (event: RunStepEvent) => Promise<void> | void;

const BUILTIN_IDS = new Set(BUILTIN_TOOL_METADATA.map((m) => m.id));

// ---------------------------------------------------------------------------
// Agent call context — propagated via AsyncLocalStorage through every async
// hop of an in-flight run. Used by the `call_agent` tool to (a) detect cycles
// in the call chain and (b) enforce a hard recursion ceiling so a runaway
// sub-agent loop can't take down the server. Each nested invocation pushes
// the agent's id onto `chain` and increments `depth`.
// ---------------------------------------------------------------------------
type AgentContext = { chain: number[]; depth: number };
const agentContext = new AsyncLocalStorage<AgentContext>();
const MAX_AGENT_CALL_DEPTH = 3;

async function buildToolForAgentToolName(toolName: string): Promise<Tool | undefined> {
  // Special-case: call_agent needs access to createAndExecuteRun (defined in
  // this same module) and to the agentContext, so it isn't built from the
  // generic IMPLS map in builtin-tools.ts.
  if (toolName === "call_agent") {
    return makeCallAgentTool();
  }
  if (BUILTIN_IDS.has(toolName)) {
    return makeBuiltinTool(toolName);
  }
  if (toolName.startsWith("custom_")) {
    const idStr = toolName.slice("custom_".length);
    const customId = Number(idStr);
    if (!Number.isInteger(customId) || customId <= 0) return undefined;
    const [ct] = await db.select().from(toolsTable).where(eq(toolsTable.id, customId));
    if (!ct) return undefined;
    if (ct.type === "webhook") {
      const webhookUrl = (ct.config as { url?: string }).url ?? "";
      return new DynamicTool({
        name: toolName,
        description: ct.description,
        func: async (input: string) => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10_000);
            let res: Response;
            try {
              res = await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ input }),
                signal: controller.signal,
              });
            } finally {
              clearTimeout(timeoutId);
            }
            if (!res.ok) {
              const errText = await res.text();
              return `[Webhook Error] ${res.status}: ${errText.substring(0, 500)}`;
            }
            const text = await res.text();
            return `[Webhook Result]\n${text.substring(0, 4000)}`;
          } catch (e) {
            if (e instanceof Error && e.name === "AbortError") {
              return `[Webhook Error] Request timed out after 10 seconds`;
            }
            return `[Webhook Error] ${e instanceof Error ? e.message : String(e)}`;
          }
        },
      });
    }
    if (ct.type === "prompt") {
      const promptTemplate = (ct.config as { template?: string }).template ?? "";
      return new DynamicTool({
        name: toolName,
        description: ct.description,
        func: async (input: string) => {
          const result = await callLLM(promptTemplate, input);
          return `[${ct.name} Result]\n${result}`;
        },
      });
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// call_agent — invoke another Stroodly agent as a sub-task. Built here (not
// in builtin-tools.ts) because it needs createAndExecuteRun, which would
// create a circular import the other way around.
// Safety:
//   - Hard depth ceiling (MAX_AGENT_CALL_DEPTH).
//   - Cycle detection via the chain of agent ids in AsyncLocalStorage.
//   - Looks up by numeric id or case-insensitive name.
// The sub-agent runs as a fully-persisted top-level run (its own row in
// agent_runs), so users can drill into its trace from the Bake Log.
// ---------------------------------------------------------------------------
const CallAgentSchema = z.object({
  agent: z
    .union([z.string(), z.number()])
    .describe("Name (case-insensitive) or numeric id of the Stroodly agent to invoke."),
  input: z.string().min(1).describe("The task to give the sub-agent."),
});

function makeCallAgentTool(): Tool {
  return new DynamicStructuredTool({
    name: "call_agent",
    description:
      "Invoke another Stroodly agent as a sub-task. Provide the target agent's name (or numeric id) and the task to give it. Returns the sub-agent's final answer.",
    schema: CallAgentSchema,
    func: async ({ agent: agentRef, input: subTask }) => {
      const ctx = agentContext.getStore();
      if (!ctx) {
        return "[Call Agent Error] No active agent context — call_agent can only run inside an agent execution.";
      }
      if (ctx.depth >= MAX_AGENT_CALL_DEPTH) {
        return `[Call Agent Error] Maximum sub-agent call depth (${MAX_AGENT_CALL_DEPTH}) reached. Refusing to recurse further.`;
      }

      // Resolve agent: numeric → by id; otherwise by case-insensitive name.
      let target: Agent | undefined;
      const refStr = String(agentRef).trim();
      if (/^\d+$/.test(refStr)) {
        const id = Number(refStr);
        [target] = await db.select().from(agentsTable).where(eq(agentsTable.id, id));
      } else {
        [target] = await db
          .select()
          .from(agentsTable)
          .where(sql`LOWER(${agentsTable.name}) = LOWER(${refStr})`);
      }
      if (!target) {
        return `[Call Agent Error] No agent found matching "${refStr}".`;
      }
      if (ctx.chain.includes(target.id)) {
        return `[Call Agent Error] Cycle detected — agent #${target.id} (${target.name}) is already in the call chain [${ctx.chain.join(" → ")}]. Refusing to recurse.`;
      }

      try {
        const { runId, output, status } = await createAndExecuteRun({
          agent: target,
          task: subTask,
        });
        const header = `[Sub-agent ${target.name} (run #${runId}, ${status})]`;
        return `${header}\n${output}`;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return `[Call Agent Error] Sub-agent ${target.name} failed: ${msg}`;
      }
    },
  }) as unknown as Tool;
}

function historyToMessages(history?: { role: "user" | "assistant"; content: string }[]): BaseMessage[] {
  if (!history || history.length === 0) return [];
  return history.map((m) =>
    m.role === "user" ? new HumanMessage(m.content) : new AIMessage(m.content),
  );
}

function extractText(content: unknown): string {
  if (content === null || content === undefined) return "";
  if (typeof content === "string") return content;
  if (typeof content === "number" || typeof content === "boolean") {
    return String(content);
  }
  if (Array.isArray(content)) {
    const joined = content
      .map((c) => {
        if (typeof c === "string") return c;
        if (c && typeof c === "object" && "text" in c && typeof (c as { text: unknown }).text === "string") {
          return (c as { text: string }).text;
        }
        return "";
      })
      .join("");
    if (joined) return joined;
    // Array of structured objects with no text fields — fall through to JSON.
  }
  if (typeof content === "object") {
    try {
      return JSON.stringify(content);
    } catch {
      return String(content);
    }
  }
  return String(content);
}

export type ExecuteAgentRunOptions = {
  agent: Agent;
  task: string;
  runId: number;
  emit: EmitFn;
  history?: { role: "user" | "assistant"; content: string }[];
};

// Public entry point. Establishes (or extends) the AsyncLocalStorage agent
// context so that any `call_agent` tool invocations performed inside this
// run can see the parent chain for cycle detection and depth limiting.
export async function executeAgentRun(
  opts: ExecuteAgentRunOptions,
): Promise<{ output: string; status: "completed" | "failed" }> {
  const parent = agentContext.getStore();
  const nextCtx: AgentContext = {
    chain: [...(parent?.chain ?? []), opts.agent.id],
    depth: (parent?.depth ?? 0) + 1,
  };
  return agentContext.run(nextCtx, () => executeAgentRunImpl(opts));
}

async function executeAgentRunImpl({
  agent,
  task,
  runId,
  emit,
  history,
}: ExecuteAgentRunOptions): Promise<{ output: string; status: "completed" | "failed" }> {
  let stepIndex = 0;

  const emitStep = async (type: string, content: string, toolName?: string) => {
    await db.insert(runStepsTable).values({
      runId,
      stepIndex,
      type,
      content,
      toolName: toolName ?? null,
    });
    await db.update(agentRunsTable)
      .set({ stepCount: sql`${agentRunsTable.stepCount} + 1` })
      .where(eq(agentRunsTable.id, runId));
    const ev: RunStepEvent = {
      stepIndex,
      type,
      content,
      toolName,
      runId,
      createdAt: new Date().toISOString(),
    };
    stepIndex++;
    await emit(ev);
  };

  // Resolve tool list (preserves order from agent.tools)
  const toolNames = agent.tools as string[];
  const tools: Tool[] = [];
  const orderedToolNames: string[] = [];
  for (const name of toolNames) {
    const t = await buildToolForAgentToolName(name);
    if (t) {
      tools.push(t);
      orderedToolNames.push(name);
    }
  }

  // ---------------------------------------------------------------------------
  // Pipeline mode: a real LangGraph StateGraph with one node per configured
  // tool and edges hard-wired in order. No LLM in the loop — this is the
  // deterministic chain users opt into when picking pipeline mode.
  // ---------------------------------------------------------------------------
  if (agent.mode === "pipeline") {
    if (toolNames.length === 0) {
      const msg = "Pipeline agent has no tools configured. Add at least one tool to the chain.";
      await emitStep("final_answer", msg);
      return { output: msg, status: "failed" };
    }
    const resolvedNames = new Set(orderedToolNames);
    const missing = toolNames.filter((n) => !resolvedNames.has(n));
    if (missing.length > 0) {
      const msg = `Pipeline aborted: unknown tool(s) ${missing.join(", ")}. Update the agent's tool chain.`;
      await emitStep("final_answer", msg);
      return { output: msg, status: "failed" };
    }

    // State carries the running value through the chain. `output` starts as the
    // user's task and is overwritten by each tool node with that tool's output.
    const PipelineState = Annotation.Root({
      output: Annotation<string>(),
    });

    // Node names must be unique even if the same tool is chained twice.
    const nodeNameFor = (i: number, name: string) => `step_${i}__${name}`;

    // Builder is typed `any` because addNode/addEdge narrow node-name string
    // literals as nodes are added — that pattern fights dynamic chain building.
    // The graph is still structurally validated at compile() time.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = new StateGraph(PipelineState);

    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];
      const name = orderedToolNames[i];
      const node = nodeNameFor(i, name);
      chain.addNode(node, async (state: { output: string }) => {
        const inputForTool = state.output;
        const truncated = inputForTool.length > 500
          ? inputForTool.substring(0, 500) + "..."
          : inputForTool;
        await emitStep(
          "tool_call",
          `Step ${i + 1}/${tools.length} — ${name}\nInput: ${truncated}`,
          name,
        );
        try {
          const out = await tool.invoke(inputForTool);
          const text = typeof out === "string" ? out : extractText(out);
          await emitStep("tool_result", text, name);
          return { output: text };
        } catch (toolErr) {
          const errMsg = toolErr instanceof Error ? toolErr.message : String(toolErr);
          const failureMsg = `[Pipeline Error] Tool "${name}" failed at step ${i + 1}/${tools.length}: ${errMsg}`;
          await emitStep("tool_result", failureMsg, name);
          // Throwing aborts the graph; we handle it below as a failed run.
          throw new Error(failureMsg);
        }
      });
    }

    // Wire START → first node → ... → last node → END
    chain.addEdge(START, nodeNameFor(0, orderedToolNames[0]));
    for (let i = 0; i < tools.length - 1; i++) {
      chain.addEdge(
        nodeNameFor(i, orderedToolNames[i]),
        nodeNameFor(i + 1, orderedToolNames[i + 1]),
      );
    }
    chain.addEdge(
      nodeNameFor(tools.length - 1, orderedToolNames[tools.length - 1]),
      END,
    );

    const pipelineGraph = chain.compile();

    await emitStep(
      "thought",
      `Running pipeline with ${tools.length} tool(s) in order: ${orderedToolNames.join(" → ")}`,
    );

    try {
      const result = (await pipelineGraph.invoke(
        { output: task },
        // Generous ceiling: each tool node = 1 super-step. +5 buffer for safety.
        { recursionLimit: tools.length + 5 },
      )) as { output: string };
      const finalOutput = result.output ?? "";
      await emitStep("final_answer", finalOutput);
      return { output: finalOutput, status: "completed" };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      // Errors thrown inside a tool node already emitted their own tool_result
      // failure step — just emit the final_answer with the same message.
      await emitStep("final_answer", errMsg);
      return { output: errMsg, status: "failed" };
    }
  }

  // ---------------------------------------------------------------------------
  // ReAct mode: LangGraph's prebuilt tool-calling agent (native function calls)
  // ---------------------------------------------------------------------------
  const llm = new ChatOpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    configuration: { baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL },
    model: agent.model || "gpt-5.4",
    maxCompletionTokens: 2048,
  });

  const conversationHint = history && history.length > 0
    ? `\n\nThis is an ongoing conversation. The earlier user/assistant turns are prior exchanges in the same session — treat them as established context. The new user message is the current request; refer back to earlier turns when the user asks follow-up questions.`
    : "";

  const orderHint = orderedToolNames.length > 1
    ? `\n\nThe tools available to you are presented in the order the user recommends using them. Prefer this sequence when it makes sense, but skip or repeat tools as needed to complete the task.`
    : "";

  const systemPromptText = `${agent.systemPrompt}\n\nYou have access to a set of tools. Call them whenever they would help you produce a more accurate, current, or thorough answer instead of relying solely on memory. Only answer directly when no available tool is appropriate.${orderHint}${conversationHint}`;

  // Callback handler to persist intermediate steps as they happen.
  // - Text from an LLM turn that ALSO calls a tool is recorded as a "thought"
  //   (it's the model reasoning before the tool call).
  // - LLM turns with no tool call are the final answer — skipped here and
  //   emitted once after the agent finishes (avoids duplicate steps).
  // - Tool starts/ends become "tool_call" / "tool_result".
  let lastFinalText = "";
  const stepHandler = new (class extends BaseCallbackHandler {
    name = "AgentStepRecorder";
    private toolNameByRunId = new Map<string, string>();

    async handleLLMEnd(output: LLMResult): Promise<void> {
      const gen = output.generations?.[0]?.[0] as
        | { text?: string; message?: AIMessage }
        | undefined;
      if (!gen) return;
      const text = (gen.text ?? "").trim();
      const msg = gen.message;
      const toolCalls = msg && "tool_calls" in msg
        ? (msg as AIMessage).tool_calls ?? []
        : [];
      if (text) lastFinalText = text;
      // Only persist as a "thought" if the model is reasoning before calling a tool.
      if (text && toolCalls.length > 0) {
        await emitStep("thought", text);
      }
    }

    async handleToolStart(
      tool: Serialized,
      input: string,
      runId: string,
      _parentRunId?: string,
      _tags?: string[],
      _metadata?: Record<string, unknown>,
      runName?: string,
    ): Promise<void> {
      // The tool's configured name lives in tool.kwargs.name (Serialized form);
      // runName from the callback is also the tool name. Prefer those over the
      // generic class name in tool.id.
      const fromKwargs = (tool as { kwargs?: { name?: string } }).kwargs?.name;
      const fromIdArr = (tool as { id?: string[] }).id;
      const fromIdLast = Array.isArray(fromIdArr) ? fromIdArr[fromIdArr.length - 1] : undefined;
      const name = runName || fromKwargs || fromIdLast || "tool";
      this.toolNameByRunId.set(runId, name);
      // The framework serializes structured tool input as JSON like {"input":"..."}.
      // Unwrap the common single-field object so the trace stays readable.
      // Defensive: although the type signature says `string`, different
      // LangChain versions occasionally hand us a structured object — never
      // produce "[object Object]" in the user-visible trace.
      let displayInput: string;
      if (typeof input === "string") {
        displayInput = input;
        try {
          const parsed = JSON.parse(input);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            const keys = Object.keys(parsed);
            if (keys.length === 1 && typeof parsed[keys[0]] === "string") {
              displayInput = parsed[keys[0]];
            }
          }
        } catch {
          // input wasn't JSON — use as-is
        }
      } else {
        displayInput = extractText(input);
      }
      await emitStep("tool_call", `Using ${name}: ${displayInput}`, name);
    }

    async handleToolEnd(output: unknown, runId: string): Promise<void> {
      const name = this.toolNameByRunId.get(runId) ?? "tool";
      this.toolNameByRunId.delete(runId);
      // In LangChain v1, the tool output may arrive as a ToolMessage instance,
      // a plain string, or a structured value. Normalize all of them to text.
      let text: string;
      if (typeof output === "string") {
        text = output;
      } else if (output && typeof output === "object") {
        const obj = output as { content?: unknown };
        text = "content" in obj ? extractText(obj.content) : extractText(output);
      } else {
        text = extractText(output);
      }
      await emitStep("tool_result", text, name);
    }

    async handleToolError(err: unknown, runId: string): Promise<void> {
      const name = this.toolNameByRunId.get(runId) ?? "tool";
      this.toolNameByRunId.delete(runId);
      const msg = err instanceof Error ? err.message : String(err);
      await emitStep("tool_result", `[Tool Error] ${msg}`, name);
    }
  })();

  try {
    const reactAgent = createReactAgent({
      llm,
      tools,
      prompt: systemPromptText,
    });

    const initialMessages: BaseMessage[] = [
      ...historyToMessages(history),
      new HumanMessage(task),
    ];

    const result = (await reactAgent.invoke(
      { messages: initialMessages },
      { recursionLimit: 25, callbacks: [stepHandler] },
    )) as { messages: BaseMessage[] };

    // Pull the final answer from the last AI message (most reliable source)
    const finalMsg = [...result.messages]
      .reverse()
      .find((m): m is AIMessage => m instanceof AIMessage);
    let finalAnswer = "";
    if (finalMsg) {
      finalAnswer = extractText(finalMsg.content).trim();
    }
    if (!finalAnswer) finalAnswer = lastFinalText.trim();
    if (!finalAnswer) finalAnswer = "(no answer produced)";

    await emitStep("final_answer", finalAnswer);
    return { output: finalAnswer, status: "completed" };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const failureMsg = `[Agent Error] ${errMsg}`;
    await emitStep("final_answer", failureMsg);
    return { output: failureMsg, status: "failed" };
  }
}

export async function createAndExecuteRun({
  agent,
  task,
  emit,
  history,
}: {
  agent: Agent;
  task: string;
  emit?: EmitFn;
  history?: { role: "user" | "assistant"; content: string }[];
}): Promise<{ runId: number; output: string; status: "completed" | "failed" }> {
  const [run] = await db.insert(agentRunsTable).values({
    agentId: agent.id,
    task,
    status: "running",
    stepCount: 0,
  }).returning();

  const noopEmit: EmitFn = () => {};
  try {
    const { output, status } = await executeAgentRun({
      agent,
      task,
      runId: run.id,
      emit: emit ?? noopEmit,
      history,
    });
    await db.update(agentRunsTable).set({
      status,
      output,
      completedAt: new Date(),
    }).where(eq(agentRunsTable.id, run.id));
    if (status === "completed") {
      await db.update(agentsTable).set({
        runCount: sql`${agentsTable.runCount} + 1`,
      }).where(eq(agentsTable.id, agent.id));
    }
    return { runId: run.id, output, status };
  } catch (err) {
    await db.update(agentRunsTable).set({
      status: "failed",
      completedAt: new Date(),
    }).where(eq(agentRunsTable.id, run.id));
    throw err;
  }
}

// Re-export for any place that wants to ping the LLM directly outside the agent loop.
export { callLLM } from "../builtin-tools";

// SystemMessage / ToolMessage are not used here but are re-exported for any future
// integration code (e.g. streaming) that wants the canonical LangChain message types.
export { SystemMessage, ToolMessage };
