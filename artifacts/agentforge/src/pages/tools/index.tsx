import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useListTools,
  useCreateTool,
  useDeleteTool,
  useListBuiltinTools,
  getListToolsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Shell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
import { Wrench, Trash2, Plus, Webhook, MessageSquareCode, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const formSchema = z.discriminatedUnion("type", [
  z.object({
    name: z.string().min(1, "Name is required").max(50),
    description: z.string().max(300).default(""),
    type: z.literal("webhook"),
    webhookUrl: z.string().url("Must be a valid URL"),
  }),
  z.object({
    name: z.string().min(1, "Name is required").max(50),
    description: z.string().max(300).default(""),
    type: z.literal("prompt"),
    promptTemplate: z.string().min(10, "Prompt template must be at least 10 characters"),
  }),
]);

type FormValues = z.infer<typeof formSchema>;

export default function ToolsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: tools, isLoading } = useListTools();
  const { data: builtinTools } = useListBuiltinTools();
  const createTool = useCreateTool();
  const deleteTool = useDeleteTool();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "webhook",
      webhookUrl: "",
    },
  });

  const watchedType = form.watch("type");

  const onSubmit = (data: FormValues) => {
    const config: Record<string, unknown> =
      data.type === "webhook"
        ? { url: data.webhookUrl }
        : { template: data.promptTemplate };

    createTool.mutate(
      {
        data: {
          name: data.name,
          description: data.description,
          type: data.type,
          config,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListToolsQueryKey() });
          toast({ title: "Tool created", description: `${data.name} is ready to use.` });
          form.reset({ name: "", description: "", type: "webhook", webhookUrl: "" });
          setShowForm(false);
        },
        onError: (err: Error) => {
          toast({
            title: "Error creating tool",
            description: err.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleDelete = (id: number, name: string) => {
    deleteTool.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListToolsQueryKey() });
          toast({ title: "Tool deleted", description: `${name} has been removed.` });
        },
        onError: (err: Error) => {
          toast({
            title: "Error deleting tool",
            description: err.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="w-6 h-6 text-primary" />
            Tool Builder
          </h1>
          <p className="text-muted-foreground mt-1">
            Define custom tools that agents can use during runs
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Tool
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6 border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg">Create Custom Tool</CardTitle>
            <CardDescription>
              Define a webhook URL (called with POST) or a prompt template (processed by the LLM).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tool Name</FormLabel>
                        <FormControl>
                          <Input placeholder="my_custom_tool" {...field} />
                        </FormControl>
                        <FormDescription>
                          Agents reference this tool by this name.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tool Type</FormLabel>
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val);
                            if (val === "webhook") {
                              form.reset({
                                name: form.getValues("name"),
                                description: form.getValues("description"),
                                type: "webhook",
                                webhookUrl: "",
                              });
                            } else {
                              form.reset({
                                name: form.getValues("name"),
                                description: form.getValues("description"),
                                type: "prompt",
                                promptTemplate: "",
                              });
                            }
                          }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="webhook">
                              <span className="flex items-center gap-2">
                                <Webhook className="w-4 h-4" /> Webhook URL
                              </span>
                            </SelectItem>
                            <SelectItem value="prompt">
                              <span className="flex items-center gap-2">
                                <MessageSquareCode className="w-4 h-4" /> Prompt Template
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="What does this tool do?"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        The agent uses this description to decide when to call the tool.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {watchedType === "webhook" && (
                  <FormField
                    control={form.control}
                    name="webhookUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Webhook URL</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://your-service.com/webhook"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          The agent sends a POST request with{" "}
                          <code className="text-xs bg-muted px-1 rounded">
                            {"{ input: string }"}
                          </code>{" "}
                          and uses the response as the tool result.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {watchedType === "prompt" && (
                  <FormField
                    control={form.control}
                    name="promptTemplate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prompt Template (System Prompt)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="You are a specialized assistant. Given the input, ..."
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          This system prompt is used when the LLM processes the tool input.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="flex gap-2 justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createTool.isPending} className="gap-2">
                    {createTool.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create Tool
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="font-semibold">Built-in Tools</h2>
          <Badge variant="secondary" className="text-xs">Always available</Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          These tools are pre-configured and can be enabled on any agent.
        </p>
        {!builtinTools ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {builtinTools.map((t) => (
              <Card key={t.id} className="bg-muted/20">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="mt-0.5 p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{t.name}</span>
                      <Badge variant="outline" className="text-xs">{t.category}</Badge>
                      <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                        {t.id}
                      </code>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{t.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3 mt-8">
        <Wrench className="w-4 h-4 text-primary" />
        <h2 className="font-semibold">Custom Tools</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Tools you've defined — webhooks or prompt templates.
      </p>

      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading tools...</div>
      ) : !tools || tools.length === 0 ? (
        <Card className="py-16">
          <div className="text-center text-muted-foreground space-y-2">
            <Wrench className="w-10 h-10 mx-auto opacity-30" />
            <p className="font-medium">No custom tools yet</p>
            <p className="text-sm">
              Click{" "}
              <span
                className="text-primary cursor-pointer underline"
                onClick={() => setShowForm(true)}
              >
                New Tool
              </span>{" "}
              to create your first one.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {tools.map((tool) => {
            const toolId = `custom_${tool.id}`;
            const config = tool.config as Record<string, unknown>;
            return (
              <Card key={tool.id} className="group">
                <CardContent className="p-4 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                      {tool.type === "webhook" ? (
                        <Webhook className="w-4 h-4" />
                      ) : (
                        <MessageSquareCode className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{tool.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {tool.type === "webhook" ? "Webhook" : "Prompt"}
                        </Badge>
                        <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                          {toolId}
                        </code>
                      </div>
                      {tool.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {tool.description}
                        </p>
                      )}
                      <div className="mt-1.5 text-xs text-muted-foreground">
                        {tool.type === "webhook" && config.url ? (
                          <span className="font-mono truncate block max-w-xs">
                            POST {String(config.url)}
                          </span>
                        ) : tool.type === "prompt" && config.template ? (
                          <span className="italic truncate block max-w-sm">
                            "{String(config.template).substring(0, 80)}
                            {String(config.template).length > 80 ? "..." : ""}"
                          </span>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Created{" "}
                        {formatDistanceToNow(new Date(tool.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete tool?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete <strong>{tool.name}</strong>.
                          Agents that reference{" "}
                          <code className="text-xs bg-muted px-1">{toolId}</code> will no
                          longer be able to use it.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(tool.id, tool.name)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </Shell>
  );
}
