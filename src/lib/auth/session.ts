import { createHash, randomBytes, randomUUID } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import type { RippleDb } from "@/lib/db/client";
import { sessions, users } from "@/lib/db/schema";

const COOKIE = "ripple_session";
const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

export type SessionUser = {
  id: string;
  handle: string;
  displayName: string;
  kind: string;
  email: string | null;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function expiresAt(from = new Date()) {
  return new Date(from.getTime() + THIRTY_DAYS_SECONDS * 1000).toISOString();
}

export async function readSessionUser(db: RippleDb): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const row = db
    .select({
      id: users.id,
      handle: users.handle,
      displayName: users.displayName,
      kind: users.kind,
      email: users.email,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date().toISOString())))
    .get();
  return row ?? null;
}

export async function getOrCreateGuest(db: RippleDb, options?: { secure?: boolean }): Promise<SessionUser> {
  const existing = await readSessionUser(db);
  if (existing) return existing;
  const id = randomUUID();
  const token = randomBytes(32).toString("base64url");
  const createdAt = new Date().toISOString();
  const user = {
    id,
    handle: `guest.${id.slice(0, 8)}`,
    displayName: "Guest",
    kind: "guest",
    email: null,
    passwordHash: null,
    createdAt,
  };
  db.insert(users).values(user).run();
  db.insert(sessions)
    .values({
      id: randomUUID(),
      userId: id,
      tokenHash: hashToken(token),
      createdAt,
      expiresAt: expiresAt(),
    })
    .run();
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS_SECONDS,
    secure: options?.secure === true,
  });
  return {
    id: user.id,
    handle: user.handle,
    displayName: user.displayName,
    kind: user.kind,
    email: null,
  };
}

export async function replaceSession(db: RippleDb, userId: string, secure: boolean) {
  const token = randomBytes(32).toString("base64url");
  const createdAt = new Date().toISOString();
  db.delete(sessions).where(eq(sessions.userId, userId)).run();
  db.insert(sessions)
    .values({
      id: randomUUID(),
      userId,
      tokenHash: hashToken(token),
      createdAt,
      expiresAt: expiresAt(),
    })
    .run();
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS_SECONDS,
    secure,
  });
}

export async function logout(db: RippleDb) {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token))).run();
  jar.set(COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}
