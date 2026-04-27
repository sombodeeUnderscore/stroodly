import React, { useMemo, useState, useRef, useEffect } from "react";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Send,
  Loader2,
  Sparkles,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  User as UserIcon,
  Bot,
  Wrench,
  Terminal,
} from "lucide-react";

export type AgentChatAgent = {
  id?: number;
  slug: string;
  name: string;
  description?: string | null;
  mode?: string;
  tools?: string[];
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  steps?: { stepIndex: number; type: string; content: string; toolName: string | null }[];
  runId?: number;
  status?: "completed" | "failed";
};

export type AgentChatProps = {
  agent: AgentChatAgent;
  apiBase: string;
  /** Called after each successful (non-failed) assistant response. Useful for invalidating run history. */
  onRunComplete?: (runId: number | undefined) => void;
  /** Compact mode: tighter spacing, smaller max height. Defaults to false. */
  compact?: boolean;
  /** Optional fixed pixel height for the messages area; otherwise uses min/max heights. */
  messagesHeight?: string;
  /** Optional className for the outer wrapper. */
  className?: string;
};

export function AgentChat({
  agent,
  apiBase,
  onRunComplete,
  compact = false,
  messagesHeight,
  className = "",
}: AgentChatProps) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();
  const url = `${apiBase}/v1/agents/${agent.slug}/invoke`;
  const sampleInput = useMemo(() => exampleInputForAgent(agent), [agent]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);

  // Track whether the user is near the bottom; if so, follow new content.
  // Otherwise leave the scroll position alone so they can read history.
  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom < 80;
  }

  // Container-scoped auto-scroll (does NOT scroll the outer page).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length, testing]);

  async function send(content: string) {
    const trimmed = content.trim();
    if (!trimmed || testing) return;
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const userMsg: ChatMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setDraft("");
    setTesting(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: trimmed, includeSteps: true, history }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data?.error || data?.message || `HTTP ${res.status}`;
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `⚠️ ${errMsg}`, status: "failed" },
        ]);
        toast({ title: "Agent error", description: errMsg, variant: "destructive" });
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.output ?? "",
            steps: data.steps,
            runId: data.runId,
            status: data.status,
          },
        ]);
        if (data.status !== "failed") {
          onRunComplete?.(data.runId);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ ${msg}`, status: "failed" },
      ]);
      toast({ title: "Request failed", description: msg, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  }

  function reset() {
    setMessages([]);
    setDraft("");
  }

  const userTurns = messages.filter((m) => m.role === "user").length;

  // Pin the OUTER container to a fixed height so adding messages never resizes
  // the chat box (which would push the surrounding page layout around and let
  // browser scroll-anchoring yank the user's viewport).
  const outerHeightStyle = messagesHeight
    ? { height: messagesHeight }
    : compact
    ? { height: "520px" }
    : { height: "640px" };

  return (
    <div
      style={outerHeightStyle}
      className={`rounded-xl border border-border bg-background/40 overflow-hidden flex flex-col ${className}`}
    >
      <div className="px-4 py-2 border-b border-border bg-muted/20 flex items-center justify-between shrink-0">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-primary" />
          Conversation{" "}
          {userTurns > 0 && (
            <span className="text-muted-foreground/60 normal-case tracking-normal">
              · {userTurns} turn{userTurns === 1 ? "" : "s"}
            </span>
          )}
        </div>
        {messages.length > 0 && (
          <button
            onClick={reset}
            disabled={testing}
            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="px-4 py-4 space-y-4 overflow-y-auto flex-1 min-h-0"
        style={{ overflowAnchor: "none" }}
      >
        {messages.length === 0 ? (
          <EmptyChat agent={agent} sampleInput={sampleInput} onPick={(t) => send(t)} />
        ) : (
          messages.map((m, i) => <ChatBubble key={i} message={m} agent={agent} />)
        )}
        {testing && (
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0 ring-1 ring-primary/30">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Thinking…
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="border-t border-border p-3 flex items-end gap-2 bg-background/60 shrink-0"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(draft);
            }
          }}
          placeholder={
            messages.length === 0 ? `Ask ${agent.name} something…` : "Follow up…"
          }
          rows={1}
          disabled={testing}
          className="flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none px-2 py-1.5 leading-relaxed max-h-32 min-h-[32px]"
        />
        <Button
          type="submit"
          disabled={testing || !draft.trim()}
          size="sm"
          className="gap-1.5 shrink-0"
        >
          {testing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          Send
        </Button>
      </form>
    </div>
  );
}

function EmptyChat({
  agent,
  sampleInput,
  onPick,
}: {
  agent: AgentChatAgent;
  sampleInput: string;
  onPick: (t: string) => void;
}) {
  const suggestions = useMemo(() => {
    const list = [sampleInput, ...alternateExamples(agent)].slice(0, 3);
    return Array.from(new Set(list));
  }, [agent, sampleInput]);
  return (
    <div className="text-center py-8">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
        <Bot className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold text-foreground">Chat with {agent.name}</h4>
      <p className="text-xs text-muted-foreground mt-1 mb-5 max-w-sm mx-auto leading-relaxed">
        Send a message to see how the agent reasons, picks tools, and replies. Follow-up turns share context.
      </p>
      <div className="space-y-2 max-w-md mx-auto text-left">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold pl-1">
          Try one of these
        </div>
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="group w-full text-xs text-foreground/90 bg-muted/30 hover:bg-muted/60 hover:border-primary/40 border border-border rounded-lg px-3 py-2.5 leading-snug transition-all flex items-start gap-2"
          >
            <Sparkles className="w-3 h-3 text-primary/70 mt-0.5 shrink-0 group-hover:text-primary transition-colors" />
            <span className="text-left">{s}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatBubble({ message, agent }: { message: ChatMessage; agent: AgentChatAgent }) {
  const [showSteps, setShowSteps] = useState(false);
  const isUser = message.role === "user";
  const failed = message.status === "failed";
  return (
    <div className={`flex gap-3 items-start ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ring-1 ${
          isUser
            ? "bg-muted text-foreground ring-border"
            : failed
            ? "bg-destructive/15 text-destructive ring-destructive/30"
            : "bg-primary/15 text-primary ring-primary/30"
        }`}
      >
        {isUser ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div
        className={`max-w-[88%] ${
          isUser ? "items-end" : "items-start"
        } flex flex-col gap-1.5 min-w-0`}
      >
        {!isUser && (
          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 px-1">
            {agent.name}
          </div>
        )}
        <div
          className={`rounded-2xl px-4 py-3 text-sm break-words shadow-sm border ${
            isUser
              ? "bg-primary/10 text-foreground border-primary/20 rounded-tr-sm"
              : failed
              ? "bg-destructive/10 text-destructive border-destructive/30 rounded-tl-sm"
              : "bg-card text-foreground border-border/70 rounded-tl-sm"
          }`}
        >
          {message.content ? (
            isUser ? (
              <div className="whitespace-pre-wrap leading-relaxed">{message.content}</div>
            ) : (
              <Markdown>{message.content}</Markdown>
            )
          ) : (
            <span className="italic text-muted-foreground text-xs">(empty response)</span>
          )}
        </div>
        {!isUser && message.steps && message.steps.length > 0 && (
          <button
            onClick={() => setShowSteps((s) => !s)}
            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 self-start px-1 transition-colors"
          >
            {showSteps ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showSteps ? "Hide" : "Show"} {message.steps.length} step
            {message.steps.length === 1 ? "" : "s"}
            {message.runId && (
              <span className="text-muted-foreground/50">· run #{message.runId}</span>
            )}
          </button>
        )}
        {!isUser && showSteps && message.steps && (
          <div className="border-l-2 border-primary/30 pl-3 space-y-2.5 mt-1 w-full">
            {message.steps.map((s) => (
              <StepRow key={s.stepIndex} step={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StepRow({
  step,
}: {
  step: { stepIndex: number; type: string; content: string; toolName: string | null };
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = stepMeta(step.type);
  const renderAsMarkdown =
    step.type === "tool_result" || step.type === "final_answer" || step.type === "thought";
  const TRUNCATE = 600;
  const isLong = step.content.length > TRUNCATE;
  const displayed =
    !expanded && isLong ? step.content.slice(0, TRUNCATE).trimEnd() + "…" : step.content;
  return (
    <div className="text-[11px]">
      <div
        className={`font-mono uppercase tracking-wider text-[9px] flex items-center gap-1.5 ${meta.color}`}
      >
        {meta.icon}
        {step.type.replace(/_/g, " ")}
        {step.toolName && (
          <span className="text-muted-foreground/70 normal-case tracking-normal">
            · {step.toolName}
          </span>
        )}
      </div>
      <div className="mt-1 pl-4">
        {renderAsMarkdown ? (
          <Markdown autoFenceJson className="text-[12px] text-muted-foreground">
            {displayed}
          </Markdown>
        ) : (
          <div className="text-muted-foreground whitespace-pre-wrap break-words leading-snug font-mono text-[11px]">
            {displayed}
          </div>
        )}
        {isLong && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="mt-1 text-[10px] text-primary/80 hover:text-primary font-mono uppercase tracking-wider"
          >
            {expanded ? "Show less" : `Show ${step.content.length - TRUNCATE} more chars`}
          </button>
        )}
      </div>
    </div>
  );
}

function stepMeta(type: string): { icon: React.ReactNode; color: string } {
  switch (type) {
    case "thought":
      return { icon: <Sparkles className="w-2.5 h-2.5" />, color: "text-amber-500" };
    case "tool_call":
      return { icon: <Wrench className="w-2.5 h-2.5" />, color: "text-blue-400" };
    case "tool_result":
      return { icon: <Terminal className="w-2.5 h-2.5" />, color: "text-emerald-400" };
    case "final_answer":
      return { icon: <Bot className="w-2.5 h-2.5" />, color: "text-primary" };
    default:
      return {
        icon: (
          <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/40 inline-block" />
        ),
        color: "text-muted-foreground",
      };
  }
}

function alternateExamples(agent: AgentChatAgent): string[] {
  const tag = `${agent.slug} ${agent.name}`.toLowerCase();
  const generic = [
    "What can you help me with?",
    "Walk me through how you'd approach a typical request.",
  ];
  if (/research|scout/.test(tag))
    return [
      "What's new in fusion energy this year?",
      "Compare REST vs GraphQL in 2 sentences.",
    ];
  if (/content|writer|crafter/.test(tag))
    return [
      "Draft a 2-line product hunt tagline for a coffee subscription.",
      "Rewrite this in a friendlier tone: 'Your account will be terminated.'",
    ];
  if (/data|extract|pipeline/.test(tag))
    return [
      "Extract dates from: 'Meeting on 2025-04-12, follow-up Apr 19, then quarterly review July 1.'",
      "Pull URLs and email addresses from: contact us at hi@foo.com or visit https://foo.com/help",
    ];
  return generic;
}

export function exampleInputForAgent(a: AgentChatAgent): string {
  const slug = (a.slug ?? "").toLowerCase();
  const name = (a.name ?? "").toLowerCase();
  const tag = `${slug} ${name}`;

  if (/research|scout|scholar/.test(tag))
    return "Give me a 3-bullet brief on the state of solid-state batteries in 2025.";
  if (/content|writer|crafter|copy/.test(tag))
    return "Draft a 120-word LinkedIn post announcing our new pricing page launch.";
  if (/data|extract|parser|pipeline/.test(tag))
    return "Pull all email addresses, phone numbers, and dollar amounts from this invoice text: Invoice #4421 — Acme Co (billing@acme.com, +1-415-555-0199) — Total due: $2,480.50 by Apr 30.";
  if (/analy|insight|report/.test(tag))
    return "Compare the revenue mix of Shopify vs Etsy and tell me which is more diversified.";
  if (/code|debug|review|engineer/.test(tag))
    return "Review this snippet and flag any bugs: function avg(xs){return xs.reduce((a,b)=>a+b)/xs.length}";
  if (/explain|teach|tutor/.test(tag))
    return "Explain how OAuth2 PKCE works to a junior developer in under 150 words.";
  if (/translat/.test(tag))
    return "Translate to French: 'Your order will arrive tomorrow morning between 8 and 10 a.m.'";
  if (/support|customer|service/.test(tag))
    return "A customer says their order #88231 hasn't arrived after 10 days. Draft a response.";
  if (/calc|math/.test(tag))
    return "What's the compound interest on $5,000 at 4.5% APR over 7 years, compounded monthly?";

  const tools = new Set(a.tools ?? []);
  if (tools.has("web_search"))
    return "Find three reputable sources on the 2025 EU AI Act enforcement timeline.";
  if (tools.has("calculate")) return "Compute 17% of 2,450 plus the square root of 144.";
  if (tools.has("write_content"))
    return "Write a one-sentence tagline for a friendly home-baking app.";
  if (tools.has("extract_data"))
    return "Extract every date and dollar amount from: 'Paid $129.00 on 2024-03-15, refunded $40 on 2024-04-02.'";
  if (tools.has("summarize"))
    return "Summarize in two sentences: Photosynthesis converts sunlight, water, and CO2 into glucose and oxygen using chlorophyll inside chloroplasts. It is the foundation of nearly every food chain on Earth.";

  if (a.description?.trim())
    return `Show me what you can do with this: ${a.description.trim()}`;
  return `Demonstrate how the "${a.name}" agent works on a realistic example.`;
}
