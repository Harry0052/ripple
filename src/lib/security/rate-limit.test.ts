import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { databaseFrom, openDatabase } from "@/lib/db/client";
import { consumeRateLimit } from "./rate-limit";

const cleanups: Array<() => void> = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

describe("consumeRateLimit", () => {
  it("blocks once the window is full and allows a new window", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ripple-rate-"));
    const sqlite = openDatabase(path.join(dir, "test.db"));
    cleanups.push(() => {
      sqlite.close();
      fs.rmSync(dir, { recursive: true, force: true });
    });
    const db = databaseFrom(sqlite);
    expect(consumeRateLimit(db, "login:a@example.com", 2, 60_000)).toBe(true);
    expect(consumeRateLimit(db, "login:a@example.com", 2, 60_000)).toBe(true);
    expect(consumeRateLimit(db, "login:a@example.com", 2, 60_000)).toBe(false);
    sqlite.prepare("UPDATE rate_buckets SET window_start = '2000-01-01T00:00:00.000Z'").run();
    expect(consumeRateLimit(db, "login:a@example.com", 2, 60_000)).toBe(true);
  });
});
