import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { RippleDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { recordAudit } from "@/lib/observability";
import { consumeRateLimit, LIMITS } from "@/lib/security/rate-limit";
import { hashPassword, verifyPassword } from "./password";
import { readSessionUser, replaceSession, type SessionUser } from "./session";

const handlePattern = /^[a-z0-9](?:[a-z0-9._]{1,22}[a-z0-9])$/;

export function validateAccount(input: {
  email: string;
  password: string;
  handle: string;
  displayName: string;
}) {
  const fields: Record<string, string> = {};
  const email = input.email.trim().toLowerCase();
  const handle = input.handle.trim().toLowerCase();
  const displayName = input.displayName.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) fields.email = "Enter a valid email.";
  if (input.password.length < 10 || input.password.length > 72) {
    fields.password = "Use 10 to 72 characters.";
  }
  if (!handlePattern.test(handle)) fields.handle = "Use 3–24 letters, numbers, dots, or underscores.";
  if (displayName.length < 1 || displayName.length > 40) fields.displayName = "Enter a name up to 40 characters.";
  return { email, handle, displayName, fields };
}

async function finishSession(db: RippleDb, userId: string, secure: boolean): Promise<SessionUser> {
  const row = db
    .select({
      id: users.id,
      handle: users.handle,
      displayName: users.displayName,
      kind: users.kind,
      email: users.email,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get();
  if (!row) throw new Error("Account disappeared before the session was saved.");
  await replaceSession(db, row.id, secure);
  return row;
}

export async function signup(
  db: RippleDb,
  input: { email: string; password: string; handle: string; displayName: string },
  secure: boolean,
) {
  const account = validateAccount(input);
  if (Object.keys(account.fields).length > 0) {
    return { ok: false as const, status: 422, error: { code: "validation", message: "Check the account fields.", fields: account.fields } };
  }
  if (!consumeRateLimit(db, `signup:${account.email}`, LIMITS.signup.limit, LIMITS.signup.windowMs)) {
    return { ok: false as const, status: 429, error: { code: "rate_limited", message: "Too many signup attempts. Nothing was created." } };
  }
  const emailTaken = db.select({ id: users.id }).from(users).where(eq(users.email, account.email)).get();
  if (emailTaken) {
    return { ok: false as const, status: 409, error: { code: "conflict", message: "That email already has an account." } };
  }
  const handleTaken = db.select({ id: users.id }).from(users).where(eq(users.handle, account.handle)).get();
  const current = await readSessionUser(db);
  if (handleTaken && handleTaken.id !== current?.id) {
    return { ok: false as const, status: 409, error: { code: "conflict", message: "That handle is taken." } };
  }
  const passwordHash = hashPassword(input.password);
  const now = new Date().toISOString();
  if (current?.kind === "guest") {
    db.update(users)
      .set({
        email: account.email,
        passwordHash,
        handle: account.handle,
        displayName: account.displayName,
        kind: "member",
      })
      .where(eq(users.id, current.id))
      .run();
    const user = await finishSession(db, current.id, secure);
    recordAudit(db, { actorId: user.id, action: "account_created", entityType: "user", entityId: user.id, metadata: { upgradedGuest: "true" } });
    return { ok: true as const, user };
  }
  const id = randomUUID();
  db.insert(users)
    .values({
      id,
      handle: account.handle,
      displayName: account.displayName,
      kind: "member",
      email: account.email,
      passwordHash,
      createdAt: now,
    })
    .run();
  const user = await finishSession(db, id, secure);
  recordAudit(db, { actorId: user.id, action: "account_created", entityType: "user", entityId: user.id, metadata: { upgradedGuest: "false" } });
  return { ok: true as const, user };
}

export async function login(db: RippleDb, email: string, password: string, secure: boolean) {
  const normalized = email.trim().toLowerCase();
  if (!consumeRateLimit(db, `login:${normalized}`, LIMITS.login.limit, LIMITS.login.windowMs)) {
    return { ok: false as const, status: 429, error: { code: "rate_limited", message: "Too many login attempts. Nothing was changed." } };
  }
  const row = db.select().from(users).where(eq(users.email, normalized)).get();
  if (!row?.passwordHash || !verifyPassword(password, row.passwordHash)) {
    return { ok: false as const, status: 401, error: { code: "unauthorized", message: "Email or password does not match." } };
  }
  return {
    ok: true as const,
    user: await finishSession(db, row.id, secure),
  };
}
