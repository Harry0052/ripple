import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { databaseFrom, openDatabase } from "@/lib/db/client";
import { seedDemoWorkflows } from "@/lib/db/seed";
import { startRun } from "@/lib/runs/service";
import { consumeRateLimit, LIMITS } from "@/lib/security/rate-limit";
import { getPublicWorkflow } from "@/lib/workflows/detail";
import { fileReport } from "./service";

const cleanups: Array<() => void> = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ripple-report-"));
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
      `INSERT INTO users (id, handle, display_name, kind, created_at) VALUES ('usr_guest', 'guest.test', 'Guest', 'guest', ?)`,
    )
    .run(now);
  return { db, sqlite };
}

describe("reports and run limits", () => {
  it("stores five reports, then refuses another, and hides private recipes", () => {
    const { db, sqlite } = fixture();
    for (let index = 0; index < 5; index += 1) {
      expect(fileReport(db, { workflowId: "wf_split_bill", reporterId: "usr_guest", reason: "spam" }).ok).toBe(true);
    }
    const blocked = fileReport(db, { workflowId: "wf_split_bill", reporterId: "usr_guest", reason: "spam" });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.status).toBe(429);
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM reports").get()).toEqual({ count: 5 });

    sqlite
      .prepare(
        `INSERT INTO workflows (
           id, owner_id, slug, title, summary, category, visibility, estimated_minutes, origin,
           published_version_id, created_at, updated_at
         ) VALUES ('wf_private', 'usr_ripple_demo', 'private-note', 'Private', 'Hidden', 'text-tools',
           'private', 1, 'user', 'ver_split_bill_v1', '2026-11-18T20:00:00.000Z', '2026-11-18T20:00:00.000Z')`,
      )
      .run();
    expect(fileReport(db, { workflowId: "wf_private", reporterId: "usr_guest", reason: "other" }).ok).toBe(false);
  });

  it("does not start a run after the session limit", () => {
    const { db, sqlite } = fixture();
    for (let index = 0; index < LIMITS.run.limit; index += 1) {
      expect(consumeRateLimit(db, "run:usr_guest", LIMITS.run.limit, LIMITS.run.windowMs)).toBe(true);
    }
    const detail = getPublicWorkflow(db, "split-a-bill");
    if (detail.status !== "ok") throw new Error("missing recipe");
    const blocked = startRun(db, {
      userId: "usr_guest",
      slug: "split-a-bill",
      inputs: { bill: "80", tipPercent: "20", people: "4" },
      consents: detail.steps.map((step) => step.id),
      idempotencyKey: "idem-rate-limit-0001",
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.status).toBe(429);
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM runs").get()).toEqual({ count: 0 });
  });
});
