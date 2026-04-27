import React from "react";
import { Link } from "wouter";
import { useGetStats, useListTemplates } from "@workspace/api-client-react";
import { Shell } from "@/components/layout/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, CheckCircle2, XCircle, Bot, Zap } from "lucide-react";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetStats();
  const { data: templates, isLoading: templatesLoading } = useListTemplates();

  const featuredTemplates = templates?.slice(0, 3) || [];

  return (
    <Shell>
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and recent activity.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)
        ) : (
          <>
            <Card className="bg-card/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Total Agents</span>
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="text-2xl font-bold font-mono">{stats?.totalAgents || 0}</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Total Runs</span>
                  <Activity className="h-4 w-4 text-primary" />
                </div>
                <div className="text-2xl font-bold font-mono">{stats?.totalRuns || 0}</div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Success Rate</span>
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </div>
                <div className="text-2xl font-bold font-mono">
                  {stats?.totalRuns ? Math.round((stats.completedRuns / stats.totalRuns) * 100) : 0}%
                </div>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Failed Runs</span>
                  <XCircle className="h-4 w-4 text-destructive" />
                </div>
                <div className="text-2xl font-bold font-mono">{stats?.failedRuns || 0}</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">Quick Templates</h2>
          <Link href="/templates">
            <Button variant="link" size="sm">Browse all</Button>
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {templatesLoading ? (
             Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : featuredTemplates.length === 0 ? (
             <div className="md:col-span-3 p-8 text-center text-muted-foreground text-sm border rounded-xl border-dashed">
               No templates available.
             </div>
          ) : (
            featuredTemplates.map((template) => (
              <Link key={template.id} href={`/agents/new?template=${encodeURIComponent(template.id)}`}>
                <Card className="bg-card/50 hover:border-primary/50 transition-colors h-full cursor-pointer">
                  <CardContent className="p-4 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm mb-1">{template.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono">{template.difficulty}</Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">{template.tools.length} tools</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </Shell>
  );
}
