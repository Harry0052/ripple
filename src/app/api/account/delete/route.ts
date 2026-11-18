import { deleteAccount } from "@/lib/account/privacy";
import { logout, readSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { jsonError, sameOrigin } from "@/lib/http";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({ confirm: z.literal(true) });

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError(403, "forbidden", "Open Ripple in this browser to delete data.");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(422, "validation", "Confirmation is required.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(422, "validation", "Confirm that you want the session data removed.");
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(401, "unauthorized", "There is no session to delete.");
  deleteAccount(db, user.id);
  await logout(db);
  return Response.json({ ok: true });
}
