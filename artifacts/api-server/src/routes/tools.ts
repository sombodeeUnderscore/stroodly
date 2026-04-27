import { Router } from "express";
import { db } from "@workspace/db";
import { toolsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateToolBody, DeleteToolParams } from "@workspace/api-zod";
import { BUILTIN_TOOL_METADATA } from "../builtin-tools";

const router = Router();

router.get("/tools/builtin", async (_req, res) => {
  res.json(BUILTIN_TOOL_METADATA);
});

router.get("/tools", async (req, res) => {
  try {
    const tools = await db.select().from(toolsTable).orderBy(toolsTable.createdAt);
    res.json(tools);
  } catch (err) {
    req.log.error({ err }, "Error listing tools");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tools", async (req, res) => {
  const parsed = CreateToolBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
    return;
  }
  const { type, config } = parsed.data;
  if (type === "webhook") {
    const url = (config as { url?: unknown }).url;
    if (!url || typeof url !== "string" || !url.startsWith("http")) {
      res.status(400).json({ error: "Webhook tools require a valid config.url (must start with http)" });
      return;
    }
  } else if (type === "prompt") {
    const template = (config as { template?: unknown }).template;
    if (!template || typeof template !== "string" || template.trim().length < 5) {
      res.status(400).json({ error: "Prompt tools require a non-empty config.template (at least 5 characters)" });
      return;
    }
  }
  try {
    const [tool] = await db.insert(toolsTable).values(parsed.data).returning();
    res.status(201).json(tool);
  } catch (err) {
    req.log.error({ err }, "Error creating tool");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/tools/:id", async (req, res) => {
  const parsed = DeleteToolParams.safeParse({ id: req.params.id });
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [deleted] = await db
      .delete(toolsTable)
      .where(eq(toolsTable.id, parsed.data.id))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Tool not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting tool");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
