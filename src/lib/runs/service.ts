import { createHash, randomUUID } from "node:crypto";
import Decimal from "decimal.js";
import { and, asc, desc, eq } from "drizzle-orm";
import type { RippleDb } from "@/lib/db/client";
import {
  approvals,
  demoSubmissions,
  runSteps,
  runs,
  users,
  workflowSteps,
  workflowVersions,
  workflows,
} from "@/lib/db/schema";
import { EngineError, evaluateExpression } from "@/lib/engine/expression";
import { applyTransform } from "@/lib/engine/transform";
import { consumeRateLimit, LIMITS } from "@/lib/security/rate-limit";
import { getPublicWorkflow } from "@/lib/workflows/detail";
import { stepSchema, type WorkflowStep } from "@/lib/workflows/steps";

export type ServiceError = {
  ok: false;
  status: number;
  error: { code: string; message: string; fields?: Record<string, string> };
};

export type RunStepView = {
  id: string;
  stepId: string;
  ordinal: number;
  title: string;
  type: string;
  status: string;
  attempt: number;
  error: string | null;
  safeResult: unknown;
};

export type RunView = {
  id: string;
  status: string;
  purpose: string;
  workflowTitle: string;
  workflowSlug: string;
  version: number;
  startedAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
  steps: RunStepView[];
  approvals: Array<{ stepId: string; decision: string; consentText: string; createdAt: string }>;
};

export type RunSummary = {
  id: string;
  status: string;
  workflowTitle: string;
  workflowSlug: string;
  startedAt: string;
  completedAt: string | null;
};

type Success<T> = { ok: true; data: T };

function fail(status: number, code: string, message: string, fields?: Record<string, string>): ServiceError {
  return { ok: false, status, error: { code, message, fields } };
}

function nowIso() {
  return new Date().toISOString();
}

function hashInputs(values: Record<string, string>) {
  const canonical = JSON.stringify(
    Object.keys(values)
      .sort()
      .map((key) => [key, values[key]]),
  );
  return createHash("sha256").update(canonical).digest("hex");
}

function isConstraint(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    String((error as { code: unknown }).code).includes("CONSTRAINT")
  );
}

export function validateWorkflowInputs(steps: WorkflowStep[], inputs: Record<string, string>) {
  const fields: Record<string, string> = {};
  const values: Record<string, string> = {};
  const allowed = new Set<string>();

  for (const step of steps) {
    if (step.type !== "input") continue;
    for (const field of step.fields) {
      allowed.add(field.key);
      const raw = inputs[field.key] ?? "";
      const value = field.type === "text" ? raw.trim() : raw.trim();
      if (field.required && value.length === 0) {
        fields[field.key] = "Enter a value.";
        continue;
      }
      if (value.length === 0) continue;
      if (field.type === "text") {
        if (field.maxLength && value.length > field.maxLength) {
          fields[field.key] = `Use at most ${field.maxLength} characters.`;
          continue;
        }
        values[field.key] = value;
        continue;
      }
      if (!/^-?\d+(?:\.\d+)?$/.test(value)) {
        fields[field.key] = "Enter a plain number.";
        continue;
      }
      const numeric = new Decimal(value);
      if (!numeric.isFinite()) {
        fields[field.key] = "Enter a plain number.";
        continue;
      }
      if (field.min !== undefined && numeric.lt(field.min)) {
        fields[field.key] = `Enter at least ${field.min}.`;
        continue;
      }
      if (field.max !== undefined && numeric.gt(field.max)) {
        fields[field.key] = `Enter at most ${field.max}.`;
        continue;
      }
      values[field.key] = value;
    }
  }

  const unexpected = Object.keys(inputs).filter((key) => !allowed.has(key) && inputs[key] !== "");
  if (unexpected.length > 0) {
    fields._form = "Remove fields this recipe does not ask for.";
  }

  return { values, fields };
}

function perform(
  tx: RippleDb,
  run: { id: string; initiatedBy: string },
  stepId: string,
  step: WorkflowStep,
  context: Record<string, string>,
): { pause: boolean; outputs: Record<string, string>; safe: Record<string, unknown> } {
  if (step.type === "input") {
    const shown: Record<string, string> = {};
    for (const field of step.fields) {
      const value = context[field.key];
      if (field.required && value === undefined) throw new EngineError(`Missing ${field.label}.`);
      if (value === undefined) continue;
      shown[field.key] = field.sensitive ? "[redacted]" : value;
    }
    return { pause: false, outputs: {}, safe: { fields: shown } };
  }

  if (step.type === "calculate") {
    const value = evaluateExpression(step.expression, context);
    return { pause: false, outputs: { [step.outputKey]: value }, safe: { [step.outputKey]: value } };
  }

  if (step.type === "transform") {
    const value = applyTransform(step.operation, context, {
      sourceKey: step.sourceKey,
      template: step.template,
      decimals: step.decimals,
    });
    if (value.length > 5000) throw new EngineError("The result is longer than Ripple will store.");
    return { pause: false, outputs: { [step.outputKey]: value }, safe: { [step.outputKey]: value } };
  }

  const approved = tx
    .select({ id: approvals.id })
    .from(approvals)
    .where(
      and(eq(approvals.runId, run.id), eq(approvals.stepId, stepId), eq(approvals.decision, "approve_effect")),
    )
    .get();
  const preview: Record<string, string> = {};
  for (const key of step.includeKeys) {
    if (context[key] === undefined) throw new EngineError(`Saving needs ${key}, which is not available.`);
    preview[key] = context[key];
  }
  if (!approved) {
    return { pause: true, outputs: {}, safe: { waitingFor: "approval", preview } };
  }
  const submissionId = randomUUID();
  const createdAt = nowIso();
  tx.insert(demoSubmissions)
    .values({
      id: submissionId,
      runId: run.id,
      userId: run.initiatedBy,
      title: step.formTitle,
      payloadJson: JSON.stringify(preview),
      createdAt,
    })
    .run();
  return {
    pause: false,
    outputs: { submissionId },
    safe: { submissionId, title: step.formTitle, preview },
  };
}

function execute(tx: RippleDb, runId: string) {
  const run = tx.select().from(runs).where(eq(runs.id, runId)).get();
  if (!run || run.status === "cancelled" || run.status === "succeeded") return;
  const context = JSON.parse(run.contextJson) as Record<string, string>;
  const rows = tx
    .select({ runStep: runSteps, stored: workflowSteps })
    .from(runSteps)
    .innerJoin(workflowSteps, eq(workflowSteps.id, runSteps.stepId))
    .where(eq(runSteps.runId, runId))
    .orderBy(asc(workflowSteps.ordinal))
    .all();

  for (const row of rows) {
    if (row.runStep.status === "succeeded" || row.runStep.status === "cancelled") continue;
    let parsed: ReturnType<typeof stepSchema.safeParse> | null = null;
    try {
      parsed = stepSchema.safeParse(JSON.parse(row.stored.configJson));
    } catch {
      parsed = null;
    }
    const attempt = row.runStep.status === "failed" ? row.runStep.attempt + 1 : row.runStep.attempt;
    const startedAt = row.runStep.startedAt ?? nowIso();
    if (!parsed?.success || parsed.data.type !== row.stored.stepType) {
      tx.update(runSteps)
        .set({
          status: "failed",
          error: "This step uses a block Ripple does not run.",
          attempt,
          startedAt,
          finishedAt: nowIso(),
        })
        .where(eq(runSteps.id, row.runStep.id))
        .run();
      tx.update(runs)
        .set({ status: "failed", contextJson: JSON.stringify(context), completedAt: nowIso() })
        .where(eq(runs.id, runId))
        .run();
      return;
    }

    tx.update(runSteps)
      .set({ status: "running", attempt, startedAt })
      .where(eq(runSteps.id, row.runStep.id))
      .run();

    try {
      const result = perform(tx, run, row.stored.id, parsed.data, context);
      if (result.pause) {
        tx.update(runSteps)
          .set({ status: "needs_approval", safeResultJson: JSON.stringify(result.safe), error: null })
          .where(eq(runSteps.id, row.runStep.id))
          .run();
        tx.update(runs)
          .set({ status: "needs_approval", contextJson: JSON.stringify(context) })
          .where(eq(runs.id, runId))
          .run();
        return;
      }
      Object.assign(context, result.outputs);
      tx.update(runSteps)
        .set({
          status: "succeeded",
          safeResultJson: JSON.stringify(result.safe),
          error: null,
          finishedAt: nowIso(),
        })
        .where(eq(runSteps.id, row.runStep.id))
        .run();
      tx.update(runs)
        .set({ status: "running", contextJson: JSON.stringify(context) })
        .where(eq(runs.id, runId))
        .run();
    } catch (error) {
      const message = error instanceof EngineError ? error.message : "This step failed.";
      tx.update(runSteps)
        .set({ status: "failed", error: message, finishedAt: nowIso() })
        .where(eq(runSteps.id, row.runStep.id))
        .run();
      tx.update(runs)
        .set({ status: "failed", contextJson: JSON.stringify(context), completedAt: nowIso() })
        .where(eq(runs.id, runId))
        .run();
      return;
    }
  }

  tx.update(runs)
    .set({ status: "succeeded", completedAt: nowIso(), contextJson: JSON.stringify(context) })
    .where(eq(runs.id, runId))
    .run();
}

export function getRun(db: RippleDb, runId: string, userId: string): RunView | null {
  const row = db
    .select({
      id: runs.id,
      status: runs.status,
      purpose: runs.purpose,
      initiatedBy: runs.initiatedBy,
      startedAt: runs.startedAt,
      completedAt: runs.completedAt,
      cancelledAt: runs.cancelledAt,
      workflowTitle: workflows.title,
      workflowSlug: workflows.slug,
      version: workflowVersions.version,
    })
    .from(runs)
    .innerJoin(workflowVersions, eq(workflowVersions.id, runs.versionId))
    .innerJoin(workflows, eq(workflows.id, workflowVersions.workflowId))
    .where(eq(runs.id, runId))
    .get();
  if (!row || row.initiatedBy !== userId) return null;

  const steps = db
    .select({
      id: runSteps.id,
      stepId: runSteps.stepId,
      status: runSteps.status,
      attempt: runSteps.attempt,
      error: runSteps.error,
      safeResultJson: runSteps.safeResultJson,
      ordinal: workflowSteps.ordinal,
      title: workflowSteps.title,
      type: workflowSteps.stepType,
    })
    .from(runSteps)
    .innerJoin(workflowSteps, eq(workflowSteps.id, runSteps.stepId))
    .where(eq(runSteps.runId, runId))
    .orderBy(asc(workflowSteps.ordinal))
    .all();

  const consentRows = db
    .select({
      stepId: approvals.stepId,
      decision: approvals.decision,
      consentText: approvals.consentText,
      createdAt: approvals.createdAt,
    })
    .from(approvals)
    .where(eq(approvals.runId, runId))
    .orderBy(asc(approvals.createdAt))
    .all();

  return {
    id: row.id,
    status: row.status,
    purpose: row.purpose,
    workflowTitle: row.workflowTitle,
    workflowSlug: row.workflowSlug,
    version: row.version,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    cancelledAt: row.cancelledAt,
    steps: steps.map((step) => ({
      id: step.id,
      stepId: step.stepId,
      ordinal: step.ordinal,
      title: step.title,
      type: step.type,
      status: step.status,
      attempt: step.attempt,
      error: step.error,
      safeResult: step.safeResultJson ? (JSON.parse(step.safeResultJson) as unknown) : null,
    })),
    approvals: consentRows,
  };
}

export function listRuns(db: RippleDb, userId: string): RunSummary[] {
  return db
    .select({
      id: runs.id,
      status: runs.status,
      workflowTitle: workflows.title,
      workflowSlug: workflows.slug,
      startedAt: runs.startedAt,
      completedAt: runs.completedAt,
    })
    .from(runs)
    .innerJoin(workflowVersions, eq(workflowVersions.id, runs.versionId))
    .innerJoin(workflows, eq(workflows.id, workflowVersions.workflowId))
    .where(eq(runs.initiatedBy, userId))
    .orderBy(desc(runs.startedAt))
    .all();
}

export function assessRun(
  db: RippleDb,
  input: { slug: string; inputs: Record<string, string>; consents: string[] },
  viewerId?: string | null,
): ServiceError | { ok: true } {
  const detail = getPublicWorkflow(db, input.slug, viewerId);
  if (detail.status === "not-found") return fail(404, "not_found", "That recipe is not available.");
  if (detail.status === "unreadable") {
    return fail(422, "unreadable", "This recipe uses a block Ripple does not run. Nothing started.");
  }
  const { fields } = validateWorkflowInputs(detail.steps, input.inputs);
  if (Object.keys(fields).length > 0) {
    return fail(422, "validation", "Fix the highlighted fields. Nothing started.", fields);
  }
  const stepIds = detail.steps.map((step) => step.id);
  const consented = new Set(input.consents);
  if (stepIds.some((id) => !consented.has(id)) || input.consents.some((id) => !stepIds.includes(id))) {
    return fail(422, "consent", "Allow every step before Ripple runs them. Nothing started.");
  }
  return { ok: true };
}

export function startRun(
  db: RippleDb,
  input: { userId: string; slug: string; inputs: Record<string, string>; consents: string[]; idempotencyKey: string },
): Success<RunView> | ServiceError {
  const assessed = assessRun(db, input, input.userId);
  if (!assessed.ok) return assessed;
  const detail = getPublicWorkflow(db, input.slug, input.userId);
  if (detail.status !== "ok") return fail(404, "not_found", "That recipe is not available.");
  const { values } = validateWorkflowInputs(detail.steps, input.inputs);
  const steps = detail.steps;

  const inputHash = hashInputs(values);
  const user = db.select({ id: users.id }).from(users).where(eq(users.id, input.userId)).get();
  if (!user) return fail(404, "not_found", "The session user is not in this database.");
  const existingRun = db
    .select({ id: runs.id, inputHash: runs.inputHash })
    .from(runs)
    .where(and(eq(runs.initiatedBy, input.userId), eq(runs.idempotencyKey, input.idempotencyKey)))
    .get();
  if (existingRun) {
    if (existingRun.inputHash !== inputHash) {
      return fail(409, "conflict", "That submit key was already used with different inputs. Nothing new started.");
    }
    const replay = getRun(db, existingRun.id, input.userId);
    if (replay) return { ok: true, data: replay };
  }
  if (!consumeRateLimit(db, `run:${input.userId}`, LIMITS.run.limit, LIMITS.run.windowMs)) {
    return fail(429, "rate_limited", "Too many runs from this session. Nothing started.");
  }

  let runId = "";
  try {
    runId = db.transaction((tx) => {
      const existing = tx
        .select({ id: runs.id, inputHash: runs.inputHash })
        .from(runs)
        .where(and(eq(runs.initiatedBy, input.userId), eq(runs.idempotencyKey, input.idempotencyKey)))
        .get();
      if (existing) {
        if (existing.inputHash !== inputHash) {
          throw Object.assign(new Error("idempotency conflict"), { code: "IDEMPOTENCY" });
        }
        return existing.id;
      }

      const id = randomUUID();
      const startedAt = nowIso();
      tx.insert(runs)
        .values({
          id,
          versionId: detail.versionId,
          initiatedBy: input.userId,
          status: "running",
          purpose: "user",
          idempotencyKey: input.idempotencyKey,
          inputHash,
          inputsJson: JSON.stringify(values),
          contextJson: JSON.stringify(values),
          startedAt,
          completedAt: null,
          cancelledAt: null,
        })
        .run();

      for (const step of steps) {
        tx.insert(runSteps)
          .values({
            id: randomUUID(),
            runId: id,
            stepId: step.id,
            status: "pending",
            safeResultJson: null,
            error: null,
            attempt: 1,
            startedAt: null,
            finishedAt: null,
          })
          .run();
        tx.insert(approvals)
          .values({
            id: randomUUID(),
            runId: id,
            stepId: step.id,
            actorId: input.userId,
            decision: "allow",
            consentText: `I allow “${step.title}” before Ripple runs it.`,
            createdAt: startedAt,
          })
          .run();
      }

      execute(tx, id);
      return id;
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "IDEMPOTENCY") {
      return fail(409, "conflict", "That submit key was already used with different inputs. Nothing new started.");
    }
    if (isConstraint(error)) {
      const existing = db
        .select({ id: runs.id, inputHash: runs.inputHash })
        .from(runs)
        .where(and(eq(runs.initiatedBy, input.userId), eq(runs.idempotencyKey, input.idempotencyKey)))
        .get();
      if (existing && existing.inputHash === inputHash) {
        const view = getRun(db, existing.id, input.userId);
        if (view) return { ok: true, data: view };
      }
      return fail(409, "conflict", "That submit was already used. Nothing new started.");
    }
    throw error;
  }

  const view = getRun(db, runId, input.userId);
  if (!view) return fail(404, "not_found", "The run could not be read back.");
  return { ok: true, data: view };
}

function ownedRun(db: RippleDb, runId: string, userId: string) {
  return db
    .select()
    .from(runs)
    .where(and(eq(runs.id, runId), eq(runs.initiatedBy, userId)))
    .get();
}

export function cancelRun(db: RippleDb, runId: string, userId: string): Success<RunView> | ServiceError {
  const run = ownedRun(db, runId, userId);
  if (!run) return fail(404, "not_found", "That run is not available.");
  if (run.status === "succeeded" || run.status === "failed" || run.status === "cancelled") {
    return fail(409, "invalid_state", "This run is already finished.");
  }
  const stamp = nowIso();
  db.transaction((tx) => {
    tx.update(runs)
      .set({ status: "cancelled", cancelledAt: stamp, completedAt: stamp })
      .where(eq(runs.id, runId))
      .run();
    tx.update(runSteps)
      .set({ status: "cancelled", finishedAt: stamp })
      .where(
        and(
          eq(runSteps.runId, runId),
          eq(runSteps.status, "pending"),
        ),
      )
      .run();
    for (const status of ["running", "needs_approval"] as const) {
      tx.update(runSteps)
        .set({ status: "cancelled", finishedAt: stamp })
        .where(and(eq(runSteps.runId, runId), eq(runSteps.status, status)))
        .run();
    }
  });
  const view = getRun(db, runId, userId);
  if (!view) return fail(404, "not_found", "That run is not available.");
  return { ok: true, data: view };
}

export function retryRun(db: RippleDb, runId: string, userId: string): Success<RunView> | ServiceError {
  const run = ownedRun(db, runId, userId);
  if (!run) return fail(404, "not_found", "That run is not available.");
  if (run.status !== "failed") return fail(409, "invalid_state", "Only a failed run can be retried.");
  db.transaction((tx) => {
    tx.update(runs).set({ status: "running", completedAt: null }).where(eq(runs.id, runId)).run();
    execute(tx, runId);
  });
  const view = getRun(db, runId, userId);
  if (!view) return fail(404, "not_found", "That run is not available.");
  return { ok: true, data: view };
}

export function approveEffect(
  db: RippleDb,
  runId: string,
  userId: string,
  stepId: string,
): Success<RunView> | ServiceError {
  const run = ownedRun(db, runId, userId);
  if (!run) return fail(404, "not_found", "That run is not available.");
  if (run.status !== "needs_approval") return fail(409, "invalid_state", "This run is not waiting for approval.");
  const waiting = db
    .select({ id: runSteps.id, stepId: runSteps.stepId })
    .from(runSteps)
    .where(and(eq(runSteps.runId, runId), eq(runSteps.stepId, stepId), eq(runSteps.status, "needs_approval")))
    .get();
  if (!waiting) return fail(409, "invalid_state", "That step is not waiting for approval.");
  const stored = db.select().from(workflowSteps).where(eq(workflowSteps.id, stepId)).get();
  db.transaction((tx) => {
    tx.insert(approvals)
      .values({
        id: randomUUID(),
        runId,
        stepId,
        actorId: userId,
        decision: "approve_effect",
        consentText: `I approve “${stored?.title ?? "this step"}” to save on Ripple.`,
        createdAt: nowIso(),
      })
      .run();
    execute(tx, runId);
  });
  const view = getRun(db, runId, userId);
  if (!view) return fail(404, "not_found", "That run is not available.");
  return { ok: true, data: view };
}

export function dryRunVersion(
  db: RippleDb,
  input: { userId: string; versionId: string; inputs: Record<string, string>; idempotencyKey: string },
): Success<RunView> | ServiceError {
  const version = db
    .select({ version: workflowVersions, ownerId: workflows.ownerId })
    .from(workflowVersions)
    .innerJoin(workflows, eq(workflows.id, workflowVersions.workflowId))
    .where(eq(workflowVersions.id, input.versionId))
    .get();
  if (!version || version.ownerId !== input.userId || version.version.status !== "draft") {
    return fail(404, "not_found", "That draft is not available to dry-run.");
  }
  const storedSteps = db
    .select()
    .from(workflowSteps)
    .where(eq(workflowSteps.versionId, input.versionId))
    .orderBy(asc(workflowSteps.ordinal))
    .all();
  const parsedSteps: WorkflowStep[] = [];
  for (const stored of storedSteps) {
    const parsed = stepSchema.safeParse(JSON.parse(stored.configJson));
    if (!parsed.success || parsed.data.type !== stored.stepType) {
      return fail(422, "unreadable", "This draft uses a block Ripple does not run. Nothing started.");
    }
    parsedSteps.push(parsed.data);
  }
  const { values, fields } = validateWorkflowInputs(parsedSteps, input.inputs);
  if (Object.keys(fields).length > 0) {
    return fail(422, "validation", "The sample inputs do not match the draft. Nothing started.", fields);
  }
  const inputHash = hashInputs(values);
  const existingDryRun = db
    .select({ id: runs.id, inputHash: runs.inputHash })
    .from(runs)
    .where(and(eq(runs.initiatedBy, input.userId), eq(runs.idempotencyKey, input.idempotencyKey)))
    .get();
  if (existingDryRun) {
    if (existingDryRun.inputHash !== inputHash) {
      return fail(409, "conflict", "That dry-run key was already used with different inputs.");
    }
    const replay = getRun(db, existingDryRun.id, input.userId);
    if (replay) return { ok: true, data: replay };
  }
  if (!consumeRateLimit(db, `dry:${input.userId}`, LIMITS.run.limit, LIMITS.run.windowMs)) {
    return fail(429, "rate_limited", "Too many dry runs from this session. Nothing started.");
  }
  let runId = "";
  try {
    runId = db.transaction((tx) => {
      const existing = tx
        .select({ id: runs.id, inputHash: runs.inputHash })
        .from(runs)
        .where(and(eq(runs.initiatedBy, input.userId), eq(runs.idempotencyKey, input.idempotencyKey)))
        .get();
      if (existing) return existing.id;
      const id = randomUUID();
      const startedAt = nowIso();
      tx.insert(runs)
        .values({
          id,
          versionId: input.versionId,
          initiatedBy: input.userId,
          status: "running",
          purpose: "dry_run",
          idempotencyKey: input.idempotencyKey,
          inputHash,
          inputsJson: JSON.stringify(values),
          contextJson: JSON.stringify(values),
          startedAt,
          completedAt: null,
          cancelledAt: null,
        })
        .run();
      for (const stored of storedSteps) {
        tx.insert(runSteps)
          .values({
            id: randomUUID(),
            runId: id,
            stepId: stored.id,
            status: "pending",
            safeResultJson: null,
            error: null,
            attempt: 1,
            startedAt: null,
            finishedAt: null,
          })
          .run();
        tx.insert(approvals)
          .values({
            id: randomUUID(),
            runId: id,
            stepId: stored.id,
            actorId: input.userId,
            decision: "allow",
            consentText: "Creator authorized this dry run.",
            createdAt: startedAt,
          })
          .run();
        if (stored.stepType === "demo_form") {
          tx.insert(approvals)
            .values({
              id: randomUUID(),
              runId: id,
              stepId: stored.id,
              actorId: input.userId,
              decision: "approve_effect",
              consentText: "Creator approved this dry-run save on Ripple.",
              createdAt: startedAt,
            })
            .run();
        }
      }
      execute(tx, id);
      return id;
    });
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "IDEMPOTENCY") {
      return fail(409, "conflict", "That dry-run key was already used with different inputs.");
    }
    throw error;
  }
  const view = getRun(db, runId, input.userId);
  if (!view) return fail(404, "not_found", "The dry run could not be read back.");
  return { ok: true, data: view };
}
