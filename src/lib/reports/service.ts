import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { RippleDb } from "@/lib/db/client";
import { reports, workflows } from "@/lib/db/schema";
import { consumeRateLimit, LIMITS } from "@/lib/security/rate-limit";

const reasons = ["misleading", "unsafe", "spam", "other"] as const;
export type ReportReason = (typeof reasons)[number];

export function fileReport(
  db: RippleDb,
  input: { workflowId: string; reporterId: string; reason: string; details?: string },
) {
  if (!reasons.includes(input.reason as ReportReason)) {
    return { ok: false as const, status: 422, error: { code: "validation", message: "Choose a report reason." } };
  }
  const details = input.details?.trim() ?? "";
  if (details.length > 500) {
    return { ok: false as const, status: 422, error: { code: "validation", message: "Keep the details under 500 characters." } };
  }
  const workflow = db
    .select({ id: workflows.id, visibility: workflows.visibility, publishedVersionId: workflows.publishedVersionId })
    .from(workflows)
    .where(eq(workflows.id, input.workflowId))
    .get();
  if (!workflow || workflow.visibility !== "public" || !workflow.publishedVersionId) {
    return { ok: false as const, status: 404, error: { code: "not_found", message: "That public recipe is not available to report." } };
  }
  if (!consumeRateLimit(db, `report:${input.reporterId}`, LIMITS.report.limit, LIMITS.report.windowMs)) {
    return {
      ok: false as const,
      status: 429,
      error: { code: "rate_limited", message: "Too many reports from this session. Nothing else was stored." },
    };
  }
  db.insert(reports)
    .values({
      id: randomUUID(),
      workflowId: workflow.id,
      reporterId: input.reporterId,
      reason: input.reason,
      details: details || null,
      createdAt: new Date().toISOString(),
    })
    .run();
  return { ok: true as const };
}
