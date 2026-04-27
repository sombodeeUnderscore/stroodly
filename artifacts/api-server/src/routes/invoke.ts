import { Router } from "express";
import { db, agentsTable, runStepsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createAndExecuteRun } from "../lib/agent-executor";

const router = Router();

router.post("/v1/agents/:idOrSlug/invoke", async (req, res) => {
  const idOrSlug = String(req.params.idOrSlug);
  const asNumber = Number(idOrSlug);
  const lookupById = Number.isInteger(asNumber) && asNumber > 0 && /^\d+$/.test(idOrSlug);

  const body = req.body as { input?: unknown; includeSteps?: unknown; history?: unknown } | undefined;
  if (!body || typeof body !== "object") {
    res.status(400).json({ error: "Request body must be a JSON object." });
    return;
  }
  const input = body.input;
  if (typeof input !== "string" || input.trim().length === 0) {
    res.status(400).json({ error: "Field 'input' is required and must be a non-empty string." });
    return;
  }
  const includeSteps = body.includeSteps === true;

  let history: { role: "user" | "assistant"; content: string }[] | undefined;
  if (body.history !== undefined) {
    if (!Array.isArray(body.history)) {
      res.status(400).json({ error: "Field 'history' must be an array of { role, content } entries." });
      return;
    }
    const cleaned: { role: "user" | "assistant"; content: string }[] = [];
    for (const m of body.history) {
      if (
        m && typeof m === "object" &&
        ((m as { role?: unknown }).role === "user" || (m as { role?: unknown }).role === "assistant") &&
        typeof (m as { content?: unknown }).content === "string"
      ) {
        cleaned.push({ role: (m as { role: "user" | "assistant" }).role, content: (m as { content: string }).content });
      } else {
        res.status(400).json({ error: "Each history entry must be { role: 'user'|'assistant', content: string }." });
        return;
      }
    }
    history = cleaned;
  }

  let agent = lookupById
    ? (await db.select().from(agentsTable).where(eq(agentsTable.id, asNumber)))[0]
    : (await db.select().from(agentsTable).where(eq(agentsTable.slug, idOrSlug)))[0];
  if (!agent && lookupById) {
    agent = (await db.select().from(agentsTable).where(eq(agentsTable.slug, idOrSlug)))[0];
  }
  if (!agent) {
    res.status(404).json({ error: "Agent not found" });
    return;
  }

  try {
    const { runId, output, status } = await createAndExecuteRun({
      agent,
      task: input,
      history,
    });

    const responseBody: {
      runId: number;
      agentId: number;
      agentName: string;
      status: string;
      output: string;
      steps?: { stepIndex: number; type: string; content: string; toolName: string | null }[];
    } = {
      runId,
      agentId: agent.id,
      agentName: agent.name,
      status,
      output,
    };

    if (includeSteps) {
      const stepsData = await db
        .select({
          stepIndex: runStepsTable.stepIndex,
          type: runStepsTable.type,
          content: runStepsTable.content,
          toolName: runStepsTable.toolName,
        })
        .from(runStepsTable)
        .where(eq(runStepsTable.runId, runId))
        .orderBy(runStepsTable.stepIndex);
      responseBody.steps = stepsData;
    }

    res.status(status === "completed" ? 200 : 502).json(responseBody);
  } catch (err) {
    req.log.error({ err }, "Error invoking agent");
    res.status(500).json({ error: "Agent invocation failed", message: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
