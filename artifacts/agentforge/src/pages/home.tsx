import React, { useEffect } from "react";
import { Link } from "wouter";
import { StroodlyLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Brain,
  GitBranch,
  Wrench,
  Sparkles,
  Activity,
  Layers,
  ShieldCheck,
  Zap,
} from "lucide-react";

export default function Home() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main>
        <Hero />
        <LogoRibbon />
        <FeatureGrid />
        <HowItWorksTeaser />
        <ClosingCTA />
      </main>

      <SiteFooter />
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <StroodlyLogo size={30} />
          <span className="font-serif font-extrabold text-xl tracking-tight">Stroodly</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm">
          <Link href="/how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
            How it works
          </Link>
          <Link href="/templates" className="text-muted-foreground hover:text-foreground transition-colors">
            Recipe Box
          </Link>
          <Link href="/api-docs" className="text-muted-foreground hover:text-foreground transition-colors">
            API
          </Link>
          <Link href="/tools" className="text-muted-foreground hover:text-foreground transition-colors">
            Tools
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex">Open app</Button>
          </Link>
          <Link href="/agents/new">
            <Button size="sm" className="gap-1.5">
              Start building <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(600px 320px at 20% 20%, hsl(38 92% 58% / 0.18), transparent 60%), radial-gradient(800px 400px at 80% 10%, hsl(18 78% 52% / 0.14), transparent 60%)",
        }}
      />
      <div className="max-w-6xl mx-auto px-6 pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="flex flex-col items-start max-w-3xl">
          <div className="mb-6">
            <StroodlyLogo size={72} />
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Freshly baked AI agents
          </div>
          <h1 className="font-serif text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05]">
            Layer tools. <span className="text-primary">Roll</span> your agent.
            <br />
            Ship automation.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Stroodly is a compact agent builder for people who want less plumbing and more output.
            Wire built-in tools, drop in custom webhooks, and run agents in reasoning or deterministic
            pipeline mode — then watch every step stream live.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link href="/agents/new">
              <Button size="lg" className="gap-2 text-base">
                Build your first agent <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/how-it-works">
              <Button size="lg" variant="outline" className="gap-2 text-base">
                See how it works
              </Button>
            </Link>
          </div>
          <p className="mt-5 text-xs text-muted-foreground">
            No credit card. Runs locally in your workspace.
          </p>
        </div>
      </div>
    </section>
  );
}

function LogoRibbon() {
  return (
    <section className="border-y border-border/60 bg-muted/20">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col items-center gap-5 text-muted-foreground md:flex-row md:justify-between">
          <div className="flex items-center gap-3">
            <StroodlyLogo size={40} />
            <div>
              <div className="font-serif text-xl font-extrabold tracking-tight text-foreground">Stroodly</div>
              <div className="text-xs uppercase tracking-wider font-medium">Freshly baked AI agents</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm font-medium">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              React + Vite
            </div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Express API
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Postgres + Drizzle
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              OpenAI
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Streaming SSE
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureGrid() {
  const features = [
    {
      icon: Brain,
      title: "ReAct reasoning",
      body: "Classic agent loop. The model reasons, picks a tool, observes, and iterates until it has an answer.",
    },
    {
      icon: GitBranch,
      title: "Deterministic pipelines",
      body: "Chain tools in a fixed order where each output feeds the next — perfect for repeatable workflows.",
    },
    {
      icon: Wrench,
      title: "Custom tools",
      body: "Point an agent at any webhook, or save reusable prompt templates as tools you can chain.",
    },
    {
      icon: Activity,
      title: "Live run streaming",
      body: "Every thought, tool call, and result streams to the UI as it happens — debug agents as they run.",
    },
    {
      icon: Layers,
      title: "Reusable templates",
      body: "Start from a gallery of six pre-built agents: researcher, writer, data extractor, and more.",
    },
    {
      icon: ShieldCheck,
      title: "Honest by default",
      body: "No simulated results dressed up as real ones. If a tool can't run for real, it says so.",
    },
  ];
  return (
    <section className="max-w-6xl mx-auto px-6 py-24 md:py-32">
      <div className="max-w-2xl mb-14">
        <div className="text-xs uppercase tracking-wider text-primary font-semibold mb-3">Why Stroodly</div>
        <h2 className="font-serif text-4xl md:text-5xl font-bold tracking-tight">
          Small surface area, real capability.
        </h2>
        <p className="mt-5 text-lg text-muted-foreground">
          Every feature is here because we use it. No speculative abstractions, no mock data.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="p-6 rounded-2xl border border-border bg-card hover:border-primary/40 transition-colors"
          >
            <div className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center mb-4">
              <Icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-lg mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorksTeaser() {
  const steps = [
    {
      n: "01",
      title: "Pick tools",
      body: "Enable built-ins like web search and summarize, or add custom webhooks and prompt tools.",
    },
    {
      n: "02",
      title: "Choose a mode",
      body: "ReAct for open-ended reasoning. Pipeline for deterministic tool chains where output → input.",
    },
    {
      n: "03",
      title: "Run and watch",
      body: "Every step streams live — thoughts, tool calls, results, and the final answer.",
    },
  ];
  return (
    <section className="border-t border-border/60 bg-muted/10">
      <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-20 items-start">
          <div className="lg:sticky lg:top-28">
            <div className="text-xs uppercase tracking-wider text-primary font-semibold mb-3">The recipe</div>
            <h2 className="font-serif text-4xl md:text-5xl font-bold tracking-tight">
              Three steps. One warm agent.
            </h2>
            <p className="mt-5 text-muted-foreground">
              From idea to running agent in under a minute. Iterate with the same workflow.
            </p>
            <Link href="/how-it-works" className="inline-flex items-center gap-2 mt-8 text-primary font-medium hover:gap-3 transition-all">
              Full walkthrough <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-4">
            {steps.map(({ n, title, body }) => (
              <div
                key={n}
                className="p-6 md:p-8 rounded-2xl border border-border bg-card flex gap-6 items-start"
              >
                <div className="font-serif text-3xl md:text-4xl font-extrabold text-primary/70 shrink-0 tabular-nums">
                  {n}
                </div>
                <div>
                  <h3 className="font-semibold text-xl mb-2">{title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ClosingCTA() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24 md:py-32">
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent p-10 md:p-16">
        <div
          aria-hidden
          className="absolute -right-16 -top-20 opacity-30 blur-sm"
        >
          <StroodlyLogo size={320} />
        </div>
        <div className="relative max-w-xl">
          <h2 className="font-serif text-4xl md:text-5xl font-extrabold tracking-tight">
            Ready to roll your first agent?
          </h2>
          <p className="mt-5 text-lg text-muted-foreground">
            Pick a template or start from scratch. No account, no config files — just build.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/agents/new">
              <Button size="lg" className="gap-2">
                Build from scratch <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/templates">
              <Button size="lg" variant="outline">Browse templates</Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <StroodlyLogo size={24} />
          <span className="font-serif font-bold text-lg">Stroodly</span>
          <span className="text-xs text-muted-foreground ml-2">Warm, layered AI agents.</span>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
          <Link href="/how-it-works" className="hover:text-foreground">How it works</Link>
          <Link href="/templates" className="hover:text-foreground">Recipe Box</Link>
          <Link href="/api-docs" className="hover:text-foreground">API</Link>
          <Link href="/tools" className="hover:text-foreground">Tools</Link>
          <Link href="/dashboard" className="hover:text-foreground">Dashboard</Link>
        </div>
      </div>
    </footer>
  );
}
