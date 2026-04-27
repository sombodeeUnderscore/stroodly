import { pgTable, text, serial, timestamp, integer, varchar, type AnyPgColumn } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { agentsTable } from "./agents";

export const agentRunsTable = pgTable("agent_runs", {
  id: serial("id").primaryKey(),
  agentId: integer("agent_id").notNull().references(() => agentsTable.id, { onDelete: "cascade" }),
  task: text("task").notNull(),
  status: text("status").notNull().default("running"),
  output: text("output"),
  stepCount: integer("step_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  // When this run is a Replay of an earlier run, link back to the source.
  // Self-reference uses a thunked callback to avoid TDZ on the table identifier.
  replayOfRunId: integer("replay_of_run_id").references((): AnyPgColumn => agentRunsTable.id, { onDelete: "set null" }),
  // When set, this run is publicly viewable as a Strand (read-only shared trace).
  shareToken: varchar("share_token", { length: 32 }).unique(),
});

export const insertAgentRunSchema = createInsertSchema(agentRunsTable).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertAgentRun = z.infer<typeof insertAgentRunSchema>;
export type AgentRun = typeof agentRunsTable.$inferSelect;
