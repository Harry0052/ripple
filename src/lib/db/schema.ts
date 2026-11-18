import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  handle: text("handle").notNull().unique(),
  displayName: text("display_name").notNull(),
  kind: text("kind").notNull(),
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
