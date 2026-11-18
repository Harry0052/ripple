import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { jsonError, sameOrigin } from "@/lib/http";
import { getOwnedWorkflow, updateDraft } from "@/lib/workflows/author";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await readSessionUser(getDb());
  if (!user) return jsonError(404, "not_found", "That draft is not available.");
  const workflow = getOwnedWorkflow(getDb(), id, user.id);
  if (!workflow) return jsonError(404, "not_found", "That draft is not available.");
  return Response.json({ workflow });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return jsonError(403, "forbidden", "Open Ripple in this browser to save a draft.");
  const { id } = await context.params;
  const user = await readSessionUser(getDb());
  if (!user) return jsonError(404, "not_found", "That draft is not available.");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(422, "validation", "The draft was not valid JSON.");
  }
  const result = updateDraft(getDb(), id, user.id, body);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ id: result.id });
}
