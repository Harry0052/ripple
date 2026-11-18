import { getOrCreateGuest, readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { jsonError, requestIsSecure, sameOrigin } from "@/lib/http";
import { fileReport } from "@/lib/reports/service";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  workflowId: z.string().min(1).max(80),
  reason: z.enum(["misleading", "unsafe", "spam", "other"]),
  details: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError(403, "forbidden", "Open Ripple in this browser to report a recipe.");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(422, "validation", "The report was not valid JSON.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(422, "validation", "Choose a report reason.");
  const db = getDb();
  const user = (await readSessionUser(db)) ?? (await getOrCreateGuest(db, { secure: requestIsSecure(request) }));
  const result = fileReport(db, { ...parsed.data, reporterId: user.id });
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({
    ok: true,
    message: "Report stored on Ripple. It is not sent to an outside moderator.",
  });
}
