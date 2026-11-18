import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openDatabase } from "./client";

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("migrate", () => {
  it("applies the foundation migration once", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ripple-migrate-"));
    dirs.push(dir);
    const sqlite = openDatabase(path.join(dir, "test.db"));
    const tables = sqlite
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all() as { name: string }[];
    expect(tables.map((table) => table.name)).toEqual(
      expect.arrayContaining(["schema_migrations", "users", "workflows"]),
    );

    openDatabase(path.join(dir, "test.db")).close();
    const applied = sqlite
      .prepare("SELECT COUNT(*) AS count FROM schema_migrations")
      .get() as { count: number };
    expect(applied.count).toBe(1);
    sqlite.close();
  });
});
