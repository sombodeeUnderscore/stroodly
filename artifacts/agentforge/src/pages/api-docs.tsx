import React, { useMemo, useState } from "react";
import { Shell } from "@/components/layout/shell";
import { useListAgents } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Code2, Copy, Check, Zap, MessageSquare, Send, Terminal } from "lucide-react";
import { AgentChat, exampleInputForAgent } from "@/components/agent-chat";

type Agent = {
  id: number;
  slug: string;
  name: string;
  description: string;
  mode: string;
  tools: string[];
  model: string;
};

function getApiBase() {
  if (typeof window === "undefined") return "";
  const { protocol, host } = window.location;
  return `${protocol}//${host}/api`;
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="gap-1.5 h-7 px-2 text-xs"
    >
      {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

function CodeBlock({ children, language = "bash" }: { children: string; language?: string }) {
  return (
    <div className="relative group">
      <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <CopyButton text={children} />
      </div>
      <pre className="bg-muted/40 border border-border rounded-lg p-4 overflow-x-auto text-xs font-mono leading-relaxed">
        <code>{children}</code>
      </pre>
      <div className="absolute left-3 top-3 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-mono">
        {language}
      </div>
    </div>
  );
}

export default function ApiDocs() {
  const { data: agents, isLoading } = useListAgents();
  const apiBase = getApiBase();

  return (
    <Shell>
      <div className="mb-10">
        <h1 className="font-serif text-4xl font-extrabold tracking-tight mb-2 flex items-center gap-3">
          <Code2 className="w-9 h-9 text-primary" /> Agents as API
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Every agent in Stroodly is automatically exposed as an HTTPS endpoint. Call it from any
          language, any service. Same engine that powers the in-app runs — just synchronous JSON in,
          JSON out.
        </p>
      </div>

      <Section title="Endpoint" icon={Send}>
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center gap-3">
            <Badge className="font-mono">POST</Badge>
            <code className="font-mono text-sm break-all flex-1">
              {apiBase}/v1/agents/<span className="text-primary">{"{slug}"}</span>/invoke
            </code>
            <CopyButton text={`${apiBase}/v1/agents/{slug}/invoke`} />
          </div>
          <p className="text-sm text-muted-foreground">
            Replace <code className="text-primary">{"{slug}"}</code> with the agent's slug (e.g. <code className="text-primary">research-scout</code>) — or use its numeric ID. Slugs are auto-generated from the agent name.
          </p>
        </div>
      </Section>

      <Section title="Request body" icon={Terminal}>
        <CodeBlock language="json">{`{
  "input": "Your task or prompt for the agent",
  "includeSteps": false,
  "history": [
    { "role": "user",      "content": "earlier user message" },
    { "role": "assistant", "content": "earlier agent reply" }
  ]
}`}</CodeBlock>
        <FieldsTable
          rows={[
            { name: "input", type: "string", required: true, body: "The task you want the agent to perform. Becomes the user message in ReAct mode, or the initial input in pipeline mode." },
            { name: "includeSteps", type: "boolean", required: false, body: "When true, the response includes the full step-by-step trace (thoughts, tool calls, results). Defaults to false." },
            { name: "history", type: "array", required: false, body: "Optional prior conversation turns for follow-up questions. Each entry must be { role: \"user\" | \"assistant\", content: string }. The agent treats them as established context before processing 'input'." },
          ]}
        />
      </Section>

      <Section title="Response" icon={Zap}>
        <CodeBlock language="json">{`{
  "runId": 42,
  "agentId": 3,
  "agentName": "Data Pipeline",
  "status": "completed",
  "output": "...the agent's final answer...",
  "steps": [
    { "stepIndex": 0, "type": "thought",      "content": "...", "toolName": null },
    { "stepIndex": 1, "type": "tool_call",    "content": "...", "toolName": "web_search" },
    { "stepIndex": 2, "type": "tool_result",  "content": "...", "toolName": "web_search" },
    { "stepIndex": 3, "type": "final_answer", "content": "...", "toolName": null }
  ]
}`}</CodeBlock>
        <FieldsTable
          rows={[
            { name: "runId", type: "number", required: true, body: "Persistent run ID. The same run is visible in Run History inside the app." },
            { name: "status", type: "string", required: true, body: "\"completed\" or \"failed\". HTTP 200 for completed, 502 for failed." },
            { name: "output", type: "string", required: true, body: "The agent's final answer." },
            { name: "steps", type: "array", required: false, body: "Only included when includeSteps=true." },
          ]}
        />
      </Section>

      <Section title="Live agents" icon={Code2}>
        <p className="text-sm text-muted-foreground mb-4">
          Pick one and grab a ready-to-paste curl command.
        </p>
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
        ) : !agents || agents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
            No agents yet. Create one and it will appear here automatically.
          </div>
        ) : (
          <div className="space-y-4">
            {(agents as Agent[]).map((a) => (
              <AgentEndpointCard key={a.id} agent={a} apiBase={apiBase} />
            ))}
          </div>
        )}
      </Section>

      <Section title="Notes" icon={Terminal}>
        <ul className="space-y-3 text-sm text-muted-foreground">
          <Bullet>
            <strong className="text-foreground">Sync only.</strong> The endpoint waits for the run to finish before responding. For long agents (multi-step ReAct, slow tools), the call can take 30+ seconds. Set generous client timeouts.
          </Bullet>
          <Bullet>
            <strong className="text-foreground">Persisted.</strong> Every API call creates a real run that shows up in Run History — same as in-app runs. Great for debugging.
          </Bullet>
          <Bullet>
            <strong className="text-foreground">No auth (yet).</strong> The endpoint is currently open on your dev domain. Add an API-key middleware before exposing it on production.
          </Bullet>
          <Bullet>
            <strong className="text-foreground">Streaming.</strong> If you need step-by-step events instead of waiting for the final result, use the existing Server-Sent Events endpoint at <code className="text-primary">POST /api/agents/{"{id}"}/run</code>.
          </Bullet>
        </ul>
      </Section>
    </Shell>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="font-serif text-2xl font-bold tracking-tight mb-4 flex items-center gap-2">
        <Icon className="w-5 h-5 text-primary" /> {title}
      </h2>
      {children}
    </section>
  );
}

function FieldsTable({ rows }: { rows: { name: string; type: string; required: boolean; body: string }[] }) {
  return (
    <div className="mt-4 rounded-xl border border-border bg-card/40 divide-y divide-border">
      {rows.map((r) => (
        <div key={r.name} className="px-5 py-3 grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-2 sm:gap-4 items-start">
          <div className="flex items-center gap-2">
            <code className="font-mono text-sm text-primary">{r.name}</code>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.type}</span>
            {r.required && <Badge variant="outline" className="text-[9px] px-1 py-0">required</Badge>}
          </div>
          <div className="text-sm text-muted-foreground leading-relaxed">{r.body}</div>
        </div>
      ))}
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

function AgentEndpointCard({ agent, apiBase }: { agent: Agent; apiBase: string }) {
  const [view, setView] = useState<"chat" | "code">("chat");
  const [tab, setTab] = useState<"curl" | "fetch" | "node">("curl");
  const url = `${apiBase}/v1/agents/${agent.slug}/invoke`;
  const sampleInput = useMemo(() => exampleInputForAgent(agent), [agent]);

  const snippets = {
    curl: `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ input: sampleInput }).replace(/'/g, "'\\''")}'`,
    fetch: `const res = await fetch("${url}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    input: ${JSON.stringify(sampleInput)},
    includeSteps: true,
    // Send prior turns to enable follow-ups:
    // history: [{ role: "user", content: "..." }, { role: "assistant", content: "..." }],
  }),
});
const data = await res.json();
console.log(data.output);`,
    node: `import fetch from "node-fetch";

const res = await fetch("${url}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ input: ${JSON.stringify(sampleInput)} }),
});
const { output } = await res.json();
console.log(output);`,
  };

  return (
    <Card className="p-5 bg-card/60">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-lg flex items-center gap-2 flex-wrap">
            {agent.name}
            <Badge variant="outline" className="text-[10px] font-mono uppercase">{agent.mode}</Badge>
            <code className="text-[10px] font-mono text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">{agent.slug}</code>
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">{agent.description || "—"}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {agent.tools.map((t) => (
              <Badge key={t} variant="secondary" className="font-mono text-[9px] px-1.5 bg-muted/50">{t}</Badge>
            ))}
          </div>
        </div>
        <div className="flex rounded-md border border-border overflow-hidden text-xs">
          <button
            onClick={() => setView("chat")}
            className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${view === "chat" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Chat
          </button>
          <button
            onClick={() => setView("code")}
            className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors border-l border-border ${view === "code" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Code2 className="w-3.5 h-3.5" /> Code
          </button>
        </div>
      </div>

      {view === "code" ? (
        <>
          <div className="flex items-center gap-1 mb-2 border-b border-border">
            {(["curl", "fetch", "node"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`px-3 py-1.5 text-xs font-mono border-b-2 transition-colors ${tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {k}
              </button>
            ))}
          </div>
          <CodeBlock language={tab}>{snippets[tab]}</CodeBlock>
        </>
      ) : (
        <AgentChat agent={agent} apiBase={apiBase} compact />
      )}
    </Card>
  );
}

