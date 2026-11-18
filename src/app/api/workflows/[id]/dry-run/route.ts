import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { jsonError, sameOrigin } from "@/lib/http";
import { dryRunDraft } from "@/lib/workflows/author";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  idempotencyKey: z.string().regex(/^[A-Za-z0-9_-]{16,80}$/),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(request)) return jsonError(403, "forbidden", "Open Ripple in this browser to dry-run a draft.");
  const { id } = await context.params;
  const user = await readSessionUser(getDb());
  if (!user) return jsonError(404, "not_found", "That draft is not available.");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(422, "validation", "The dry-run request was not valid JSON.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(422, "validation", "The dry-run key is missing.");
  const result = dryRunDraft(getDb(), id, user.id, parsed.data.idempotencyKey);
  if (!result.ok) return Response.json({ error: result.error, run: "run" in result ? result.run : undefined }, { status: result.status });
  return Response.json({ run: result.run });
}
