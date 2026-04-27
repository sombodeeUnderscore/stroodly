import React from "react";
import { Link } from "wouter";
import { useListAgents } from "@workspace/api-client-react";
import { Shell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Bot, Play, Settings } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AgentsList() {
  const { data: agents, isLoading } = useListAgents();

  return (
    <Shell>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Agent Library</h1>
          <p className="text-muted-foreground">Manage your custom AI agents and their configurations.</p>
        </div>
        <Link href="/agents/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Create Agent
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[200px] rounded-xl" />
          ))
        ) : agents?.length === 0 ? (
          <div className="col-span-full py-12 text-center border rounded-xl border-dashed bg-card/50">
            <Bot className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No agents yet</h3>
            <p className="text-muted-foreground mb-4 text-sm max-w-sm mx-auto">
              Create your first AI agent to start automating tasks and running workflows.
            </p>
            <Link href="/agents/new">
              <Button variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Create your first agent
              </Button>
            </Link>
          </div>
        ) : (
          agents?.map((agent) => (
            <Card key={agent.id} className="bg-card/50 hover:border-primary/50 transition-colors flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-5 h-5 text-primary" />
                  </div>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {agent.model}
                  </Badge>
                </div>
                <CardTitle className="text-lg">{agent.name}</CardTitle>
                <CardDescription className="line-clamp-2 text-xs">
                  {agent.description || "No description provided."}
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex-1 flex flex-col justify-end">
                <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono mb-4">
                  <div className="flex items-center gap-1">
                    <Play className="w-3 h-3" />
                    {agent.runCount} runs
                  </div>
                  <div className="flex items-center gap-1">
                    <Settings className="w-3 h-3" />
                    {agent.tools.length} tools
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/agents/${agent.id}`} className="flex-1">
                    <Button variant="secondary" className="w-full text-xs" size="sm">
                      Details
                    </Button>
                  </Link>
                  <Link href={`/agents/${agent.id}?run=true`} className="flex-1">
                    <Button className="w-full text-xs gap-1" size="sm">
                      <Play className="w-3 h-3" /> Run
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </Shell>
  );
}
