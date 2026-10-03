import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const cases = sqliteTable("cases", {
  caseKey: text("case_key").primaryKey(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  sourceType: text("source_type").notNull(),
  briefJson: text("brief_json").notNull().default("{}"),
  annotationsJson: text("annotations_json").notNull().default("{}"),
  planJson: text("plan_json").notNull().default("{}"),
  notesJson: text("notes_json").notNull().default("{}"),
  updatedAt: text("updated_at").notNull(),
});

export const snapshots = sqliteTable("snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  caseKey: text("case_key").notNull().references(() => cases.caseKey),
  capturedAt: text("captured_at").notNull(),
  sourceJson: text("source_json").notNull(),
  analysisJson: text("analysis_json").notNull(),
  commentCount: integer("comment_count").notNull(),
  needKeysJson: text("need_keys_json").notNull(),
});

export const studySessions = sqliteTable("study_sessions", {
  id: text("id").primaryKey(),
  variant: text("variant").notNull(),
  snapshotId: integer("snapshot_id").notNull().references(() => snapshots.id),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  evidenceIdsJson: text("evidence_ids_json").notNull().default("[]"),
  counterexampleId: text("counterexample_id").notNull().default(""),
  hypothesis: text("hypothesis").notNull().default(""),
  reviewStatus: text("review_status").notNull().default("pending"),
  unsupportedClaim: integer("unsupported_claim").notNull().default(0),
  reviewerNote: text("reviewer_note").notNull().default(""),
});
