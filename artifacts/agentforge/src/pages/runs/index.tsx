import React from "react";
import { Link } from "wouter";
import {
  useListAllRuns,
  useClearAllRuns,
  getListAllRunsQueryKey,
  getGetStatsQueryKey,
  getListAgentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Shell } from "@/components/layout/shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, XCircle, Loader2, TerminalSquare, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function RunsList() {
  const { data: runs, isLoading } = useListAllRuns();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const clearAllRuns = useClearAllRuns();

  const handleClear = () => {
    clearAllRuns.mutate(undefined, {
      onSuccess: () => {
        // Run history is cached in several places: the global list on this
        // page, the dashboard stats, the agent library (run counters), and
        // a per-agent list keyed by `/api/agents/:id/runs` for every agent
        // detail page that has been opened. The predicate sweeps all of
        // those agent-scoped caches in one pass.
        queryClient.invalidateQueries({ queryKey: getListAllRunsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() });
        queryClient.invalidateQueries({
          predicate: (q) => {
            const key = q.queryKey[0];
            return (
              typeof key === "string" &&
              /^\/api\/agents\/\d+\/runs$/.test(key)
            );
          },
        });
        toast({ title: "Bake log cleared", description: "All runs have been removed." });
      },
      onError: (err: Error) => {
        toast({
          title: "Couldn't clear the log",
          description: err.message || "An unknown error occurred.",
          variant: "destructive",
        });
      },
    });
  };

  const hasRuns = (runs?.length ?? 0) > 0;

  return (
    <Shell>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Run History</h1>
          <p className="text-muted-foreground">A complete log of all agent executions.</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-destructive hover:text-destructive"
              disabled={!hasRuns || clearAllRuns.isPending}
            >
              {clearAllRuns.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Clear log
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear the entire bake log?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes every run and step across all agents and
                resets each agent's run counter to zero. Agents themselves are
                left untouched. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleClear}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Clear everything
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card className="bg-card/50 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead className="w-[40%]">Task</TableHead>
              <TableHead>Started</TableHead>
              <TableHead className="text-right">Steps</TableHead>
              <TableHead className="text-right w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 rounded ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : runs?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <TerminalSquare className="w-8 h-8 opacity-50" />
                    <p>No runs recorded yet.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              runs?.map((run) => (
                <TableRow key={run.id} className="group cursor-pointer hover:bg-accent/50">
                  <TableCell>
                    {run.status === "completed" ? (
                       <Badge variant="default" className="font-mono text-[10px] uppercase"><CheckCircle2 className="w-3 h-3 mr-1" /> Done</Badge>
                    ) : run.status === "failed" ? (
                       <Badge variant="destructive" className="font-mono text-[10px] uppercase"><XCircle className="w-3 h-3 mr-1" /> Failed</Badge>
                    ) : (
                       <Badge variant="secondary" className="font-mono text-[10px] uppercase animate-pulse"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Running</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{run.agentName}</TableCell>
                  <TableCell className="max-w-[300px]">
                    <p className="truncate" title={run.task}>{run.task}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {formatDistanceToNow(new Date(run.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">
                    {run.stepCount}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/agents/${run.agentId}/run/${run.id}`}>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-8 px-2 transition-opacity">
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </Shell>
  );
}
