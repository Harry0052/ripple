import { randomUUID } from "node:crypto";
import { and, eq, gte } from "drizzle-orm";
import type { RippleDb } from "@/lib/db/client";
import { auditEvents, metricEvents } from "@/lib/db/schema";

const hiddenKeys = new Set(["password", "passwordHash", "inputs", "token", "authorization"]);

export function logEvent(level: "info" | "error", event: string, fields: Record<string, unknown> = {}) {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (hiddenKeys.has(key)) continue;
    safe[key] = value;
  }
  const line = JSON.stringify({ level, event, at: new Date().toISOString(), ...safe });
  if (level === "error") console.error(line);
  else console.info(line);
}

export function recordAudit(
  db: RippleDb,
  event: { actorId: string | null; action: string; entityType: string; entityId: string; metadata?: Record<string, string> },
) {
  db.insert(auditEvents)
    .values({
      id: randomUUID(),
      actorId: event.actorId,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      metadataJson: JSON.stringify(event.metadata ?? {}),
      createdAt: new Date().toISOString(),
    })
    .run();
}

export function recordRunCompleted(db: RippleDb, event: { userId: string; runId: string }) {
  db.insert(metricEvents)
    .values({
      id: randomUUID(),
      userId: event.userId,
      name: "run_completed",
      workflowId: null,
      runId: event.runId,
      createdAt: new Date().toISOString(),
    })
    .run();
}

export function completedRunCount(db: RippleDb, userId: string, sinceIso?: string) {
  const filters = [eq(metricEvents.userId, userId), eq(metricEvents.name, "run_completed")];
  if (sinceIso) filters.push(gte(metricEvents.createdAt, sinceIso));
  return db
    .select({ id: metricEvents.id })
    .from(metricEvents)
    .where(and(...filters))
    .all().length;
}

export function completedRunsInRecentDays(db: RippleDb, userId: string, days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  return completedRunCount(db, userId, since);
}
