# Stroodly

Stroodly is a small AI agent builder. You wire together a system prompt,
a model, and a list of tools, then watch every tool call and reasoning
step stream live as the agent works.

It's a full‑stack TypeScript monorepo:

- **Frontend** — React + Vite + Tailwind, in `artifacts/agentforge`
- **API** — Express, in `artifacts/api-server`
- **Database** — Postgres, accessed through Drizzle ORM, schema in `lib/db`
- **Agent runtime** — LangChain v1 with LangGraph for the ReAct loop and
  for the deterministic Pipeline mode
- **Generated client** — `lib/api-spec/openapi.yaml` is the source of
  truth; orval generates the typed React Query hooks in
  `lib/api-client-react`

## Quick tour

1. Open the home page and click **Open app**.
2. From the dashboard, click **Stroodly Library** to see the demo agents.
3. Pick one, type a task, and hit **Bake** — the run streams step by
   step in the right pane.
4. Open **Bake Log** to see every run across every agent. Click any
   row to replay or share that run via a public link.
5. Open **Recipe Box** to start a new agent from a template, or
   **Kitchen Tools** to plug in a custom webhook tool.

## Two ways agents run

- **ReAct** — the model reads the task, decides which tool to call,
  reads the result, and decides what to do next. Tool order is just a
  hint.
- **Pipeline** — the tools you list run in fixed order and each tool's
  output becomes the next tool's input. No model in the middle.

## Built‑in tools

`web_search` (Brave), `summarize`, `extract_data`, `write_content`,
`calculate`, `fetch_url`, `current_datetime`, and `call_agent`
(one agent invokes another). All eight live in
`artifacts/api-server/src/builtin-tools.ts`.

## Demo agents to try

- **Timer** — answers questions like "what time is it in Tokyo right
  now?" using `current_datetime`.
- **Page Taster** — paste a URL, get back a short summary
  (`fetch_url` → `summarize`).
- **Live Pantry** — quick web lookups with citations
  (`web_search` → `summarize`).
- **Daily Bake** — finds information and formats it into a clean
  briefing (multi‑step ReAct).
- **Head Baker** — coordinator agent that delegates sub‑tasks to other
  agents through `call_agent`.

## Run it locally

You'll need:

- **Node 20+** and **pnpm 9+** (`npm i -g pnpm`)
- A **Postgres** database (local install, Docker, Neon, Supabase — any
  Postgres URL works)
- An **OpenAI‑compatible API key** for the model and the tools that use
  an LLM (`summarize`, `extract_data`, `write_content`)
- Optional: a **Brave Search API key** to enable the `web_search` tool

1. **Clone and install**

   ```bash
   git clone <this-repo>
   cd stroodly
   pnpm install
   ```

2. **Set environment variables.** Create a `.env` file at the repo root
   (or export them in your shell):

   ```bash
   # Database
   DATABASE_URL=postgres://user:pass@localhost:5432/stroodly

   # Model + LLM-backed tools (point at OpenAI or any compatible gateway)
   AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
   AI_INTEGRATIONS_OPENAI_API_KEY=sk-...

   # Optional — enables the web_search tool
   BRAVE_SEARCH_API_KEY=...

   # Pick any free ports
   PORT=5173            # only read by whichever process you start
   ```

   On Replit these are managed for you in the Secrets pane and each
   service gets its own `PORT` automatically.

3. **Push the schema to your database** (creates the tables; safe to
   re-run):

   ```bash
   pnpm --filter @workspace/db run push
   ```

4. **Start the API server** (port 8080 by default):

   ```bash
   PORT=8080 pnpm --filter @workspace/api-server run dev
   ```

5. **In a second terminal, start the web app** (port 5173 by default):

   ```bash
   PORT=5173 pnpm --filter @workspace/agentforge run dev
   ```

   Then open http://localhost:5173.

   The Vite dev server proxies `/api/*` to the API server, so both
   processes need to be running.

### Useful scripts

```bash
pnpm typecheck                                   # typecheck everything
pnpm --filter @workspace/api-spec run codegen    # regenerate API client
pnpm --filter @workspace/db run push             # apply schema changes
pnpm --filter @workspace/db run push-force       # ...even if destructive
```

## Repo layout

```
artifacts/
  agentforge/        # React + Vite front end
  api-server/        # Express API + LangChain agent runtime
  mockup-sandbox/    # Isolated component preview server (dev only)
lib/
  db/                # Drizzle schema and pg pool
  api-spec/          # OpenAPI spec — source of truth for the API
  api-zod/           # Generated request/response Zod schemas
  api-client-react/  # Generated React Query hooks (orval)
```

## What to look for during review

- Is it clear what the app does within ten seconds of landing?
- Is the next click always obvious?
- Do the labels read naturally to a non‑technical person?
- Does anything feel slow, broken, or confusing?
- Would you actually use it again?
