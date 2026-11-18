import { and, asc, eq, sql } from "drizzle-orm";
import type { RippleDb } from "@/lib/db/client";
import { users, workflowSteps, workflowVersions, workflows } from "@/lib/db/schema";
import { formatUtc, verifiedLabel } from "@/lib/time";
import { describeStep } from "./describe";
import { stepSchema, permissionsSchema, type WorkflowStep } from "./steps";

const slugSchema = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type PublicWorkflow = {
  status: "ok";
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  estimatedMinutes: number;
  origin: string;
  visibility: string;
  creatorHandle: string;
  creatorName: string;
  versionId: string;
  version: number;
  publishedAt: string | null;
  publishedLabel: string | null;
  verified: string;
  prerequisites: string;
  successCriteria: string;
  risks: string;
  permissions: string[];
  steps: Array<WorkflowStep & { id: string; ordinal: number; lines: string[] }>;
};

export type WorkflowRead =
  | PublicWorkflow
  | { status: "not-found" }
  | { status: "unreadable"; title: string; slug: string };

export function getPublicWorkflow(db: RippleDb, slug: string, viewerId?: string | null): WorkflowRead {
  if (!slugSchema.test(slug) || slug.length > 80) return { status: "not-found" };

  const row = db
    .select({
      id: workflows.id,
      slug: workflows.slug,
      title: workflows.title,
      summary: workflows.summary,
      category: workflows.category,
      estimatedMinutes: workflows.estimatedMinutes,
      origin: workflows.origin,
      visibility: workflows.visibility,
      ownerId: workflows.ownerId,
      creatorHandle: users.handle,
      creatorName: users.displayName,
      versionId: workflowVersions.id,
      version: workflowVersions.version,
      versionStatus: workflowVersions.status,
      permissionsJson: workflowVersions.permissionsJson,
      prerequisites: workflowVersions.prerequisites,
      successCriteria: workflowVersions.successCriteria,
      risks: workflowVersions.risks,
      publishedAt: workflowVersions.publishedAt,
      lastVerifiedAt: sql<string | null>`(
        SELECT MAX(completed_at) FROM runs
        WHERE runs.version_id = ${workflowVersions.id}
          AND runs.status = 'succeeded'
          AND runs.purpose = 'user'
      )`,
    })
    .from(workflows)
    .innerJoin(users, eq(users.id, workflows.ownerId))
    .innerJoin(workflowVersions, eq(workflowVersions.id, workflows.publishedVersionId))
    .where(eq(workflows.slug, slug))
    .get();

  if (!row || row.versionStatus !== "published") return { status: "not-found" };
  const owner = viewerId != null && row.ownerId === viewerId;
  if (row.visibility !== "public" && !owner) {
    return { status: "not-found" };
  }

  let permissions: string[] = [];
  try {
    const parsedPermissions = permissionsSchema.safeParse(JSON.parse(row.permissionsJson));
    if (!parsedPermissions.success) return { status: "unreadable", title: row.title, slug: row.slug };
    permissions = parsedPermissions.data.items;
  } catch {
    return { status: "unreadable", title: row.title, slug: row.slug };
  }

  const storedSteps = db
    .select()
    .from(workflowSteps)
    .where(and(eq(workflowSteps.versionId, row.versionId)))
    .orderBy(asc(workflowSteps.ordinal))
    .all();

  const steps: PublicWorkflow["steps"] = [];
  for (const stored of storedSteps) {
    let config: unknown;
    try {
      config = JSON.parse(stored.configJson);
    } catch {
      return { status: "unreadable", title: row.title, slug: row.slug };
    }
    const parsed = stepSchema.safeParse(config);
    if (!parsed.success || parsed.data.type !== stored.stepType || parsed.data.title !== stored.title) {
      return { status: "unreadable", title: row.title, slug: row.slug };
    }
    steps.push({ ...parsed.data, id: stored.id, ordinal: stored.ordinal, lines: describeStep(parsed.data) });
  }

  if (steps.length === 0) return { status: "unreadable", title: row.title, slug: row.slug };

  return {
    status: "ok",
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    category: row.category,
    estimatedMinutes: row.estimatedMinutes,
origin: row.origin,
      visibility: row.visibility,
      creatorHandle: row.creatorHandle,
    creatorName: row.creatorName,
    versionId: row.versionId,
    version: row.version,
    publishedAt: row.publishedAt,
    publishedLabel: formatUtc(row.publishedAt),
    verified: verifiedLabel(row.lastVerifiedAt),
    prerequisites: row.prerequisites,
    successCriteria: row.successCriteria,
    risks: row.risks,
    permissions,
    steps,
  };
}
