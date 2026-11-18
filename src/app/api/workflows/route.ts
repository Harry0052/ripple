import { readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { jsonError, sameOrigin } from "@/lib/http";
import { createDraft, listOwnedWorkflows } from "@/lib/workflows/author";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await readSessionUser(getDb());
  if (!user || user.kind !== "member") return jsonError(403, "forbidden", "Publishing needs an account.");
  return Response.json({ workflows: listOwnedWorkflows(getDb(), user.id) });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError(403, "forbidden", "Open Ripple in this browser to create a draft.");
  const user = await readSessionUser(getDb());
  if (!user) return jsonError(403, "forbidden", "Publishing needs an account.");
  const result = createDraft(getDb(), user.id);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ id: result.id });
}
