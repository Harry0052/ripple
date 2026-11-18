import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { jsonError, sameOrigin } from "@/lib/http";
import { approveEffect } from "@/lib/runs/service";
import { approvalRequestSchema } from "@/lib/validators/runs";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return jsonError(403, "forbidden", "Open Ripple in this browser to change a run.");
  const { id } = await context.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(422, "validation", "The approval was not valid JSON.");
  }
  const parsed = approvalRequestSchema.safeParse(body);
  if (!parsed.success) return jsonError(422, "validation", "Choose the step you are approving.");
  const user = await readSessionUser(getDb());
  if (!user) return jsonError(404, "not_found", "That run is not available.");
  const result = approveEffect(getDb(), id, user.id, parsed.data.stepId);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ run: result.data });
}
