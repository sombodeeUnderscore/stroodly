import { Router } from "express";
import { randomBytes } from "node:crypto";
import { db } from "@workspace/db";
import { agentsTable, agentRunsTable, runStepsTable } from "@workspace/db";
import {
  ListAgentRunsParams,
  StartAgentRunParams,
  StartAgentRunBody,
  GetRunParams,
} from "@workspace/api-zod";
import { eq, desc, sql } from "drizzle-orm";
import { executeAgentRun, createAndExecuteRun, type RunStepEvent } from "../lib/agent-executor";

const router = Router();

// Columns returned by run *list* endpoints. shareToken is intentionally
// excluded: the strand token is unguessable-by-design and must not be
// enumerable via list endpoints. Detail endpoint adds it back below.
const runListColumns = {
  id: agentRunsTable.id,
  agentId: agentRunsTable.agentId,
  agentName: agentsTable.name,
  task: agentRunsTable.task,
  status: agentRunsTable.status,
  output: agentRunsTable.output,
  stepCount: agentRunsTable.stepCount,
  createdAt: agentRunsTable.createdAt,
  completedAt: agentRunsTable.completedAt,
  replayOfRunId: agentRunsTable.replayOfRunId,
} as const;

const runDetailColumns = {
  ...runListColumns,
  shareToken: agentRunsTable.shareToken,
} as const;

router.get("/agents/:id/runs", async (req, res) => {
  const parsed = ListAgentRunsParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const runs = await db
      .select(runListColumns)
      .from(agentRunsTable)
      .innerJoin(agentsTable, eq(agentRunsTable.agentId, agentsTable.id))
      .where(eq(agentRunsTable.agentId, parsed.data.id))
      .orderBy(desc(agentRunsTable.createdAt));
    res.json(runs);
  } catch (err) {
    req.log.error({ err }, "Error listing runs");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/agents/:id/run", async (req, res) => {
  const paramsParsed = StartAgentRunParams.safeParse({ id: Number(req.params.id) });
  const bodyParsed = StartAgentRunBody.safeParse(req.body);
  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const agentId = paramsParsed.data.id;
  const task = bodyParsed.data.task;

  const [agent] = await db.select().from(agentsTable).where(eq(agentsTable.id, agentId));
  if (!agent) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const [run] = await db.insert(agentRunsTable).values({
    agentId,
    task,
    status: "running",
    stepCount: 0,
  }).returning();

  const emit = (ev: RunStepEvent) => {
    res.write(
      `data: ${JSON.stringify({
        type: "step",
        step: {
          ...ev,
          id: ev.stepIndex + 1,
        },
      })}\n\n`
    );
  };

  try {
    const { output, status } = await executeAgentRun({
      agent,
      task,
      runId: run.id,
      emit,
    });

    await db.update(agentRunsTable).set({
      status,
      output,
      completedAt: new Date(),
    }).where(eq(agentRunsTable.id, run.id));

    if (status === "completed") {
      await db.update(agentsTable).set({
        runCount: sql`${agentsTable.runCount} + 1`,
      }).where(eq(agentsTable.id, agentId));
    }

    res.write(`data: ${JSON.stringify({ type: "done", runId: run.id, output })}\n\n`);
  } catch (err) {
    req.log.error({ err }, "Error running agent");
    await db.update(agentRunsTable).set({
      status: "failed",
      completedAt: new Date(),
    }).where(eq(agentRunsTable.id, run.id));
    res.write(`data: ${JSON.stringify({ type: "error", message: "Agent run failed" })}\n\n`);
  } finally {
    res.end();
  }
});

router.get("/runs", async (req, res) => {
  try {
    const runs = await db
      .select(runListColumns)
      .from(agentRunsTable)
      .innerJoin(agentsTable, eq(agentRunsTable.agentId, agentsTable.id))
      .orderBy(desc(agentRunsTable.createdAt))
      .limit(50);
    res.json(runs);
  } catch (err) {
    req.log.error({ err }, "Error listing all runs");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Wipe the entire bake log: every run, every step, and reset per-agent
// run counters back to zero. Steps are removed first so we never strand
// orphaned step rows if the runs delete fails partway through.
//
// We refuse the clear if any run is still in flight: the run executor
// only bumps `agents.runCount` when the run completes, so wiping rows
// out from under an active executor would leave a non-zero counter
// against an empty history — directly contradicting what the UI dialog
// promises. Operators must wait for active runs to finish (or cancel
// them) before clearing.
router.delete("/runs", async (req, res) => {
  try {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(agentRunsTable)
      .where(eq(agentRunsTable.status, "running"));
    if (count > 0) {
      res.status(409).json({
        error:
          "Cannot clear the log while runs are still in progress. Wait for them to finish, then try again.",
      });
      return;
    }

    await db.transaction(async (tx) => {
      await tx.delete(runStepsTable);
      await tx.delete(agentRunsTable);
      await tx.update(agentsTable).set({ runCount: 0 });
    });
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Error clearing all runs");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/runs/:runId", async (req, res) => {
  const parsed = GetRunParams.safeParse({ runId: Number(req.params.runId) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid runId" });
    return;
  }
  try {
    const [run] = await db
      .select(runDetailColumns)
      .from(agentRunsTable)
      .innerJoin(agentsTable, eq(agentRunsTable.agentId, agentsTable.id))
      .where(eq(agentRunsTable.id, parsed.data.runId));

    if (!run) {
      res.status(404).json({ error: "Run not found" });
      return;
    }

    const stepsData = await db
      .select()
      .from(runStepsTable)
      .where(eq(runStepsTable.runId, parsed.data.runId))
      .orderBy(runStepsTable.stepIndex);

    res.json({ ...run, steps: stepsData });
  } catch (err) {
    req.log.error({ err }, "Error getting run");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// Replay — re-run a past run's task against the agent's current configuration.
// The new run is linked back to the source via replay_of_run_id so the UI
// can show "Replay of #N" and the original can list its replays.
// Synchronous (mirrors /v1/agents/:id/invoke) — returns the new run id once
// the agent finishes, then the client navigates to the persisted run page.
// ---------------------------------------------------------------------------
router.post("/runs/:runId/replay", async (req, res) => {
  const sourceRunId = Number(req.params.runId);
  if (!Number.isInteger(sourceRunId) || sourceRunId <= 0) {
    res.status(400).json({ error: "Invalid runId" });
    return;
  }

  try {
    const [source] = await db
      .select()
      .from(agentRunsTable)
      .where(eq(agentRunsTable.id, sourceRunId));
    if (!source) {
      res.status(404).json({ error: "Source run not found" });
      return;
    }

    // Don't replay an in-flight run — its task is already executing and the
    // result we'd be "replaying" doesn't exist yet. Mirrors the UI guard.
    if (source.status === "running") {
      res.status(409).json({ error: "Cannot replay a run that is still in progress" });
      return;
    }

    const [agent] = await db
      .select()
      .from(agentsTable)
      .where(eq(agentsTable.id, source.agentId));
    if (!agent) {
      res.status(404).json({ error: "Agent for source run not found" });
      return;
    }

    const { runId: newRunId, output, status } = await createAndExecuteRun({
      agent,
      task: source.task,
    });

    // Stamp the replay link after the run row exists.
    await db
      .update(agentRunsTable)
      .set({ replayOfRunId: sourceRunId })
      .where(eq(agentRunsTable.id, newRunId));

    res.status(200).json({
      runId: newRunId,
      agentId: agent.id,
      replayOfRunId: sourceRunId,
      status,
      output,
    });
  } catch (err) {
    req.log.error({ err }, "Error replaying run");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// Strand — public, read-only shareable trace link for a single run.
// Idempotent: re-POST returns the existing token rather than rotating it.
// ---------------------------------------------------------------------------
router.post("/runs/:runId/strand", async (req, res) => {
  const runId = Number(req.params.runId);
  if (!Number.isInteger(runId) || runId <= 0) {
    res.status(400).json({ error: "Invalid runId" });
    return;
  }
  try {
    // Atomic, race-free idempotency: COALESCE keeps the existing token if one
    // is already set, otherwise stores the freshly generated candidate. Two
    // concurrent callers therefore observe the same token, never overwrite
    // each other, and never invalidate a token already returned to a caller.
    const candidate = randomBytes(16).toString("hex"); // 32 hex chars
    const [updated] = await db
      .update(agentRunsTable)
      .set({
        shareToken: sql`COALESCE(${agentRunsTable.shareToken}, ${candidate})`,
      })
      .where(eq(agentRunsTable.id, runId))
      .returning({ shareToken: agentRunsTable.shareToken });

    if (!updated) {
      res.status(404).json({ error: "Run not found" });
      return;
    }

    const token = updated.shareToken!;
    res.status(200).json({ token, url: `/strand/${token}` });
  } catch (err) {
    req.log.error({ err }, "Error creating strand");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/runs/:runId/strand", async (req, res) => {
  const runId = Number(req.params.runId);
  if (!Number.isInteger(runId) || runId <= 0) {
    res.status(400).json({ error: "Invalid runId" });
    return;
  }
  try {
    const result = await db
      .update(agentRunsTable)
      .set({ shareToken: null })
      .where(eq(agentRunsTable.id, runId))
      .returning({ id: agentRunsTable.id });
    if (result.length === 0) {
      res.status(404).json({ error: "Run not found" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "Error revoking strand");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/strands/:token", async (req, res) => {
  const token = String(req.params.token || "");
  // Use 404 for both malformed and unknown tokens so an unauthenticated caller
  // cannot distinguish "wrong format" from "valid format but revoked/missing"
  // — both leak no information about token shape or existence.
  if (!/^[a-f0-9]{32}$/.test(token)) {
    res.status(404).json({ error: "Strand not found" });
    return;
  }
  try {
    const [run] = await db
      .select({
        id: agentRunsTable.id,
        agentId: agentRunsTable.agentId,
        agentName: agentsTable.name,
        agentMode: agentsTable.mode,
        task: agentRunsTable.task,
        status: agentRunsTable.status,
        output: agentRunsTable.output,
        stepCount: agentRunsTable.stepCount,
        createdAt: agentRunsTable.createdAt,
        completedAt: agentRunsTable.completedAt,
      })
      .from(agentRunsTable)
      .innerJoin(agentsTable, eq(agentRunsTable.agentId, agentsTable.id))
      .where(eq(agentRunsTable.shareToken, token));
    if (!run) {
      res.status(404).json({ error: "Strand not found" });
      return;
    }

    const stepsData = await db
      .select()
      .from(runStepsTable)
      .where(eq(runStepsTable.runId, run.id))
      .orderBy(runStepsTable.stepIndex);

    res.json({ ...run, token, steps: stepsData });
  } catch (err) {
    req.log.error({ err }, "Error fetching strand");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
