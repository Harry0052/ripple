import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { deleteAccount, exportAccount } from "@/lib/account/privacy";
import { databaseFrom, openDatabase } from "@/lib/db/client";
import { seedDemoWorkflows } from "@/lib/db/seed";
import { getRun, startRun } from "@/lib/runs/service";
import { getPublicWorkflow } from "@/lib/workflows/detail";

const cleanups: Array<() => void> = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

describe("account export and deletion", () => {
  it("exports only that person’s runs and withdraws their recipes", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ripple-account-"));
    const sqlite = openDatabase(path.join(dir, "test.db"));
    cleanups.push(() => {
      sqlite.close();
      fs.rmSync(dir, { recursive: true, force: true });
    });
    const db = databaseFrom(sqlite);
    seedDemoWorkflows(db);
    const now = "2026-11-18T20:00:00.000Z";
    sqlite
      .prepare(
        `INSERT INTO users (id, handle, display_name, kind, email, password_hash, created_at)
         VALUES ('usr_a', 'person.a', 'Person A', 'member', 'a@ripple.local', 'hash', ?),
                ('usr_b', 'person.b', 'Person B', 'guest', NULL, NULL, ?)`,
      )
      .run(now, now);
    const detail = getPublicWorkflow(db, "split-a-bill");
    if (detail.status !== "ok") throw new Error("missing recipe");
    const consents = detail.steps.map((step) => step.id);
    const inputs = { bill: "80", tipPercent: "20", people: "4" };
    const runA = startRun(db, { userId: "usr_a", slug: "split-a-bill", inputs, consents, idempotencyKey: "idem-account-a-00001" });
    const runB = startRun(db, { userId: "usr_b", slug: "split-a-bill", inputs, consents, idempotencyKey: "idem-account-b-00001" });
    expect(runA.ok && runB.ok).toBe(true);
    if (!runA.ok || !runB.ok) return;

    const exported = exportAccount(db, "usr_a");
    expect(exported?.user.email).toBe("a@ripple.local");
    expect(JSON.stringify(exported)).not.toContain("passwordHash");
    expect(exported?.runs.map((run) => run.id)).toEqual([runA.data.id]);
    expect(JSON.stringify(exported)).not.toContain(runB.data.id);

    expect(deleteAccount(db, "usr_a")).toBe(true);
    expect(getRun(db, runA.data.id, "usr_a")).toBeNull();
    expect(getRun(db, runB.data.id, "usr_b")?.status).toBe("succeeded");
    const scrubbed = sqlite.prepare("SELECT email, password_hash, display_name FROM users WHERE id = 'usr_a'").get() as {
      email: string | null;
      password_hash: string | null;
      display_name: string;
    };
    expect(scrubbed.email).toBeNull();
    expect(scrubbed.password_hash).toBeNull();
    expect(scrubbed.display_name).toBe("Deleted account");
  });
});
