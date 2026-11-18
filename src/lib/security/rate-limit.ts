import { eq } from "drizzle-orm";
import type { RippleDb } from "@/lib/db/client";
import { rateBuckets } from "@/lib/db/schema";

export function consumeRateLimit(db: RippleDb, key: string, limit: number, windowMs: number) {
  const now = Date.now();
  return db.transaction((tx) => {
    const row = tx.select().from(rateBuckets).where(eq(rateBuckets.bucketKey, key)).get();
    const fresh = !row || now - Date.parse(row.windowStart) >= windowMs;
    if (fresh) {
      tx.insert(rateBuckets)
        .values({ bucketKey: key, windowStart: new Date(now).toISOString(), count: 1 })
        .onConflictDoUpdate({
          target: rateBuckets.bucketKey,
          set: { windowStart: new Date(now).toISOString(), count: 1 },
        })
        .run();
      return true;
    }
    if (row.count >= limit) return false;
    tx.update(rateBuckets)
      .set({ count: row.count + 1 })
      .where(eq(rateBuckets.bucketKey, key))
      .run();
    return true;
  });
}

export const LIMITS = {
  run: { limit: 30, windowMs: 60 * 60 * 1000 },
  report: { limit: 5, windowMs: 60 * 60 * 1000 },
  login: { limit: 10, windowMs: 15 * 60 * 1000 },
  signup: { limit: 5, windowMs: 60 * 60 * 1000 },
} as const;
