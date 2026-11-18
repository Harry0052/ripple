import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
