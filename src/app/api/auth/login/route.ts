import { login } from "@/lib/auth/accounts";
import { getDb } from "@/lib/db/client";
import { jsonError, requestIsSecure, sameOrigin } from "@/lib/http";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().max(120),
  password: z.string().max(72),
});

export async function POST(request: Request) {
  if (!sameOrigin(request)) return jsonError(403, "forbidden", "Open Ripple in this browser to log in.");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(422, "validation", "The login request was not valid JSON.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(422, "validation", "Check the email and password.");
  const result = await login(getDb(), parsed.data.email, parsed.data.password, requestIsSecure(request));
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ user: { id: result.user.id, handle: result.user.handle } });
}
