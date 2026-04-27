import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { agentRunsTable } from "./agent_runs";

export const runStepsTable = pgTable("run_steps", {
  id: serial("id").primaryKey(),
  runId: integer("run_id").notNull().references(() => agentRunsTable.id, { onDelete: "cascade" }),
  stepIndex: integer("step_index").notNull(),
  type: text("type").notNull(),
  content: text("content").notNull(),
  toolName: text("tool_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRunStepSchema = createInsertSchema(runStepsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertRunStep = z.infer<typeof insertRunStepSchema>;
export type RunStep = typeof runStepsTable.$inferSelect;
