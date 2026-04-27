import React, { useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { SiteHeader, SiteFooter } from "@/pages/home";
import {
  ArrowRight,
  Brain,
  GitBranch,
  Wrench,
  Sparkles,
  Activity,
  Database,
  Webhook,
  MessageSquareCode,
  CheckCircle2,
  Network,
  Shield,
  Clock,
  Globe,
} from "lucide-react";

export default function HowItWorks() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main>
        <PageHeader />
        <Anatomy />
        <Modes />
        <ToolTypes />
        <AgentComposition />
        <RunLifecycle />
        <TechStack />
        <FinalCTA />
      </main>

      <SiteFooter />
    </div>
  );
}

function PageHeader() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(500px 280px at 50% 0%, hsl(38 92% 58% / 0.18), transparent 60%)",
        }}
      />
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-14 md:pt-28 md:pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          How Stroodly works
        </div>
        <h1 className="font-serif text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.05]">
          A thin layer over the model,
          <br />
          with all the good parts.
        </h1>
        <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
          Stroodly turns a system prompt, a tool list, and an execution mode into a running agent —
          powered by <strong className="text-foreground">LangChain.js v1</strong> and{" "}
          <strong className="text-foreground">LangGraph</strong>, with native function calling, eight
          built-in tools, agent-to-agent composition, and every step persisted and streamed live.
          Here's exactly what happens under the hood.
        </p>
      </div>
    </section>
  );
}

function Anatomy() {
  const parts = [
    {
      title: "System prompt",
      body: "The agent's role and constraints. In ReAct mode this drives reasoning; in pipeline mode it's informational.",
    },
    {
      title: "Tool list",
      body: "Ordered selection of built-in tools, your custom tools, and even other Stroodly agents you can call as sub-tasks.",
    },
    {
      title: "Execution mode",
      body: "ReAct for reasoning loops, Pipeline for deterministic tool chains.",
    },
    {
      title: "Model",
      body: "Any OpenAI chat model — defaults to GPT-5.4, with GPT-4o, 4o-mini, and 4.1 also available — accessed through a managed proxy.",
    },
  ];
  return (
    <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
      <div className="max-w-2xl mb-12">
        <div className="text-xs uppercase tracking-wider text-primary font-semibold mb-3">Anatomy of an agent</div>
        <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">
          Four ingredients make up every agent.
        </h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {parts.map((p, i) => (
          <div key={p.title} className="p-6 rounded-2xl border border-border bg-card">
            <div className="font-serif text-3xl font-extrabold text-primary/70 mb-3 tabular-nums">
              {String(i + 1).padStart(2, "0")}
            </div>
            <h3 className="font-semibold mb-2">{p.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Modes() {
  return (
    <section className="border-y border-border/60 bg-muted/10">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <div className="max-w-2xl mb-12">
          <div className="text-xs uppercase tracking-wider text-primary font-semibold mb-3">Execution modes</div>
          <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">
            ReAct or Pipeline. Pick per agent.
          </h2>
          <p className="mt-5 text-muted-foreground">
            Every agent runs in one of two modes. Choose the one that matches your task, not the other way around.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <ModeCard
            icon={Brain}
            title="ReAct"
            subtitle="Reason → Act → Observe"
            body={
              <>
                <p className="mb-4">
                  Built on LangGraph's <code className="text-primary">createReactAgent</code> with native OpenAI function calling. The model decides which tool to call and with what arguments — no fragile text parsing — then we feed the result back as a tool message and loop until the model returns its final answer.
                </p>
                <ul className="space-y-2 text-sm">
                  <Li>Best for open-ended tasks requiring reasoning</Li>
                  <Li>Tool list is passed in your chosen order as a hint — the model picks what to call</Li>
                  <Li>
                    Multi-argument tools use LangChain's <code className="text-primary">DynamicStructuredTool</code> with Zod schemas, so the model passes typed arguments (not stringified JSON) for things like agent-to-agent calls
                  </Li>
                  <Li>
                    Per-run context propagates through every async hop via <code className="text-primary">AsyncLocalStorage</code>, powering features like sub-agent cycle detection
                  </Li>
                  <Li>Capped at 25 graph steps (≈ a dozen tool calls) to prevent runaway loops</Li>
                </ul>
              </>
            }
          />
          <ModeCard
            icon={GitBranch}
            title="Pipeline"
            subtitle="Deterministic tool chain"
            body={
              <>
                <p className="mb-4">
                  Built as a LangGraph <code className="text-primary">StateGraph</code> with one node per configured tool and edges hard-wired in order — no LLM in the loop. The output of tool N becomes the input of tool N+1, and the final answer is the last tool's output.
                </p>
                <ul className="space-y-2 text-sm">
                  <Li>Best for repeatable workflows (search → summarize → extract)</Li>
                  <Li>Zero variance: same input produces the same chain of events</Li>
                  <Li>Fails loudly: unknown tools or empty chain are rejected up front</Li>
                </ul>
              </>
            }
          />
        </div>
      </div>
    </section>
  );
}

function ModeCard({
  icon: Icon,
  title,
  subtitle,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  body: React.ReactNode;
}) {
  return (
    <div className="p-8 rounded-2xl border border-border bg-card">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-serif font-bold text-2xl leading-none">{title}</h3>
          <div className="text-sm text-muted-foreground mt-1">{subtitle}</div>
        </div>
      </div>
      <div className="text-muted-foreground leading-relaxed">{body}</div>
    </div>
  );
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
      <span>{children}</span>
    </li>
  );
}

function ToolTypes() {
  const types = [
    {
      icon: Sparkles,
      title: "Built-in tools",
      body: "Eight pre-configured tools, registered as LangChain DynamicTool / DynamicStructuredTool instances and exposed to every agent.",
    },
    {
      icon: Webhook,
      title: "Custom webhooks",
      body: "Point a tool at any URL. Stroodly POSTs { input } to it, waits up to 10 seconds, and feeds the response back as the tool's output.",
    },
    {
      icon: MessageSquareCode,
      title: "Custom prompts",
      body: "Save a reusable prompt template as a tool. The agent's input becomes the user message — the model does the rest.",
    },
    {
      icon: Network,
      title: "Other agents",
      body: "Treat any agent in your library as a tool. The call_agent tool lets one agent delegate a sub-task to another by name or id.",
    },
  ];
  const builtins = [
    { icon: Globe, name: "web_search", cat: "Research", body: "Brave Search API (when a key is set)." },
    { icon: Globe, name: "fetch_url", cat: "Research", body: "Open and read a public web page. SSRF-hardened." },
    { icon: Sparkles, name: "summarize", cat: "Text", body: "ChatOpenAI distills long input into bullets." },
    { icon: MessageSquareCode, name: "write_content", cat: "Text", body: "ChatOpenAI produces polished long-form output." },
    { icon: MessageSquareCode, name: "extract_data", cat: "Text", body: "ChatOpenAI in JSON mode for structured entities." },
    { icon: Sparkles, name: "calculate", cat: "Math", body: "mathjs evaluates real expressions; LLM fallback for word problems." },
    { icon: Clock, name: "current_datetime", cat: "Utility", body: "Real wall-clock time for any IANA timezone." },
    { icon: Network, name: "call_agent", cat: "Composition", body: "Invoke another Stroodly agent as a sub-task." },
  ];
  return (
    <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
      <div className="max-w-2xl mb-12">
        <div className="text-xs uppercase tracking-wider text-primary font-semibold mb-3">Tools</div>
        <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">
          Four kinds of tools, one interface.
        </h2>
        <p className="mt-5 text-muted-foreground">
          Every tool — built-in, custom, or another agent — is a LangChain <code className="text-primary">DynamicTool</code> (or{" "}
          <code className="text-primary">DynamicStructuredTool</code> when it takes multiple typed arguments). Agents don't
          know or care which kind they're calling.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 mb-14">
        {types.map(({ icon: Icon, title, body }) => (
          <div key={title} className="p-6 rounded-2xl border border-border bg-card">
            <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-4">
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
      <div>
        <div className="text-xs uppercase tracking-wider text-primary font-semibold mb-4">
          The eight built-ins
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {builtins.map(({ icon: Icon, name, cat, body }) => (
            <div key={name} className="p-4 rounded-xl border border-border bg-card/60">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-primary" />
                <code className="font-mono text-sm text-foreground">{name}</code>
              </div>
              <div className="text-[10px] uppercase tracking-wider text-primary/80 font-semibold mb-1.5">
                {cat}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AgentComposition() {
  return (
    <section className="border-y border-border/60 bg-muted/10">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] items-start">
          <div>
            <div className="text-xs uppercase tracking-wider text-primary font-semibold mb-3">
              Agent composition
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight mb-5">
              One agent can call another.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              Add the <code className="text-primary">call_agent</code> tool to any agent and it can hand
              off a sub-task to a teammate by name or id. Build a coordinator on top of your existing
              specialists instead of stuffing every capability into one giant prompt.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Each delegated call runs through the same <code className="text-primary">createAndExecuteRun</code>{" "}
              path as a top-level run, so it's persisted as its own row in the Bake Log with a full step
              trace you can drill into.
            </p>
          </div>
          <div className="space-y-4">
            <CompFeature
              icon={Network}
              title="Typed args, no parsing"
              body={
                <>
                  Wrapped as a <code className="text-primary">DynamicStructuredTool</code> with a Zod schema{" "}
                  <code className="text-primary">{"{ agent, input }"}</code>, so the model passes a real object
                  instead of a stringified blob the runtime would have to parse.
                </>
              }
            />
            <CompFeature
              icon={Shield}
              title="Cycle &amp; depth protection"
              body={
                <>
                  The chain of in-flight agent ids rides along on{" "}
                  <code className="text-primary">AsyncLocalStorage</code>. A → A is rejected, A → B → A is
                  rejected, and recursion is hard-capped at 3 levels deep — runaway sub-agent loops can't
                  take the server down.
                </>
              }
            />
            <CompFeature
              icon={Activity}
              title="Sub-runs are first-class"
              body={
                <>
                  The sub-agent gets its own <code className="text-primary">agent_runs</code> row, its own
                  step stream, and its own runId. The child runId is included in the parent's tool result,
                  so you can jump straight to the sub-run and see exactly what it did.
                </>
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function CompFeature({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 p-5 rounded-xl border border-border bg-card">
      <div className="w-10 h-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function RunLifecycle() {
  const events = [
    { type: "thought", label: "thought", body: "The model's reasoning (or a pipeline preamble)." },
    { type: "tool_call", label: "tool_call", body: "Name and input of the tool being invoked." },
    { type: "tool_result", label: "tool_result", body: "The raw output returned from the tool." },
    { type: "final_answer", label: "final_answer", body: "The agent's conclusion, persisted on the run." },
  ];
  return (
    <section className="border-y border-border/60 bg-muted/10">
      <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] items-start">
          <div>
            <div className="text-xs uppercase tracking-wider text-primary font-semibold mb-3">Run lifecycle</div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight mb-5">
              Every step, streamed live.
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              When you start a run, the backend opens a Server-Sent Events stream. Each step is
              persisted to Postgres and emitted to the browser in real time. Four event types make
              up a complete run:
            </p>
            <div className="inline-flex items-center gap-2 mt-4 text-sm text-primary">
              <Activity className="w-4 h-4" />
              Watch runs update as the model thinks
            </div>
          </div>
          <div className="space-y-3">
            {events.map((e, i) => (
              <div key={e.type} className="relative">
                <div className="flex items-start gap-4 p-5 rounded-xl border border-border bg-card">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-xs shrink-0 tabular-nums">
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <code className="font-mono text-sm text-primary">{e.label}</code>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{e.body}</p>
                  </div>
                </div>
                {i < events.length - 1 && (
                  <div className="ml-6 h-3 border-l-2 border-dashed border-primary/30" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TechStack() {
  const rows = [
    { label: "Frontend", value: "React 18 + Vite, Tailwind, shadcn/ui, Wouter, TanStack Query" },
    { label: "Backend", value: "Node 24, Express 5, TypeScript, Zod validation" },
    { label: "Database", value: "PostgreSQL with Drizzle ORM" },
    { label: "Agent runtime", value: "LangChain.js v1 (langchain, @langchain/core, @langchain/openai) + LangGraph (createReactAgent prebuilt for ReAct, hand-built StateGraph for Pipeline) with native function calling" },
    { label: "Tool primitives", value: "DynamicTool for single-string tools, DynamicStructuredTool + Zod schemas for multi-argument tools (e.g. call_agent's { agent, input })" },
    { label: "AI", value: "OpenAI chat models — GPT-5.4 (default), GPT-4o, 4o-mini, and 4.1 — accessed via a managed proxy and wired through ChatOpenAI" },
    { label: "Run context", value: "AsyncLocalStorage carries the in-flight agent call chain across every async hop, enabling sub-agent cycle detection and depth limiting without parameter threading" },
    { label: "Web search", value: "Brave Search API (optional, only runs when a key is set)" },
    { label: "URL fetch", value: "Native fetch with manual redirect-follow + per-hop SSRF revalidation (private IP, multi-record DNS, metadata host, redirect, body-size, and timeout protection)" },
    { label: "Math", value: "mathjs for real expression evaluation" },
    { label: "Streaming", value: "Server-Sent Events for live step traces" },
  ];
  return (
    <section className="max-w-4xl mx-auto px-6 py-20 md:py-28">
      <div className="max-w-2xl mb-10">
        <div className="text-xs uppercase tracking-wider text-primary font-semibold mb-3">Under the hood</div>
        <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">
          Built on boring, dependable tech.
        </h2>
      </div>
      <div className="rounded-2xl border border-border bg-card divide-y divide-border">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex flex-col sm:flex-row gap-2 sm:gap-6 px-6 py-4">
            <div className="sm:w-40 font-semibold text-foreground flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              {label}
            </div>
            <div className="text-sm text-muted-foreground flex-1 leading-relaxed">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20 md:py-28">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="font-serif text-3xl md:text-5xl font-extrabold tracking-tight">
          That's the whole recipe.
        </h2>
        <p className="mt-5 text-lg text-muted-foreground">
          Now go fold some tools together.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Link href="/agents/new">
            <Button size="lg" className="gap-2">
              Build an agent <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/templates">
            <Button size="lg" variant="outline">Start from a template</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
