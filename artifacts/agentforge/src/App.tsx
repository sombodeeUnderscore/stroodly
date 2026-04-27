import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, dehydrate, hydrate } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import Home from "@/pages/home";
import HowItWorks from "@/pages/how-it-works";
import ApiDocs from "@/pages/api-docs";
import AgentsList from "@/pages/agents/index";
import AgentNew from "@/pages/agents/new";
import AgentDetail from "@/pages/agents/[id]";
import AgentRun from "@/pages/agents/run";
import RunsList from "@/pages/runs/index";
import StrandView from "@/pages/strand/[token]";
import TemplatesList from "@/pages/templates/index";
import ToolsPage from "@/pages/tools/index";

const CACHE_KEY = "stroodly-query-cache";
const CACHE_MAX_AGE = 1000 * 60 * 60;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 1000 * 60 * 60 * 24,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    },
  },
});

if (typeof window !== "undefined") {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const { ts, state } = JSON.parse(raw);
      if (Date.now() - ts < CACHE_MAX_AGE) {
        hydrate(queryClient, state);
      }
    }
  } catch {
  }

  queryClient.getQueryCache().subscribe((event) => {
    if (event.type === "updated" && event.query.state.status === "success") {
      try {
        sessionStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ ts: Date.now(), state: dehydrate(queryClient) })
        );
      } catch {
      }
    }
  });
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/api-docs" component={ApiDocs} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/agents" component={AgentsList} />
      <Route path="/agents/new" component={AgentNew} />
      <Route path="/agents/:id" component={AgentDetail} />
      <Route path="/agents/:id/run/:runId" component={AgentRun} />
      <Route path="/runs" component={RunsList} />
      <Route path="/strand/:token" component={StrandView} />
      <Route path="/templates" component={TemplatesList} />
      <Route path="/tools" component={ToolsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
