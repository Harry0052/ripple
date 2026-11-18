import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { jsonError, sameOrigin } from "@/lib/http";
import { forkDraft } from "@/lib/workflows/author";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return jsonError(403, "forbidden", "Open Ripple in this browser to edit a version.");
  const { id } = await context.params;
  const user = await readSessionUser(getDb());
  if (!user) return jsonError(404, "not_found", "That recipe is not available.");
  const result = forkDraft(getDb(), id, user.id);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ versionId: result.versionId, version: result.version });
}
