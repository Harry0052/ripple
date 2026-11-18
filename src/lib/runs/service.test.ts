import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { databaseFrom, openDatabase } from "@/lib/db/client";
import { seedDemoWorkflows } from "@/lib/db/seed";
import { getPublicWorkflow } from "@/lib/workflows/detail";
import { approveEffect, cancelRun, getRun, retryRun, startRun } from "./service";

const cleanups: Array<() => void> = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ripple-run-"));
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
      `INSERT INTO users (id, handle, display_name, kind, created_at)
       VALUES ('usr_guest', 'guest.test', 'Guest', 'guest', ?),
              ('usr_other', 'other.test', 'Other', 'guest', ?)`,
    )
    .run(now, now);
  return { db, sqlite };
}

function consents(db: ReturnType<typeof fixture>["db"], slug: string) {
  const detail = getPublicWorkflow(db, slug);
  if (detail.status !== "ok") throw new Error(detail.status);
  return detail.steps.map((step) => step.id);
}

describe("startRun", () => {
  it("splits a bill, refuses a second execution, and hides the run from someone else", () => {
    const { db, sqlite } = fixture();
    const first = startRun(db, {
      userId: "usr_guest",
      slug: "split-a-bill",
      inputs: { bill: "80", tipPercent: "20", people: "4" },
      consents: consents(db, "split-a-bill"),
      idempotencyKey: "idem-bill-00000001",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.data.status).toBe("succeeded");
    const message = first.data.steps.find((step) => step.title === "Write the result")?.safeResult as {
      message?: string;
    };
    expect(message.message).toBe("Each person pays $24.00.");
    expect(first.data.approvals).toHaveLength(6);

    const second = startRun(db, {
      userId: "usr_guest",
      slug: "split-a-bill",
      inputs: { bill: "80", tipPercent: "20", people: "4" },
      consents: consents(db, "split-a-bill"),
      idempotencyKey: "idem-bill-00000001",
    });
    expect(second.ok && second.data.id).toBe(first.data.id);
    const count = sqlite.prepare("SELECT COUNT(*) AS count FROM runs").get() as { count: number };
    expect(count.count).toBe(1);
    expect(getRun(db, first.data.id, "usr_other")).toBeNull();

    const conflict = startRun(db, {
      userId: "usr_guest",
      slug: "split-a-bill",
      inputs: { bill: "10", tipPercent: "15", people: "2" },
      consents: consents(db, "split-a-bill"),
      idempotencyKey: "idem-bill-00000001",
    });
    expect(conflict.ok).toBe(false);
    if (conflict.ok) return;
    expect(conflict.status).toBe(409);

    const detail = getPublicWorkflow(db, "split-a-bill");
    expect(detail.status === "ok" && detail.verified.startsWith("Verified ")).toBe(true);
  });

  it("does not create a run for bad input or missing consent", () => {
    const { db, sqlite } = fixture();
    const invalid = startRun(db, {
      userId: "usr_guest",
      slug: "split-a-bill",
      inputs: { bill: "80", tipPercent: "20", people: "0" },
      consents: consents(db, "split-a-bill"),
      idempotencyKey: "idem-bad-0000000001",
    });
    expect(invalid.ok).toBe(false);
    if (invalid.ok) return;
    expect(invalid.error.fields?.people).toMatch(/at least 1/);

    const silent = startRun(db, {
      userId: "usr_guest",
      slug: "split-a-bill",
      inputs: { bill: "80", tipPercent: "20", people: "4" },
      consents: [],
      idempotencyKey: "idem-consent-000001",
    });
    expect(silent.ok).toBe(false);
    const count = sqlite.prepare("SELECT COUNT(*) AS count FROM runs").get() as { count: number };
    expect(count.count).toBe(0);
  });

  it("stops before saving a checklist and retries a failed formula", () => {
    const { db, sqlite } = fixture();
    const paused = startRun(db, {
      userId: "usr_guest",
      slug: "pack-a-list",
      inputs: { items: "passport, charger" },
      consents: consents(db, "pack-a-list"),
      idempotencyKey: "idem-pack-00000001",
    });
    expect(paused.ok && paused.data.status).toBe("needs_approval");
    if (!paused.ok) return;
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM demo_submissions").get()).toEqual({ count: 0 });

    const stopped = cancelRun(db, paused.data.id, "usr_guest");
    expect(stopped.ok && stopped.data.status).toBe("cancelled");
    const hidden = cancelRun(db, paused.data.id, "usr_other");
    expect(hidden.ok).toBe(false);
    if (!hidden.ok) expect(hidden.status).toBe(404);
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM demo_submissions").get()).toEqual({ count: 0 });

    const saved = startRun(db, {
      userId: "usr_guest",
      slug: "pack-a-list",
      inputs: { items: "passport, charger" },
      consents: consents(db, "pack-a-list"),
      idempotencyKey: "idem-pack-00000002",
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    const waiting = saved.data.steps.find((step) => step.status === "needs_approval");
    expect(waiting).toBeTruthy();
    const approved = approveEffect(db, saved.data.id, "usr_guest", waiting?.stepId ?? "");
    expect(approved.ok && approved.data.status).toBe("succeeded");
    const submission = sqlite.prepare("SELECT payload_json FROM demo_submissions").get() as {
      payload_json: string;
    };
    expect(JSON.parse(submission.payload_json).checklist).toBe("1. passport\n2. charger");

    const now = "2026-11-18T20:00:00.000Z";
    sqlite
      .prepare(
        `INSERT INTO workflows (
           id, owner_id, slug, title, summary, category, visibility, estimated_minutes, origin,
           published_version_id, created_at, updated_at
         ) VALUES ('wf_zero', 'usr_ripple_demo', 'divide-zero', 'Divide zero', 'Fails',
           'everyday-math', 'public', 1, 'user', NULL, ?, ?)`,
      )
      .run(now, now);
    sqlite
      .prepare(
        `INSERT INTO workflow_versions (
           id, workflow_id, version, status, permissions_json, prerequisites, success_criteria,
           risks, test_status, published_at, last_verified_at, created_at
         ) VALUES ('ver_zero', 'wf_zero', 1, 'published', '{"items":["Local math only"]}',
           'None', 'It fails.', 'None', 'untested', ?, NULL, ?)`,
      )
      .run(now, now);
    sqlite
      .prepare(
        `INSERT INTO workflow_steps (id, version_id, ordinal, step_type, title, config_json)
         VALUES ('stp_zero', 'ver_zero', 1, 'calculate', 'Divide', ?)`,
      )
      .run(
        JSON.stringify({
          type: "calculate",
          title: "Divide",
          label: "Quotient",
          expression: "1 / 0",
          outputKey: "quotient",
        }),
      );
    sqlite.prepare("UPDATE workflows SET published_version_id = 'ver_zero' WHERE id = 'wf_zero'").run();

    const failed = startRun(db, {
      userId: "usr_guest",
      slug: "divide-zero",
      inputs: {},
      consents: ["stp_zero"],
      idempotencyKey: "idem-zero-00000001",
    });
    expect(failed.ok && failed.data.status).toBe("failed");
    if (!failed.ok) return;
    expect(failed.data.steps[0]?.error).toMatch(/zero/i);
    const retried = retryRun(db, failed.data.id, "usr_guest");
    expect(retried.ok && retried.data.status).toBe("failed");
    if (!retried.ok) return;
    expect(retried.data.steps[0]?.attempt).toBe(2);
    expect(sqlite.prepare("SELECT COUNT(*) AS count FROM runs WHERE version_id = 'ver_zero'").get()).toEqual({
      count: 1,
    });
  });
});
