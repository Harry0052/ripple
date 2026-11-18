import { createHash, randomUUID } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import type { RippleDb } from "@/lib/db/client";
import { users, workflowSteps, workflowVersions, workflows } from "@/lib/db/schema";
import { recordAudit } from "@/lib/observability";
import { dryRunVersion } from "@/lib/runs/service";
import { DEFAULT_DRAFT, draftSchema, type DraftInput } from "./draft";
import { stepSchema, type WorkflowStep } from "./steps";

export type ServiceError = {
  ok: false;
  status: number;
  error: { code: string; message: string; fields?: Record<string, string> };
};

function fail(status: number, code: string, message: string, fields?: Record<string, string>): ServiceError {
  return { ok: false, status, error: { code, message, fields } };
}

function nowIso() {
  return new Date().toISOString();
}

export function definitionHash(steps: WorkflowStep[], sampleInputs: Record<string, string>) {
  return createHash("sha256").update(JSON.stringify({ steps, sampleInputs })).digest("hex");
}

function member(db: RippleDb, userId: string) {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user || user.kind !== "member") return null;
  return user;
}

function slugify(title: string, id: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${base || "recipe"}-${id.slice(0, 6)}`;
}

function readSteps(db: RippleDb, versionId: string): WorkflowStep[] | null {
  const rows = db
    .select()
    .from(workflowSteps)
    .where(eq(workflowSteps.versionId, versionId))
    .orderBy(asc(workflowSteps.ordinal))
    .all();
  const steps: WorkflowStep[] = [];
  for (const row of rows) {
    const parsed = stepSchema.safeParse(JSON.parse(row.configJson));
    if (!parsed.success) return null;
    steps.push(parsed.data);
  }
  return steps;
}

function replaceSteps(db: RippleDb, versionId: string, steps: WorkflowStep[]) {
  db.delete(workflowSteps).where(eq(workflowSteps.versionId, versionId)).run();
  steps.forEach((step, index) => {
    db.insert(workflowSteps)
      .values({
        id: randomUUID(),
        versionId,
        ordinal: index + 1,
        stepType: step.type,
        title: step.title,
        configJson: JSON.stringify(step),
      })
      .run();
  });
}

export function listOwnedWorkflows(db: RippleDb, userId: string) {
  return db
    .select({
      id: workflows.id,
      slug: workflows.slug,
      title: workflows.title,
      visibility: workflows.visibility,
      publishedVersionId: workflows.publishedVersionId,
      draftVersionId: workflows.draftVersionId,
      updatedAt: workflows.updatedAt,
    })
    .from(workflows)
    .where(eq(workflows.ownerId, userId))
    .orderBy(desc(workflows.updatedAt))
    .all();
}

export type OwnedWorkflow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  estimatedMinutes: number;
  visibility: string;
  publishedVersion: number | null;
  draft: (DraftInput & { id: string; version: number; readyToPublish: boolean }) | null;
};

export function getOwnedWorkflow(db: RippleDb, workflowId: string, userId: string): OwnedWorkflow | null {
  const workflow = db.select().from(workflows).where(eq(workflows.id, workflowId)).get();
  if (!workflow || workflow.ownerId !== userId) return null;
  const published = workflow.publishedVersionId
    ? db.select().from(workflowVersions).where(eq(workflowVersions.id, workflow.publishedVersionId)).get()
    : null;
  const draft = workflow.draftVersionId
    ? db.select().from(workflowVersions).where(eq(workflowVersions.id, workflow.draftVersionId)).get()
    : null;
  if (draft && draft.status !== "draft") return null;
  const steps = draft ? readSteps(db, draft.id) : null;
  let draftView: OwnedWorkflow["draft"] = null;
  if (draft && steps) {
    const sampleInputs = JSON.parse(draft.sampleInputsJson) as Record<string, string>;
    const input: DraftInput = {
      title: workflow.title,
      summary: workflow.summary,
      category: workflow.category as DraftInput["category"],
      estimatedMinutes: workflow.estimatedMinutes,
      visibility: (draft.intendedVisibility === "public" ? "public" : "private") as DraftInput["visibility"],
      sampleInputs,
      steps,
    };
    draftView = {
      ...input,
      id: draft.id,
      version: draft.version,
      readyToPublish: draft.definitionHash === definitionHash(steps, sampleInputs) && draft.definitionHash !== null,
    };
  }
  return {
    id: workflow.id,
    slug: workflow.slug,
    title: workflow.title,
    summary: workflow.summary,
    category: workflow.category,
    estimatedMinutes: workflow.estimatedMinutes,
    visibility: workflow.visibility,
    publishedVersion: published?.version ?? null,
    draft: draftView,
  };
}

export function createDraft(db: RippleDb, userId: string) {
  if (!member(db, userId)) return fail(403, "forbidden", "Publishing needs an account. A guest session cannot save a draft.");
  const id = randomUUID();
  const versionId = randomUUID();
  const now = nowIso();
  const draft = DEFAULT_DRAFT;
  db.transaction((tx) => {
    tx.insert(workflows)
      .values({
        id,
        ownerId: userId,
        slug: slugify(draft.title, id),
        title: draft.title,
        summary: draft.summary,
        category: draft.category,
        visibility: "private",
        estimatedMinutes: draft.estimatedMinutes,
        origin: "user",
        publishedVersionId: null,
        draftVersionId: versionId,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    tx.insert(workflowVersions)
      .values({
        id: versionId,
        workflowId: id,
        version: 1,
        status: "draft",
        permissionsJson: JSON.stringify({ items: ["Described by the blocks in this draft"] }),
        prerequisites: "The values named in the input blocks.",
        successCriteria: "Every block finishes without an error.",
        risks: "Ripple only runs the blocks in this draft. It does not contact other services.",
        testStatus: "untested",
        publishedAt: null,
        lastVerifiedAt: null,
        definitionHash: null,
        sampleInputsJson: JSON.stringify(draft.sampleInputs),
        intendedVisibility: draft.visibility,
        createdAt: now,
      })
      .run();
    replaceSteps(tx, versionId, draft.steps);
  });
  return { ok: true as const, id };
}

export function updateDraft(db: RippleDb, workflowId: string, userId: string, input: unknown) {
  if (!member(db, userId)) return fail(403, "forbidden", "Publishing needs an account.");
  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) {
    return fail(422, "validation", "The draft does not match the blocks Ripple can store.");
  }
  const workflow = db.select().from(workflows).where(eq(workflows.id, workflowId)).get();
  if (!workflow || workflow.ownerId !== userId || !workflow.draftVersionId) {
    return fail(404, "not_found", "That draft is not available.");
  }
  const version = db.select().from(workflowVersions).where(eq(workflowVersions.id, workflow.draftVersionId)).get();
  if (!version || version.status !== "draft") {
    return fail(409, "immutable", "A published version cannot be changed.");
  }
  const now = nowIso();
  db.transaction((tx) => {
    tx.update(workflows)
      .set({
        title: parsed.data.title,
        summary: parsed.data.summary,
        category: parsed.data.category,
        estimatedMinutes: parsed.data.estimatedMinutes,
        updatedAt: now,
      })
      .where(eq(workflows.id, workflowId))
      .run();
    tx.update(workflowVersions)
      .set({
        sampleInputsJson: JSON.stringify(parsed.data.sampleInputs),
        intendedVisibility: parsed.data.visibility,
        definitionHash: null,
        testStatus: "untested",
      })
      .where(eq(workflowVersions.id, version.id))
      .run();
    replaceSteps(tx, version.id, parsed.data.steps);
  });
  return { ok: true as const, id: workflowId };
}

function permissionsFor(steps: WorkflowStep[]) {
  const items = ["Runs only the blocks saved in this version"];
  if (steps.some((step) => step.type === "input")) items.push("Uses the values you type for this run");
  if (steps.some((step) => step.type === "calculate" || step.type === "transform")) {
    items.push("Calculates and reformats on Ripple's server");
  }
  if (steps.some((step) => step.type === "demo_form")) {
    items.push("Can save named fields on Ripple after a separate approval");
  }
  items.push("Does not contact another service");
  return items;
}

export function dryRunDraft(db: RippleDb, workflowId: string, userId: string, idempotencyKey: string) {
  const owned = getOwnedWorkflow(db, workflowId, userId);
  if (!owned?.draft) return fail(404, "not_found", "That draft is not available.");
  const before = definitionHash(owned.draft.steps, owned.draft.sampleInputs);
  const result = dryRunVersion(db, {
    userId,
    versionId: owned.draft.id,
    inputs: owned.draft.sampleInputs,
    idempotencyKey,
  });
  if (!result.ok) return result;
  if (result.data.status !== "succeeded") {
    return {
      ok: false as const,
      status: 422,
      error: {
        code: "dry_run_failed",
        message: "The dry run did not succeed. Fix the draft before publishing.",
      },
      run: result.data,
    };
  }
  const after = getOwnedWorkflow(db, workflowId, userId);
  if (!after?.draft || definitionHash(after.draft.steps, after.draft.sampleInputs) !== before) {
    return fail(409, "conflict", "The draft changed during the dry run. Run it again.");
  }
  db.update(workflowVersions)
    .set({ definitionHash: before })
    .where(and(eq(workflowVersions.id, owned.draft.id), eq(workflowVersions.status, "draft")))
    .run();
  return { ok: true as const, run: result.data };
}

export function publishDraft(db: RippleDb, workflowId: string, userId: string) {
  if (!member(db, userId)) return fail(403, "forbidden", "Publishing needs an account.");
  const owned = getOwnedWorkflow(db, workflowId, userId);
  if (!owned?.draft) return fail(404, "not_found", "That draft is not available.");
  const hash = definitionHash(owned.draft.steps, owned.draft.sampleInputs);
  const version = db.select().from(workflowVersions).where(eq(workflowVersions.id, owned.draft.id)).get();
  if (!version || version.status !== "draft") return fail(409, "immutable", "A published version cannot be changed.");
  if (version.definitionHash !== hash) {
    return fail(409, "dry_run_required", "Dry-run this version again before publishing.");
  }
  const now = nowIso();
  db.transaction((tx) => {
    tx.update(workflowVersions)
      .set({
        status: "published",
        publishedAt: now,
        testStatus: "passed",
        permissionsJson: JSON.stringify({ items: permissionsFor(owned.draft!.steps) }),
      })
      .where(and(eq(workflowVersions.id, version.id), eq(workflowVersions.status, "draft")))
      .run();
    tx.update(workflows)
      .set({
        publishedVersionId: version.id,
        draftVersionId: null,
        visibility: owned.draft!.visibility,
        updatedAt: now,
      })
      .where(eq(workflows.id, workflowId))
      .run();
  });
  recordAudit(db, {
    actorId: userId,
    action: "workflow_published",
    entityType: "workflow_version",
    entityId: version.id,
    metadata: { version: String(version.version), visibility: owned.draft.visibility },
  });
  return { ok: true as const, version: version.version, slug: owned.slug };
}

export function forkDraft(db: RippleDb, workflowId: string, userId: string) {
  if (!member(db, userId)) return fail(403, "forbidden", "Publishing needs an account.");
  const workflow = db.select().from(workflows).where(eq(workflows.id, workflowId)).get();
  if (!workflow || workflow.ownerId !== userId) return fail(404, "not_found", "That recipe is not available.");
  if (workflow.draftVersionId) {
    const existing = db.select().from(workflowVersions).where(eq(workflowVersions.id, workflow.draftVersionId)).get();
    if (existing?.status === "draft") return { ok: true as const, versionId: existing.id, version: existing.version };
  }
  if (!workflow.publishedVersionId) return fail(409, "invalid_state", "Publish a version before editing the next one.");
  const published = db.select().from(workflowVersions).where(eq(workflowVersions.id, workflow.publishedVersionId)).get();
  const steps = published ? readSteps(db, published.id) : null;
  if (!published || !steps) return fail(422, "unreadable", "The published version could not be copied.");
  const versionId = randomUUID();
  const now = nowIso();
  db.transaction((tx) => {
    tx.insert(workflowVersions)
      .values({
        id: versionId,
        workflowId,
        version: published.version + 1,
        status: "draft",
        permissionsJson: published.permissionsJson,
        prerequisites: published.prerequisites,
        successCriteria: published.successCriteria,
        risks: published.risks,
        testStatus: "untested",
        publishedAt: null,
        lastVerifiedAt: null,
        definitionHash: null,
        sampleInputsJson: published.sampleInputsJson,
        intendedVisibility: workflow.visibility,
        createdAt: now,
      })
      .run();
    replaceSteps(tx, versionId, steps);
    tx.update(workflows).set({ draftVersionId: versionId, updatedAt: now }).where(eq(workflows.id, workflowId)).run();
  });
  return { ok: true as const, versionId, version: published.version + 1 };
}
