import { and, count, desc, eq, isNotNull, or, sql } from "drizzle-orm";
import { isCategoryId } from "@/lib/categories";
import type { RippleDb } from "@/lib/db/client";
import { users, workflowVersions, workflows } from "@/lib/db/schema";
import { permissionsSchema } from "@/lib/workflows/steps";
import { verifiedLabel } from "@/lib/time";

export type ExploreCard = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  estimatedMinutes: number;
  origin: string;
  creatorHandle: string;
  creatorName: string;
  updatedAt: string;
  version: number;
  permissions: string[];
  permissionNote: string | null;
  verified: string;
};

export type ExploreStatus = "results" | "empty-library" | "empty-search" | "unknown-category";

export type ExploreResult = {
  status: ExploreStatus;
  workflows: ExploreCard[];
  query: string;
  category: string;
  publishedCount: number;
};

function likePattern(term: string) {
  const escaped = term.replace(/[\\%_]/g, (character) => `\\${character}`);
  return `%${escaped}%`;
}

const published = and(eq(workflows.visibility, "public"), isNotNull(workflows.publishedVersionId));

export function listPublishedWorkflows(
  db: RippleDb,
  input: { query?: string; category?: string },
): ExploreResult {
  const query = (input.query ?? "").trim();
  const category = (input.category ?? "").trim() || "all";

  const publishedCount =
    db.select({ value: count() }).from(workflows).where(published).get()?.value ?? 0;

  if (category !== "all" && !isCategoryId(category)) {
    return { status: "unknown-category", workflows: [], query, category, publishedCount };
  }

  const filters = [published];
  if (category !== "all") {
    filters.push(eq(workflows.category, category));
  }
  if (query) {
    const pattern = likePattern(query);
    const matches = or(
      sql`${workflows.title} LIKE ${pattern} ESCAPE '\\'`,
      sql`${workflows.summary} LIKE ${pattern} ESCAPE '\\'`,
    );
    if (matches) filters.push(matches);
  }

  const rows = db
    .select({
      id: workflows.id,
      slug: workflows.slug,
      title: workflows.title,
      summary: workflows.summary,
      category: workflows.category,
      estimatedMinutes: workflows.estimatedMinutes,
      origin: workflows.origin,
      creatorHandle: users.handle,
      creatorName: users.displayName,
      updatedAt: workflows.updatedAt,
      version: workflowVersions.version,
      permissionsJson: workflowVersions.permissionsJson,
      lastVerifiedAt: workflowVersions.lastVerifiedAt,
    })
    .from(workflows)
    .innerJoin(users, eq(users.id, workflows.ownerId))
    .innerJoin(workflowVersions, eq(workflowVersions.id, workflows.publishedVersionId))
    .where(and(...filters))
    .orderBy(desc(workflows.updatedAt))
    .all()
    .map((row) => {
      let permissions: string[] = [];
      let permissionNote: string | null = null;
      try {
        const parsed = permissionsSchema.safeParse(JSON.parse(row.permissionsJson));
        if (parsed.success) permissions = parsed.data.items;
        else permissionNote = "Permissions could not be read";
      } catch {
        permissionNote = "Permissions could not be read";
      }
      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        summary: row.summary,
        category: row.category,
        estimatedMinutes: row.estimatedMinutes,
        origin: row.origin,
        creatorHandle: row.creatorHandle,
        creatorName: row.creatorName,
        updatedAt: row.updatedAt,
        version: row.version,
        permissions,
        permissionNote,
        verified: verifiedLabel(row.lastVerifiedAt),
      };
    });

  if (rows.length > 0) {
    return { status: "results", workflows: rows, query, category, publishedCount };
  }

  if (publishedCount === 0 && !query && category === "all") {
    return { status: "empty-library", workflows: [], query, category, publishedCount };
  }

  return { status: "empty-search", workflows: [], query, category, publishedCount };
}
