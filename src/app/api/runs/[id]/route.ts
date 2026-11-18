import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { jsonError } from "@/lib/http";
import { getRun } from "@/lib/runs/service";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await readSessionUser(getDb());
  if (!user) return jsonError(404, "not_found", "That run is not available.");
  const run = getRun(getDb(), id, user.id);
  if (!run) return jsonError(404, "not_found", "That run is not available.");
  return Response.json({ run });
}
