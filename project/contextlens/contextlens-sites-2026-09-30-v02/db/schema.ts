import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

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
  participantCode: text("participant_code").notNull().default(""),
  recordKind: text("record_kind").notNull().default("legacy"),
  familiarity: text("familiarity").notNull().default("unknown"),
  assignment: text("assignment").notNull().default("manual"),
  outcome: text("outcome").notNull().default("started"),
  easeRating: integer("ease_rating"),
  observation: text("observation").notNull().default(""),
}, table => [uniqueIndex("actual_participant_once").on(table.snapshotId, table.participantCode).where(sql`record_kind = 'actual'`)]);

export const projects = sqliteTable("cx_projects", {
  caseKey: text("case_key").primaryKey().references(() => cases.caseKey),
  dataJson: text("data_json").notNull().default("{}"),
  revision: integer("revision").notNull().default(0),
  updatedAt: text("updated_at").notNull(),
});

export const projectHistory = sqliteTable("cx_project_history", {
  id: integer("id").primaryKey({autoIncrement:true}),
  caseKey: text("case_key").notNull().references(() => cases.caseKey),
  revision: integer("revision").notNull(),
  dataJson: text("data_json").notNull(),
  savedAt: text("saved_at").notNull(),
}, table => [uniqueIndex("project_revision_unique").on(table.caseKey, table.revision)]);
