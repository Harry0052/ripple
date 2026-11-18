import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  handle: text("handle").notNull().unique(),
  displayName: text("display_name").notNull(),
  kind: text("kind").notNull(),
  email: text("email"),
  passwordHash: text("password_hash"),
  createdAt: text("created_at").notNull(),
});

export const workflows = sqliteTable(
  "workflows",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    category: text("category").notNull(),
    visibility: text("visibility").notNull(),
    estimatedMinutes: integer("estimated_minutes").notNull(),
    origin: text("origin").notNull(),
    publishedVersionId: text("published_version_id"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("workflows_explore_idx").on(table.visibility, table.category, table.updatedAt)],
);

export const workflowVersions = sqliteTable(
  "workflow_versions",
  {
    id: text("id").primaryKey(),
    workflowId: text("workflow_id")
      .notNull()
      .references(() => workflows.id),
    version: integer("version").notNull(),
    status: text("status").notNull(),
    permissionsJson: text("permissions_json").notNull(),
    prerequisites: text("prerequisites").notNull(),
    successCriteria: text("success_criteria").notNull(),
    risks: text("risks").notNull(),
    testStatus: text("test_status").notNull(),
    publishedAt: text("published_at"),
    lastVerifiedAt: text("last_verified_at"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("workflow_versions_workflow_version").on(table.workflowId, table.version),
    index("workflow_versions_workflow_idx").on(table.workflowId),
  ],
);

export const workflowSteps = sqliteTable(
  "workflow_steps",
  {
    id: text("id").primaryKey(),
    versionId: text("version_id")
      .notNull()
      .references(() => workflowVersions.id),
    ordinal: integer("ordinal").notNull(),
    stepType: text("step_type").notNull(),
    title: text("title").notNull(),
    configJson: text("config_json").notNull(),
  },
  (table) => [
    uniqueIndex("workflow_steps_version_ordinal").on(table.versionId, table.ordinal),
    index("workflow_steps_version_idx").on(table.versionId),
  ],
);

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
});

export const runs = sqliteTable("runs", {
  id: text("id").primaryKey(),
  versionId: text("version_id")
    .notNull()
    .references(() => workflowVersions.id),
  initiatedBy: text("initiated_by")
    .notNull()
    .references(() => users.id),
  status: text("status").notNull(),
  purpose: text("purpose").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  inputHash: text("input_hash").notNull(),
  inputsJson: text("inputs_json").notNull(),
  contextJson: text("context_json").notNull(),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
  cancelledAt: text("cancelled_at"),
});

export const runSteps = sqliteTable("run_steps", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .notNull()
    .references(() => runs.id),
  stepId: text("step_id")
    .notNull()
    .references(() => workflowSteps.id),
  status: text("status").notNull(),
  safeResultJson: text("safe_result_json"),
  error: text("error"),
  attempt: integer("attempt").notNull(),
  startedAt: text("started_at"),
  finishedAt: text("finished_at"),
});

export const approvals = sqliteTable("approvals", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .notNull()
    .references(() => runs.id),
  stepId: text("step_id").notNull(),
  actorId: text("actor_id")
    .notNull()
    .references(() => users.id),
  decision: text("decision").notNull(),
  consentText: text("consent_text").notNull(),
  createdAt: text("created_at").notNull(),
});

export const demoSubmissions = sqliteTable("demo_submissions", {
  id: text("id").primaryKey(),
  runId: text("run_id")
    .notNull()
    .unique()
    .references(() => runs.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  payloadJson: text("payload_json").notNull(),
  createdAt: text("created_at").notNull(),
});
