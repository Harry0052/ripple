import { getOrCreateGuest, readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { jsonError, requestIsSecure, sameOrigin } from "@/lib/http";
import { assessRun, listRuns, startRun } from "@/lib/runs/service";
import { runRequestSchema } from "@/lib/validators/runs";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await readSessionUser(getDb());
  if (!user) return Response.json({ runs: [] });
  return Response.json({ runs: listRuns(getDb(), user.id) });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return jsonError(403, "forbidden", "Open Ripple in this browser to run a recipe.");
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(422, "validation", "The run request was not valid JSON.");
  }
  const parsed = runRequestSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "validation", "Check the recipe, values, and submit key.");
  }
  const db = getDb();
  const assessed = assessRun(db, parsed.data);
  if (!assessed.ok) return Response.json({ error: assessed.error }, { status: assessed.status });
  const user = await getOrCreateGuest(db, { secure: requestIsSecure(request) });
  const result = startRun(db, { userId: user.id, ...parsed.data });
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ run: result.data });
}
