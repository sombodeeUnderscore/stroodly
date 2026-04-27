import React, { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import markup from "react-syntax-highlighter/dist/esm/languages/prism/markup";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("sh", bash);
SyntaxHighlighter.registerLanguage("shell", bash);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("js", javascript);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("ts", typescript);
SyntaxHighlighter.registerLanguage("jsx", jsx);
SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("py", python);
SyntaxHighlighter.registerLanguage("sql", sql);
SyntaxHighlighter.registerLanguage("yaml", yaml);
SyntaxHighlighter.registerLanguage("yml", yaml);
SyntaxHighlighter.registerLanguage("markdown", markdown);
SyntaxHighlighter.registerLanguage("md", markdown);
SyntaxHighlighter.registerLanguage("html", markup);
SyntaxHighlighter.registerLanguage("xml", markup);
SyntaxHighlighter.registerLanguage("css", css);

function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const lang = (language || "").toLowerCase() || "text";
  const displayLang = lang === "text" || lang === "plaintext" ? "" : lang;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="group relative my-3 rounded-lg overflow-hidden border border-border/60 bg-[#1e1e1e]">
      {(displayLang || true) && (
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/40 bg-black/30">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/80">
            {displayLang || "code"}
          </span>
          <button
            onClick={copy}
            className="text-[10px] flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Copy code"
            type="button"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-green-400" /> Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" /> Copy
              </>
            )}
          </button>
        </div>
      )}
      <SyntaxHighlighter
        language={lang}
        style={oneDark}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: "0.85rem 1rem",
          background: "transparent",
          fontSize: "0.78rem",
          lineHeight: 1.55,
        }}
        codeTagProps={{ style: { fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)" } }}
      >
        {value.replace(/\n$/, "")}
      </SyntaxHighlighter>
    </div>
  );
}

const components: Components = {
  code({ className, children, node, ...props }) {
    const text = String(children ?? "");
    // react-markdown gives us this `code` element for both inline AND block
    // code. Block code is wrapped in a <pre>, and v9+ no longer passes the
    // `inline` flag — we have to detect it ourselves.
    const isBlock = node?.tagName === "code" && node?.position?.start?.line !== node?.position?.end?.line
      ? true
      : /\n/.test(text) || /language-/.test(className || "");
    if (!isBlock) {
      return (
        <code
          className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono text-[0.85em] break-words"
          {...props}
        >
          {children}
        </code>
      );
    }
    const match = /language-(\w+)/.exec(className || "");
    const language = match ? match[1] : "";
    return <CodeBlock language={language} value={text} />;
  },
  pre({ children }) {
    // We render code blocks inside our own wrapper, so let `pre` be transparent.
    return <>{children}</>;
  },
  p({ children }) {
    return <p className="leading-relaxed [&:not(:first-child)]:mt-3">{children}</p>;
  },
  a({ href, children }) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:text-primary/80 break-words"
      >
        {children}
      </a>
    );
  },
  strong({ children }) {
    return <strong className="font-semibold text-foreground">{children}</strong>;
  },
  em({ children }) {
    return <em className="italic">{children}</em>;
  },
  ul({ children }) {
    return <ul className="list-disc pl-5 my-2 space-y-1 marker:text-primary/60">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="list-decimal pl-5 my-2 space-y-1 marker:text-muted-foreground">{children}</ol>;
  },
  li({ children }) {
    return <li className="leading-relaxed">{children}</li>;
  },
  h1({ children }) {
    return <h1 className="text-lg font-bold mt-3 mb-2 text-foreground">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="text-base font-bold mt-3 mb-1.5 text-foreground">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="text-sm font-semibold mt-2 mb-1 text-foreground">{children}</h3>;
  },
  h4({ children }) {
    return <h4 className="text-sm font-semibold mt-2 mb-1 text-foreground">{children}</h4>;
  },
  blockquote({ children }) {
    return (
      <blockquote className="border-l-2 border-primary/40 pl-3 my-2 text-muted-foreground italic">
        {children}
      </blockquote>
    );
  },
  hr() {
    return <hr className="my-4 border-border/60" />;
  },
  table({ children }) {
    return (
      <div className="my-3 overflow-x-auto rounded-md border border-border/60">
        <table className="w-full text-xs border-collapse">{children}</table>
      </div>
    );
  },
  thead({ children }) {
    return <thead className="bg-muted/30">{children}</thead>;
  },
  th({ children }) {
    return <th className="text-left font-semibold px-3 py-1.5 border-b border-border/60">{children}</th>;
  },
  td({ children }) {
    return <td className="px-3 py-1.5 border-b border-border/40 align-top">{children}</td>;
  },
};

/**
 * Pre-process content so that raw JSON / object dumps get nicely rendered as a
 * code block even when the model didn't fence them. This means tool results
 * like `{"foo":"bar"}` become syntax-highlighted instead of a wall of text.
 */
function autoFenceRawJson(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return content;
  if (/```/.test(trimmed)) return content;
  const looksLikeJson =
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"));
  if (!looksLikeJson) return content;
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === "object") {
      return "```json\n" + JSON.stringify(parsed, null, 2) + "\n```";
    }
  } catch {
    /* not JSON — fall through */
  }
  return content;
}

export function Markdown({
  children,
  className,
  autoFenceJson = false,
}: {
  children: string;
  className?: string;
  autoFenceJson?: boolean;
}) {
  const source = autoFenceJson ? autoFenceRawJson(children) : children;
  return (
    <div className={cn("text-sm text-foreground/95 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </ReactMarkdown>
    </div>
  );
}
