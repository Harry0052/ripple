import { signup } from "@/lib/auth/accounts";
import { getDb } from "@/lib/db/client";
import { jsonError, requestIsSecure, sameOrigin } from "@/lib/http";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().max(120),
  password: z.string().max(72),
  handle: z.string().max(24),
  displayName: z.string().max(40),
});

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError(403, "forbidden", "Open Ripple in this browser to create an account.");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(422, "validation", "The account request was not valid JSON.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(422, "validation", "Check the account fields.");
  const result = await signup(getDb(), parsed.data, requestIsSecure(request));
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ user: { id: result.user.id, handle: result.user.handle, displayName: result.user.displayName } });
}
