import React, { useEffect } from "react";
import { Link, useParams } from "wouter";
import { useGetStrand, getGetStrandQueryKey } from "@workspace/api-client-react";
import { StroodlyLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BrainCircuit,
  Wrench,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  TerminalSquare,
  Link2,
  ExternalLink,
  Lock,
} from "lucide-react";
import type { RunStep } from "@workspace/api-client-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const StepCard = ({ step }: { step: RunStep }) => {
  const getIcon = () => {
    switch (step.type) {
      case "thought":
        return <BrainCircuit className="w-4 h-4 text-purple-400" />;
      case "tool_call":
        return <Wrench className="w-4 h-4 text-blue-400" />;
      case "tool_result":
        return <FileText className="w-4 h-4 text-green-400" />;
      case "final_answer":
        return <CheckCircle2 className="w-5 h-5 text-primary" />;
      default:
        return <TerminalSquare className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getBorderColor = () => {
    switch (step.type) {
      case "thought":
        return "border-purple-500/20 bg-purple-500/5";
      case "tool_call":
        return "border-blue-500/20 bg-blue-500/5";
      case "tool_result":
        return "border-green-500/20 bg-green-500/5";
      case "final_answer":
        return "border-primary/50 bg-primary/10";
      default:
        return "border-border bg-card";
    }
  };

  return (
    <div className={cn("p-4 rounded-xl border", getBorderColor())}>
      <div className="flex items-center gap-2 mb-2">
        {getIcon()}
        <span className="font-mono text-xs font-semibold uppercase tracking-wider opacity-80">
          {step.type.replace("_", " ")}
        </span>
        {step.toolName && (
          <Badge
            variant="outline"
            className="ml-2 font-mono text-[10px] h-5 bg-background/50"
          >
            {step.toolName}
          </Badge>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground font-mono">
          {format(new Date(step.createdAt), "HH:mm:ss.SSS")}
        </span>
      </div>
      <div className="mt-2 text-sm font-mono whitespace-pre-wrap leading-relaxed opacity-90">
        {step.content}
      </div>
    </div>
  );
};

export default function StrandView() {
  const params = useParams();
  const token = params.token || "";

  const { data: strand, isLoading, error } = useGetStrand(token, {
    query: { enabled: !!token, queryKey: getGetStrandQueryKey(token) },
  });

  // Force dark mode (matches the rest of the app and avoids FOUC for visitors
  // arriving without a session).
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Public branded header — replaces the authenticated Shell sidebar */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 group">
            <StroodlyLogo size={28} />
            <div className="leading-tight">
              <h1 className="font-serif font-extrabold text-lg tracking-tight group-hover:text-primary transition-colors">
                Stroodly
              </h1>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                Shared Strand
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="hidden sm:inline-flex font-mono text-[10px] uppercase gap-1"
            >
              <Lock className="w-3 h-3" /> Read-only
            </Badge>
            <Link href="/">
              <Button variant="outline" size="sm" className="gap-2">
                Open Stroodly
                <ExternalLink className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : error || !strand ? (
          <div className="text-center py-20" data-testid="strand-not-found">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10 mb-4">
              <XCircle className="w-7 h-7 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Strand not found</h2>
            <p className="text-muted-foreground mb-6">
              This Strand link has been revoked, or it never existed.
            </p>
            <Link href="/">
              <Button>Go to Stroodly</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Strand metadata card */}
            <div className="rounded-xl border border-border bg-card/50 p-6 mb-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                      <Link2 className="w-5 h-5 text-primary" />
                      {strand.agentName}
                    </h2>
                    <Badge
                      variant="outline"
                      className="font-mono text-[10px] uppercase"
                    >
                      {strand.agentMode}
                    </Badge>
                    <Badge
                      variant={
                        strand.status === "completed"
                          ? "default"
                          : strand.status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
                      className="font-mono text-[10px] uppercase"
                    >
                      {strand.status === "completed" && (
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                      )}
                      {strand.status === "failed" && (
                        <XCircle className="w-3 h-3 mr-1" />
                      )}
                      {strand.status === "running" && (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      )}
                      {strand.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    Bake #{strand.id} ·{" "}
                    {formatDistanceToNow(new Date(strand.createdAt), {
                      addSuffix: true,
                    })}
                    {strand.completedAt &&
                      ` · finished ${formatDistanceToNow(
                        new Date(strand.completedAt),
                        { addSuffix: true }
                      )}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-mono">
                    Steps
                  </p>
                  <p className="font-mono text-2xl font-bold text-primary">
                    {strand.stepCount}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">
                    Task Input
                  </h3>
                  <div
                    className="text-sm font-mono p-3 bg-muted/50 rounded-lg whitespace-pre-wrap"
                    data-testid="strand-task"
                  >
                    {strand.task}
                  </div>
                </div>
                {strand.output && (
                  <div>
                    <h3 className="font-semibold text-xs uppercase tracking-wider text-primary mb-2">
                      Final Output
                    </h3>
                    <div
                      className="text-sm p-3 bg-primary/10 border border-primary/20 rounded-lg whitespace-pre-wrap"
                      data-testid="strand-output"
                    >
                      {strand.output}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Steps timeline */}
            <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
              <div className="px-6 py-3 border-b border-border flex items-center gap-2">
                <TerminalSquare className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Execution Trace</h3>
                <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {strand.steps.length} step{strand.steps.length === 1 ? "" : "s"}
                </span>
              </div>
              <ScrollArea className="max-h-[70vh]">
                <div className="p-6 space-y-6">
                  {strand.steps.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-8">
                      No steps recorded.
                    </p>
                  ) : (
                    strand.steps.map((step: RunStep, idx: number) => (
                      <div key={idx} className="relative pl-6">
                        {idx !== strand.steps.length - 1 && (
                          <div className="absolute left-[11px] top-8 bottom-[-24px] w-px bg-border z-0" />
                        )}
                        <div className="absolute left-[7px] top-6 w-[9px] h-[9px] rounded-full bg-primary z-10 ring-4 ring-background" />
                        <StepCard step={step} />
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-8 font-mono">
              Powered by Stroodly · Build, run, and share AI agents.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
