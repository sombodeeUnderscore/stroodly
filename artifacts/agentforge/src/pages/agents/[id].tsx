import React, { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { 
  useGetAgent, 
  useListAgentRuns,
  useDeleteAgent,
  getListAgentsQueryKey,
  getListAgentRunsQueryKey,
  useUpdateAgent,
  getGetAgentQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Shell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, MessageSquare, Trash2, Edit2, History, CheckCircle2, XCircle, Loader2, GitBranch, Brain, Sparkles, Wrench } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { AgentChat } from "@/components/agent-chat";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AgentDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: agent, isLoading: agentLoading } = useGetAgent(id, { 
    query: { enabled: !!id, queryKey: getGetAgentQueryKey(id) } 
  });
  
  const { data: runs, isLoading: runsLoading } = useListAgentRuns(id, {
    query: { enabled: !!id, queryKey: getListAgentRunsQueryKey(id) }
  });

  const deleteAgent = useDeleteAgent();
  const updateAgent = useUpdateAgent();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPrompt, setEditPrompt] = useState("");

  // Initialize edit form when opening
  const handleOpenEdit = () => {
    if (agent) {
      setEditName(agent.name);
      setEditDesc(agent.description || "");
      setEditPrompt(agent.systemPrompt || "");
      setIsEditing(true);
    }
  };

  const handleUpdate = () => {
    updateAgent.mutate({
      id,
      data: {
        name: editName,
        description: editDesc,
        systemPrompt: editPrompt,
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAgentQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() });
        toast({ title: "Agent updated successfully" });
        setIsEditing(false);
      },
      onError: (err: Error) => {
        toast({ title: "Failed to update", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleDelete = () => {
    deleteAgent.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() });
        toast({ title: "Agent deleted" });
        setLocation("/agents");
      },
      onError: (err: Error) => {
        toast({ title: "Failed to delete", description: err.message, variant: "destructive" });
      }
    });
  };

  if (agentLoading) {
    return (
      <Shell>
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <Skeleton className="h-[300px] md:col-span-2" />
            <Skeleton className="h-[400px]" />
          </div>
        </div>
      </Shell>
    );
  }

  if (!agent) {
    return (
      <Shell>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold mb-2">Agent Not Found</h2>
          <p className="text-muted-foreground mb-6">This agent doesn't exist or has been deleted.</p>
          <Link href="/agents">
            <Button>Back to Agents</Button>
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/agents">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-3xl font-bold tracking-tight">{agent.name}</h1>
              <Badge variant="outline" className="font-mono">{agent.model}</Badge>
              <Badge variant="secondary" className="gap-1">
                {agent.mode === "pipeline" ? <GitBranch className="w-3 h-3" /> : <Brain className="w-3 h-3" />}
                {agent.mode === "pipeline" ? "Pipeline" : "ReAct"}
              </Badge>
            </div>
            <p className="text-muted-foreground">{agent.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isEditing} onOpenChange={setIsEditing}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleOpenEdit}>
                <Edit2 className="w-4 h-4" /> Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit Agent</DialogTitle>
                <DialogDescription>Make changes to the agent's basic configuration.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={editName} onChange={e => setEditName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={editDesc} onChange={e => setEditDesc(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>System Prompt</Label>
                  <Textarea className="min-h-[150px] font-mono text-sm" value={editPrompt} onChange={e => setEditPrompt(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button onClick={handleUpdate} disabled={updateAgent.isPending}>
                  {updateAgent.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2">
                <Trash2 className="w-4 h-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {agent.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the agent and all its run history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete Agent
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-card/50 border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" /> Run Agent
              </CardTitle>
              <CardDescription>
                Chat with {agent.name} — every reply is saved to Run History below. Follow-up turns share the conversation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AgentChat
                agent={agent}
                apiBase="/api"
                onRunComplete={() => {
                  queryClient.invalidateQueries({ queryKey: getListAgentRunsQueryKey(id) });
                  queryClient.invalidateQueries({ queryKey: getGetAgentQueryKey(id) });
                }}
              />
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-4 h-4" /> Run History
                </CardTitle>
              </div>
              <Badge variant="secondary" className="font-mono">{runs?.length || 0} total</Badge>
            </CardHeader>
            <CardContent>
              {runsLoading ? (
                <div className="space-y-4 py-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : !runs?.length ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No runs yet. Start a task above.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {runs.map((run) => (
                    <Link key={run.id} href={`/agents/${id}/run/${run.id}`} className="block">
                      <div className="py-4 hover:bg-accent/50 transition-colors px-2 -mx-2 rounded-lg flex items-start justify-between group">
                        <div className="flex gap-3">
                          <div className="mt-0.5">
                            {run.status === "completed" ? (
                              <CheckCircle2 className="w-5 h-5 text-primary" />
                            ) : run.status === "failed" ? (
                              <XCircle className="w-5 h-5 text-destructive" />
                            ) : (
                              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm line-clamp-1">{run.task}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground font-mono">
                              <span>{format(new Date(run.createdAt), "MMM d, h:mm a")}</span>
                              <span>•</span>
                              <span>{run.stepCount} steps</span>
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100">
                          View
                        </Button>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                  {agent.mode === "pipeline" ? "Tool Chain" : "Enabled Tools"}
                </h4>
                {agent.tools.length > 0 ? (
                  <div className="space-y-1.5">
                    {agent.tools.map((tool, idx) => {
                      const isCustom = tool.startsWith("custom_");
                      return (
                        <div key={tool} className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 text-primary font-bold text-[10px] shrink-0">
                            {idx + 1}
                          </div>
                          <Badge variant="secondary" className="font-mono text-xs gap-1">
                            {isCustom ? <Wrench className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                            {tool}
                          </Badge>
                          {agent.mode === "pipeline" && idx < agent.tools.length - 1 && (
                            <span className="text-xs text-muted-foreground">→</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    {agent.mode === "pipeline" ? "No tools in chain" : "No tools enabled"}
                  </p>
                )}
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">System Prompt Preview</h4>
                <div className="bg-muted/50 rounded-md p-3 text-xs font-mono max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                  {agent.systemPrompt}
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Stats</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-md p-3 text-center">
                    <div className="text-2xl font-bold font-mono">{agent.runCount}</div>
                    <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Runs</div>
                  </div>
                  <div className="bg-muted/50 rounded-md p-3 text-center">
                    <div className="text-2xl font-bold font-mono">{formatDistanceToNow(new Date(agent.createdAt)).split(" ")[0]}</div>
                    <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">Age</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
