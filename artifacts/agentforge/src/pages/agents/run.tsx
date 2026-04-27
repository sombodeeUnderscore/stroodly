import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { Shell } from "@/components/layout/shell";
import {
  useGetAgent,
  useGetRun,
  getGetRunQueryKey,
  useReplayRun,
  useCreateStrand,
  useRevokeStrand,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRunStream } from "@/hooks/use-run-stream";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Loader2,
  BrainCircuit,
  Wrench,
  FileText,
  CheckCircle2,
  XCircle,
  TerminalSquare,
  RotateCcw,
  Share2,
  Copy,
  Check,
  Link2,
  Trash2,
} from "lucide-react";
import type { RunStep } from "@workspace/api-client-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const StepCard = ({ step }: { step: RunStep }) => {
  const getIcon = () => {
    switch (step.type) {
      case 'thought': return <BrainCircuit className="w-4 h-4 text-purple-400" />;
      case 'tool_call': return <Wrench className="w-4 h-4 text-blue-400" />;
      case 'tool_result': return <FileText className="w-4 h-4 text-green-400" />;
      case 'final_answer': return <CheckCircle2 className="w-5 h-5 text-primary" />;
      default: return <TerminalSquare className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getBorderColor = () => {
    switch (step.type) {
      case 'thought': return 'border-purple-500/20 bg-purple-500/5';
      case 'tool_call': return 'border-blue-500/20 bg-blue-500/5';
      case 'tool_result': return 'border-green-500/20 bg-green-500/5';
      case 'final_answer': return 'border-primary/50 bg-primary/10';
      default: return 'border-border bg-card';
    }
  };

  return (
    <div className={cn(
      "p-4 rounded-xl border animate-in fade-in slide-in-from-left-4 duration-300", 
      getBorderColor()
    )}>
      <div className="flex items-center gap-2 mb-2">
        {getIcon()}
        <span className="font-mono text-xs font-semibold uppercase tracking-wider opacity-80">
          {step.type.replace('_', ' ')}
        </span>
        {step.toolName && (
          <Badge variant="outline" className="ml-2 font-mono text-[10px] h-5 bg-background/50">
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

function StrandPopover({
  runId,
  shareToken,
  onChange,
}: {
  runId: number;
  shareToken: string | null | undefined;
  onChange: (token: string | null) => void;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const createStrand = useCreateStrand();
  const revokeStrand = useRevokeStrand();

  const strandUrl = shareToken
    ? `${window.location.origin}/strand/${shareToken}`
    : "";

  const handleCreate = async () => {
    try {
      const res = await createStrand.mutateAsync({ runId });
      onChange(res.token);
      toast({ title: "Strand ready", description: "Public link created. Anyone with the URL can view this run." });
    } catch (err) {
      toast({
        title: "Could not create Strand",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleRevoke = async () => {
    try {
      await revokeStrand.mutateAsync({ runId });
      onChange(null);
      toast({ title: "Strand revoked", description: "The public link no longer works." });
    } catch (err) {
      toast({
        title: "Could not revoke Strand",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(strandUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: "Copy failed", description: "Select the URL and copy manually.", variant: "destructive" });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" data-testid="button-strand">
          <Share2 className="w-3.5 h-3.5" />
          {shareToken ? "Strand live" : "Strand"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96">
        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" />
              Shareable Strand
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              A read-only public link to this run's full trace. No login required.
            </p>
          </div>

          {shareToken ? (
            <>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={strandUrl}
                  className="font-mono text-xs h-8"
                  onFocus={(e) => e.currentTarget.select()}
                  data-testid="input-strand-url"
                />
                <Button size="sm" variant="outline" onClick={handleCopy} className="h-8 px-2 shrink-0">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <a
                  href={strandUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  Open in new tab →
                </a>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleRevoke}
                  disabled={revokeStrand.isPending}
                  className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  data-testid="button-revoke-strand"
                >
                  {revokeStrand.isPending ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3 mr-1" />
                  )}
                  Revoke
                </Button>
              </div>
            </>
          ) : (
            <Button
              size="sm"
              className="w-full"
              onClick={handleCreate}
              disabled={createStrand.isPending}
              data-testid="button-create-strand"
            >
              {createStrand.isPending ? (
                <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Creating Strand…</>
              ) : (
                <><Link2 className="w-3.5 h-3.5 mr-2" /> Generate Strand link</>
              )}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function AgentRunView() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const initialTask = searchParams.get("task");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const agentId = parseInt(params.id || "0", 10);
  const isNewRun = params.runId === "new";
  const runId = isNewRun ? 0 : parseInt(params.runId || "0", 10);

  const bottomRef = useRef<HTMLDivElement>(null);

  // If viewing an existing run
  const { data: existingRun, isLoading: existingLoading } = useGetRun(runId, {
    query: { enabled: !isNewRun && runId > 0, queryKey: getGetRunQueryKey(runId) }
  });

  // If streaming a new run
  const { run: streamingRun, error: streamError, isStreaming } = useRunStream(
    agentId, 
    initialTask || "", 
    isNewRun && !!initialTask
  );

  // Local optimistic copy of shareToken so the popover updates instantly without
  // waiting for refetch.
  const [shareTokenOverride, setShareTokenOverride] = useState<string | null | undefined>(undefined);
  useEffect(() => { setShareTokenOverride(undefined); }, [runId]);

  const replayRun = useReplayRun({
    mutation: {
      onSuccess: (data) => {
        toast({ title: "Rebake complete", description: `Loaded new bake #${data.runId}.` });
        // Refresh lists so the new run appears in run history
        queryClient.invalidateQueries({ queryKey: ["/runs"] });
        queryClient.invalidateQueries({ queryKey: [`/agents/${agentId}/runs`] });
        setLocation(`/agents/${data.agentId}/run/${data.runId}`);
      },
      onError: (err: unknown) => {
        toast({
          title: "Rebake failed",
          description: err instanceof Error ? err.message : "Unknown error",
          variant: "destructive",
        });
      },
    },
  });

  const activeRun = isNewRun ? streamingRun : existingRun;
  const isLoading = isNewRun ? (!streamingRun && !streamError) : existingLoading;

  const effectiveShareToken =
    shareTokenOverride !== undefined
      ? shareTokenOverride
      : (existingRun?.shareToken ?? null);

  const showActions = !isNewRun && !!existingRun;
  const replayOfRunId = existingRun?.replayOfRunId ?? null;
  
  // Auto-scroll
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [activeRun?.steps.length]);

  // Update URL once streaming finishes so refresh works
  useEffect(() => {
    if (isNewRun && streamingRun?.status === "completed" && streamingRun.id) {
      // Small delay to let the animation finish before changing URL
      const t = setTimeout(() => {
        setLocation(`/agents/${agentId}/run/${streamingRun.id}`, { replace: true });
      }, 2000);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isNewRun, streamingRun?.status, streamingRun?.id, agentId, setLocation]);

  if (!agentId || (isNewRun && !initialTask)) {
    return (
      <Shell>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold">Invalid Run Request</h2>
          <Button className="mt-4" onClick={() => setLocation(`/agents/${agentId}`)}>Go Back</Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <Link href={`/agents/${agentId}`}>
            <Button variant="ghost" size="icon" className="rounded-full shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <TerminalSquare className="w-5 h-5 text-primary" />
                Live Runner
              </h1>
              {activeRun && (
                <Badge 
                  variant={activeRun.status === "completed" ? "default" : activeRun.status === "failed" ? "destructive" : "secondary"} 
                  className={cn(
                    "uppercase font-mono text-[10px]",
                    activeRun.status === "running" && "animate-pulse"
                  )}
                >
                  {activeRun.status}
                </Badge>
              )}
              {replayOfRunId && (
                <Link href={`/agents/${agentId}/run/${replayOfRunId}`}>
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] uppercase gap-1 cursor-pointer hover:bg-accent"
                    data-testid="badge-replay-of"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Rebake of #{replayOfRunId}
                  </Badge>
                </Link>
              )}
            </div>
            {activeRun && <p className="text-sm text-muted-foreground truncate">{activeRun.agentName}</p>}
          </div>
        </div>

        {showActions && existingRun && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => replayRun.mutate({ runId: existingRun.id })}
              disabled={replayRun.isPending || existingRun.status === "running"}
              data-testid="button-rebake"
            >
              {replayRun.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              {replayRun.isPending ? "Rebaking…" : "Rebake"}
            </Button>
            <StrandPopover
              runId={existingRun.id}
              shareToken={effectiveShareToken}
              onChange={(token) => setShareTokenOverride(token)}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-12rem)] min-h-[600px]">
        {/* Task Details Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="p-4 rounded-xl border border-border bg-card/50 flex-1">
            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-3">Task Input</h3>
            <div className="text-sm font-mono p-3 bg-muted/50 rounded-lg whitespace-pre-wrap">
              {activeRun?.task || initialTask || "Loading task..."}
            </div>
            
            {activeRun?.output && (
              <div className="mt-6 animate-in fade-in slide-in-from-bottom-4">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-primary mb-3">Final Output</h3>
                <div className="text-sm p-4 bg-primary/10 border border-primary/20 rounded-lg whitespace-pre-wrap">
                  {activeRun.output}
                </div>
              </div>
            )}
            
            {streamError && (
               <div className="mt-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg animate-in fade-in">
                 <h3 className="font-semibold text-sm text-destructive flex items-center gap-2 mb-2">
                   <XCircle className="w-4 h-4" /> Error
                 </h3>
                 <p className="text-sm font-mono text-destructive/80">{streamError}</p>
               </div>
            )}
          </div>
        </div>

        {/* Steps Timeline Area */}
        <div className="lg:col-span-3 rounded-xl border border-border bg-card/50 overflow-hidden flex flex-col relative">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
              <p className="font-mono text-sm">Initializing run...</p>
            </div>
          ) : (
            <ScrollArea className="flex-1 p-6">
              <div className="max-w-3xl mx-auto space-y-6 pb-12">
                {activeRun?.steps.map((step: RunStep, idx: number) => (
                  <div key={idx} className="relative pl-6">
                    {/* Timeline line */}
                    {idx !== activeRun.steps.length - 1 && (
                      <div className="absolute left-[11px] top-8 bottom-[-24px] w-px bg-border z-0" />
                    )}
                    {/* Timeline dot */}
                    <div className="absolute left-[7px] top-6 w-[9px] h-[9px] rounded-full bg-primary z-10 ring-4 ring-background" />
                    
                    <StepCard step={step} />
                  </div>
                ))}
                
                {isStreaming && (
                  <div className="relative pl-6 animate-pulse">
                     <div className="absolute left-[7px] top-6 w-[9px] h-[9px] rounded-full bg-muted-foreground z-10 ring-4 ring-background" />
                     <div className="p-4 rounded-xl border border-border border-dashed bg-transparent">
                       <div className="flex items-center gap-3 text-muted-foreground">
                         <Loader2 className="w-4 h-4 animate-spin" />
                         <span className="font-mono text-xs uppercase tracking-wider">Agent is thinking...</span>
                       </div>
                     </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </Shell>
  );
}
