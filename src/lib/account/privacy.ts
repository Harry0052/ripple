import { eq, inArray } from "drizzle-orm";
import type { RippleDb } from "@/lib/db/client";
import {
  approvals,
  demoSubmissions,
  metricEvents,
  reports,
  runSteps,
  runs,
  sessions,
  users,
  workflowSteps,
  workflowVersions,
  workflows,
} from "@/lib/db/schema";
import { recordAudit } from "@/lib/observability";

export function exportAccount(db: RippleDb, userId: string) {
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) return null;
  const owned = db.select().from(workflows).where(eq(workflows.ownerId, userId)).all();
  const ownedIds = owned.map((workflow) => workflow.id);
  const versions = ownedIds.length
    ? db.select().from(workflowVersions).where(inArray(workflowVersions.workflowId, ownedIds)).all()
    : [];
  const versionIds = versions.map((version) => version.id);
  const steps = versionIds.length
    ? db.select().from(workflowSteps).where(inArray(workflowSteps.versionId, versionIds)).all()
    : [];
  const myRuns = db.select().from(runs).where(eq(runs.initiatedBy, userId)).all();
  const runIds = myRuns.map((run) => run.id);
  return {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      handle: user.handle,
      displayName: user.displayName,
      kind: user.kind,
      email: user.email,
      createdAt: user.createdAt,
    },
    workflows: owned,
    versions,
    steps,
    runs: myRuns.map((run) => ({
      id: run.id,
      versionId: run.versionId,
      status: run.status,
      purpose: run.purpose,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      inputs: JSON.parse(run.inputsJson) as unknown,
    })),
    runSteps: runIds.length ? db.select().from(runSteps).where(inArray(runSteps.runId, runIds)).all() : [],
    approvals: runIds.length ? db.select().from(approvals).where(inArray(approvals.runId, runIds)).all() : [],
    reports: db.select().from(reports).where(eq(reports.reporterId, userId)).all(),
    metrics: db.select().from(metricEvents).where(eq(metricEvents.userId, userId)).all(),
  };
}

export function deleteAccount(db: RippleDb, userId: string) {
  const user = db.select({ id: users.id }).from(users).where(eq(users.id, userId)).get();
  if (!user) return false;
  const runIds = db.select({ id: runs.id }).from(runs).where(eq(runs.initiatedBy, userId)).all().map((run) => run.id);
  db.transaction((tx) => {
    if (runIds.length > 0) {
      tx.delete(demoSubmissions).where(inArray(demoSubmissions.runId, runIds)).run();
      tx.delete(approvals).where(inArray(approvals.runId, runIds)).run();
      tx.delete(runSteps).where(inArray(runSteps.runId, runIds)).run();
      tx.delete(runs).where(inArray(runs.id, runIds)).run();
    }
    tx.delete(demoSubmissions).where(eq(demoSubmissions.userId, userId)).run();
    tx.delete(approvals).where(eq(approvals.actorId, userId)).run();
    tx.delete(reports).where(eq(reports.reporterId, userId)).run();
    tx.delete(metricEvents).where(eq(metricEvents.userId, userId)).run();
    tx.delete(sessions).where(eq(sessions.userId, userId)).run();
    tx.update(workflows)
      .set({
        visibility: "private",
        draftVersionId: null,
        title: "Deleted recipe",
        summary: "The creator deleted their account.",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(workflows.ownerId, userId))
      .run();
    tx.update(users)
      .set({
        email: null,
        passwordHash: null,
        displayName: "Deleted account",
        handle: `deleted.${userId.replaceAll("-", "").slice(0, 16)}`,
        kind: "guest",
      })
      .where(eq(users.id, userId))
      .run();
  });
  recordAudit(db, {
    actorId: userId,
    action: "account_deleted",
    entityType: "user",
    entityId: userId,
    metadata: {},
  });
  return true;
}
