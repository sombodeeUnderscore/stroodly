import React from "react";
import { Link, useLocation } from "wouter";
import { useListTemplates } from "@workspace/api-client-react";
import { Shell } from "@/components/layout/shell";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Wrench, Sparkles, ChefHat, ArrowRight } from "lucide-react";
import type { AgentTemplate } from "@workspace/api-client-react";

export default function TemplatesList() {
  const [, setLocation] = useLocation();
  const { data: templates, isLoading } = useListTemplates();

  const handleUseTemplate = (template: AgentTemplate) => {
    setLocation(`/agents/new?template=${encodeURIComponent(template.id)}`);
  };

  return (
    <Shell>
      <div className="mb-8">
        <h1 className="font-serif text-4xl font-extrabold tracking-tight mb-2 flex items-center gap-3">
          <ChefHat className="w-9 h-9 text-primary" /> Recipe Box
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          Pre-baked starting points you can use as a base for a new agent. Each recipe lists its{" "}
          <span className="text-foreground font-medium">ingredients</span> (tools) and the{" "}
          <span className="text-foreground font-medium">model</span> it's tuned for. Pick one to open
          the builder with everything pre-filled — nothing is added to your library until you save.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[300px] rounded-xl" />
          ))
        ) : (
          templates?.map((template) => (
            <Card key={template.id} className="bg-card/50 flex flex-col hover:border-primary/50 transition-all hover:-translate-y-1">
              <CardHeader className="pb-4 border-b border-border/50">
                <div className="flex justify-between items-start mb-3">
                  <Badge variant="outline" className="bg-background text-[10px] font-mono uppercase">
                    {template.category}
                  </Badge>
                  <Badge
                    variant={template.difficulty === "beginner" ? "secondary" : template.difficulty === "advanced" ? "destructive" : "default"}
                    className="text-[10px] font-mono"
                  >
                    {template.difficulty}
                  </Badge>
                </div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> {template.name}
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="py-4 flex-1">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                      <Wrench className="w-3 h-3" /> Configured Tools
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {template.tools.map(t => (
                        <Badge key={t} variant="secondary" className="font-mono text-[9px] px-1.5 bg-muted/50">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Model
                    </h4>
                    <span className="text-sm font-mono text-foreground/80">{template.model}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t border-border/50 bg-muted/10">
                <Button
                  className="w-full gap-2"
                  onClick={() => handleUseTemplate(template)}
                >
                  Open in builder <ArrowRight className="w-4 h-4" />
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      <div className="mt-10 text-center">
        <Link href="/agents/new">
          <Button variant="outline" className="gap-2">
            Or build one from scratch
          </Button>
        </Link>
      </div>
    </Shell>
  );
}
