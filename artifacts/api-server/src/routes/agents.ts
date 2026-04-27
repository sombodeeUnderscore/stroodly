import { Router } from "express";
import { db } from "@workspace/db";
import { agentsTable } from "@workspace/db";
import {
  CreateAgentBody,
  GetAgentParams,
  UpdateAgentParams,
  UpdateAgentBody,
  DeleteAgentParams,
} from "@workspace/api-zod";
import { eq, like, sql } from "drizzle-orm";

const router = Router();

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "agent";
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  const existing = await db
    .select({ slug: agentsTable.slug })
    .from(agentsTable)
    .where(sql`${agentsTable.slug} = ${base} OR ${agentsTable.slug} LIKE ${base + "-%"}`);
  if (existing.length === 0) return base;
  const taken = new Set(existing.map((r) => r.slug));
  if (!taken.has(base)) return base;
  for (let i = 2; i < 1000; i++) {
    const candidate = `${base}-${i}`;
    if (!taken.has(candidate)) return candidate;
  }
  return `${base}-${Date.now()}`;
}

router.get("/agents", async (req, res) => {
  try {
    const agents = await db.select().from(agentsTable).orderBy(agentsTable.createdAt);
    res.json(agents);
  } catch (err) {
    req.log.error({ err }, "Error listing agents");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/agents", async (req, res) => {
  const parsed = CreateAgentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const data = parsed.data;
  if ((data.mode ?? "react") === "pipeline" && (!data.tools || data.tools.length === 0)) {
    res.status(400).json({ error: "Pipeline agents must have at least one tool in the chain." });
    return;
  }
  try {
    const slug = await uniqueSlug(data.name);
    const [agent] = await db
      .insert(agentsTable)
      .values({
        slug,
        name: data.name,
        description: data.description,
        systemPrompt: data.systemPrompt,
        tools: data.tools,
        mode: data.mode ?? "react",
        model: data.model ?? "gpt-5.4",
      })
      .returning();
    res.status(201).json(agent);
  } catch (err) {
    req.log.error({ err }, "Error creating agent");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/agents/:id", async (req, res) => {
  const parsed = GetAgentParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [agent] = await db
      .select()
      .from(agentsTable)
      .where(eq(agentsTable.id, parsed.data.id));
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    res.json(agent);
  } catch (err) {
    req.log.error({ err }, "Error getting agent");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/agents/:id", async (req, res) => {
  const paramsParsed = UpdateAgentParams.safeParse({ id: Number(req.params.id) });
  const bodyParsed = UpdateAgentBody.safeParse(req.body);
  if (!paramsParsed.success || !bodyParsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }
  try {
    const data = bodyParsed.data;
    const [existing] = await db
      .select()
      .from(agentsTable)
      .where(eq(agentsTable.id, paramsParsed.data.id));
    if (!existing) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    const effectiveMode = data.mode ?? existing.mode;
    const effectiveTools = data.tools ?? (existing.tools as string[]);
    if (effectiveMode === "pipeline" && (!effectiveTools || effectiveTools.length === 0)) {
      res.status(400).json({ error: "Pipeline agents must have at least one tool in the chain." });
      return;
    }
    const updateData: Partial<typeof agentsTable.$inferInsert> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.systemPrompt !== undefined) updateData.systemPrompt = data.systemPrompt;
    if (data.tools !== undefined) updateData.tools = data.tools;
    if (data.mode !== undefined) updateData.mode = data.mode;
    if (data.model !== undefined) updateData.model = data.model;
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(agentsTable)
      .set(updateData)
      .where(eq(agentsTable.id, paramsParsed.data.id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error updating agent");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/agents/:id", async (req, res) => {
  const parsed = DeleteAgentParams.safeParse({ id: Number(req.params.id) });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db.delete(agentsTable).where(eq(agentsTable.id, parsed.data.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting agent");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
