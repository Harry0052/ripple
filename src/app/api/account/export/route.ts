import { readSessionUser } from "@/lib/auth/session";
import { exportAccount } from "@/lib/account/privacy";
import { getDb } from "@/lib/db/client";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = getDb();
  const user = await readSessionUser(db);
  if (!user) return jsonError(401, "unauthorized", "There is no session to export.");
  const data = exportAccount(db, user.id);
  if (!data) return jsonError(404, "not_found", "The session user is not in this database.");
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": "attachment; filename=\"ripple-export.json\"",
    },
  });
}
