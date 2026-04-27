import React from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCreateAgent,
  useListTools,
  useListBuiltinTools,
  useListTemplates,
  getListAgentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Shell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Bot, Plus, ArrowUp, ArrowDown, X, GitBranch, Brain, Sparkles, Wrench, ChefHat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50),
  description: z.string().max(200).optional().default(""),
  systemPrompt: z.string().min(10, "System prompt is required to guide the agent"),
  model: z.string().min(1, "Please select a model"),
  mode: z.enum(["react", "pipeline"]).default("react"),
  tools: z.array(z.string()).default([]),
});

type FormValues = z.infer<typeof formSchema>;

type ToolOption = {
  id: string;
  label: string;
  description: string;
  custom: boolean;
};

export default function AgentNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createAgent = useCreateAgent();
  const { data: customTools } = useListTools();
  const { data: builtinTools } = useListBuiltinTools();

  // Read ?template=<id> from the URL so the user can start from a recipe
  // without anything being inserted into the library until they save. We use
  // wouter's useSearch so the value reacts to client-side route changes.
  const search = useSearch();
  const templateId = React.useMemo(() => {
    const sp = new URLSearchParams(search);
    return sp.get("template");
  }, [search]);
  const { data: templates } = useListTemplates();
  const template = React.useMemo(
    () => templates?.find((t) => t.id === templateId) ?? null,
    [templates, templateId]
  );

  const allTools: ToolOption[] = [
    ...(builtinTools ?? []).map((t) => ({
      id: t.id,
      label: t.name,
      description: t.description,
      custom: false,
    })),
    ...(customTools ?? []).map((ct) => ({
      id: `custom_${ct.id}`,
      label: ct.name,
      description: ct.description || `Custom ${ct.type} tool`,
      custom: true,
    })),
  ];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      systemPrompt: "You are a helpful AI assistant.",
      model: "gpt-4o",
      mode: "react",
      tools: [],
    },
  });

  // When a template is requested, prefill the form once it loads.
  const prefilledFromTemplateRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!template) return;
    if (prefilledFromTemplateRef.current === template.id) return;
    prefilledFromTemplateRef.current = template.id;
    form.reset({
      name: template.name,
      description: template.description ?? "",
      systemPrompt: template.systemPrompt,
      model: template.model ?? "gpt-4o",
      mode: "react",
      tools: template.tools ?? [],
    });
  }, [template, form]);

  const selectedTools = form.watch("tools");
  const mode = form.watch("mode");

  const addTool = (id: string) => {
    form.setValue("tools", [...selectedTools, id], { shouldDirty: true });
  };
  const removeTool = (idx: number) => {
    const next = [...selectedTools];
    next.splice(idx, 1);
    form.setValue("tools", next, { shouldDirty: true });
  };
  const moveTool = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= selectedTools.length) return;
    const next = [...selectedTools];
    [next[idx], next[target]] = [next[target], next[idx]];
    form.setValue("tools", next, { shouldDirty: true });
  };

  const available = allTools.filter((t) => !selectedTools.includes(t.id));
  const selectedDetails = selectedTools
    .map((id) => allTools.find((t) => t.id === id))
    .filter((t): t is ToolOption => Boolean(t));

  const onSubmit = (data: FormValues) => {
    if (data.mode === "pipeline" && data.tools.length === 0) {
      toast({
        title: "Pipeline needs tools",
        description: "Add at least one tool to the chain.",
        variant: "destructive",
      });
      return;
    }
    createAgent.mutate(
      { data },
      {
        onSuccess: (newAgent) => {
          queryClient.invalidateQueries({ queryKey: getListAgentsQueryKey() });
          toast({
            title: "Agent created",
            description: `${newAgent.name} is ready to run.`,
          });
          setLocation(`/agents/${newAgent.id}`);
        },
        onError: (error: Error) => {
          toast({
            title: "Error creating agent",
            description: error.message || "An unknown error occurred.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Shell>
      <div className="flex items-center gap-4 mb-8">
        <Link href={template ? "/templates" : "/agents"}>
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Agent</h1>
          <p className="text-muted-foreground">Configure a new AI agent's instructions and capabilities.</p>
        </div>
      </div>

      {template && (
        <div className="mb-6 p-3 rounded-lg border border-primary/30 bg-primary/5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm">
            <ChefHat className="w-4 h-4 text-primary shrink-0" />
            <div>
              <span className="font-medium">Pre-filled from recipe:</span>{" "}
              <span className="text-muted-foreground">{template.name}</span>
              <span className="text-muted-foreground"> — review and edit, then click <strong>Create Agent</strong> to add it to your library.</span>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="text-lg">Basic Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Research Scout" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Briefly describe what this agent does" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a model" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="gpt-4o">GPT-4o (Fast & Capable)</SelectItem>
                            <SelectItem value="gpt-4o-mini">GPT-4o Mini (Cost Effective)</SelectItem>
                            <SelectItem value="gpt-4.1">GPT-4.1 (Latest)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="text-lg">Execution Mode</CardTitle>
                  <CardDescription>
                    How should the agent use its tools when running?
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="mode"
                    render={({ field }) => (
                      <FormItem>
                        <div className="grid gap-3 md:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => field.onChange("react")}
                            className={`text-left p-4 border rounded-lg transition-colors ${
                              field.value === "react"
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/40"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <Brain className="w-4 h-4 text-primary" />
                              <span className="font-semibold">ReAct Agent</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              The LLM reasons step-by-step and decides which tool to call. Tool order is a hint.
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => field.onChange("pipeline")}
                            className={`text-left p-4 border rounded-lg transition-colors ${
                              field.value === "pipeline"
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/40"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <GitBranch className="w-4 h-4 text-primary" />
                              <span className="font-semibold">Pipeline</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Run tools in fixed order. Each tool's output becomes the next tool's input.
                            </p>
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="text-lg">Instructions</CardTitle>
                  <CardDescription>
                    {mode === "pipeline"
                      ? "The system prompt is not used in pipeline mode — tools run in sequence without LLM reasoning."
                      : "The system prompt dictates how the agent behaves and reasons."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="systemPrompt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>System Prompt</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="You are a..."
                            className="min-h-[200px] font-mono text-sm"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card className="bg-card/50">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {mode === "pipeline" ? "Tool Chain" : "Tools"}
                  </CardTitle>
                  <CardDescription>
                    {mode === "pipeline"
                      ? "Tools run in the order shown. Output of each tool feeds the next."
                      : "Select tools the agent can use. Order is a hint to the LLM."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {mode === "pipeline" ? "Chain" : "Selected"} · {selectedDetails.length}
                    </div>
                    {selectedDetails.length === 0 ? (
                      <div className="mt-2 p-6 border border-dashed border-border rounded-lg text-center text-sm text-muted-foreground">
                        {mode === "pipeline"
                          ? "Add tools below to build the chain."
                          : "No tools selected. The agent will answer directly."}
                      </div>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {selectedDetails.map((tool, idx) => (
                          <div key={tool.id} className="relative">
                            <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-muted/30">
                              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/20 text-primary font-bold text-xs shrink-0">
                                {idx + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">{tool.label}</span>
                                  {tool.custom ? (
                                    <Badge variant="outline" className="text-xs h-5 px-1">Custom</Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-xs h-5 px-1">Built-in</Badge>
                                  )}
                                  <code className="text-xs text-muted-foreground font-mono">{tool.id}</code>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tool.description}</p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="w-7 h-7"
                                  onClick={() => moveTool(idx, -1)}
                                  disabled={idx === 0}
                                  title="Move up"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="w-7 h-7"
                                  onClick={() => moveTool(idx, 1)}
                                  disabled={idx === selectedDetails.length - 1}
                                  title="Move down"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="w-7 h-7 text-destructive"
                                  onClick={() => removeTool(idx)}
                                  title="Remove"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                            {mode === "pipeline" && idx < selectedDetails.length - 1 && (
                              <div className="ml-6 h-2 border-l-2 border-dashed border-primary/30" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {available.length > 0 && (
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Available
                      </div>
                      <div className="mt-2 grid gap-2">
                        {available.map((tool) => (
                          <button
                            key={tool.id}
                            type="button"
                            onClick={() => addTool(tool.id)}
                            className="flex items-center gap-3 p-3 border border-border rounded-lg hover:border-primary/40 hover:bg-accent/30 transition-colors text-left group"
                          >
                            <div className="p-1.5 rounded-md bg-muted text-muted-foreground shrink-0">
                              {tool.custom ? <Wrench className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{tool.label}</span>
                                <Badge variant="outline" className="text-xs h-5 px-1">
                                  {tool.custom ? "Custom" : "Built-in"}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tool.description}</p>
                            </div>
                            <Plus className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="tools"
                    render={() => (
                      <FormItem>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end gap-4">
                <Link href="/agents">
                  <Button variant="outline" type="button">Cancel</Button>
                </Link>
                <Button type="submit" disabled={createAgent.isPending} className="min-w-[120px]">
                  {createAgent.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving</>
                  ) : (
                    "Create Agent"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>

        <div>
          <Card className="bg-primary/5 border-primary/20 sticky top-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Bot className="w-5 h-5" /> Tips for great agents
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <strong className="block mb-1">ReAct vs Pipeline</strong>
                <p className="text-muted-foreground">
                  Use <strong>ReAct</strong> for open-ended tasks where the agent needs to reason.
                  Use <strong>Pipeline</strong> for deterministic workflows (e.g. search → summarize → extract).
                </p>
              </div>
              <div>
                <strong className="block mb-1">Chain order matters</strong>
                <p className="text-muted-foreground">
                  In pipeline mode, the output of each tool becomes the input of the next. Put the tool that produces the final format last.
                </p>
              </div>
              <div>
                <strong className="block mb-1">Be specific</strong>
                <p className="text-muted-foreground">Give the agent a clear role and constraints. Vague prompts lead to generic output.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Shell>
  );
}
