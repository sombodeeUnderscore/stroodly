import { Router } from "express";
import { db } from "@workspace/db";
import { agentsTable, agentRunsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/stats", async (req, res) => {
  try {
    const [agentStats] = await db
      .select({ count: sql<number>`count(*)` })
      .from(agentsTable);

    const runStats = await db
      .select({
        status: agentRunsTable.status,
        count: sql<number>`count(*)`,
      })
      .from(agentRunsTable)
      .groupBy(agentRunsTable.status);

    const totalRuns = runStats.reduce((sum, r) => sum + Number(r.count), 0);
    const completedRuns = Number(runStats.find(r => r.status === "completed")?.count ?? 0);
    const failedRuns = Number(runStats.find(r => r.status === "failed")?.count ?? 0);

    const toolStats = await db
      .select({ tools: agentsTable.tools })
      .from(agentsTable);

    const toolFreq: Record<string, number> = {};
    for (const row of toolStats) {
      const tools = row.tools as string[];
      for (const t of tools) {
        toolFreq[t] = (toolFreq[t] ?? 0) + 1;
      }
    }
    const activeTools = Object.entries(toolFreq)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    res.json({
      totalAgents: Number(agentStats?.count ?? 0),
      totalRuns,
      completedRuns,
      failedRuns,
      activeTools,
    });
  } catch (err) {
    req.log.error({ err }, "Error getting stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
