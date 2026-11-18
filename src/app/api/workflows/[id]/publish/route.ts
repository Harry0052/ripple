import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { jsonError, sameOrigin } from "@/lib/http";
import { publishDraft } from "@/lib/workflows/author";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return jsonError(403, "forbidden", "Open Ripple in this browser to publish.");
  const { id } = await context.params;
  const user = await readSessionUser(getDb());
  if (!user) return jsonError(404, "not_found", "That draft is not available.");
  const result = publishDraft(getDb(), id, user.id);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ version: result.version, slug: result.slug });
}
