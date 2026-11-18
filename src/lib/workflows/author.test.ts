import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { databaseFrom, openDatabase } from "@/lib/db/client";
import { seedDemoWorkflows } from "@/lib/db/seed";
import { getRun, startRun } from "@/lib/runs/service";
import { getPublicWorkflow } from "./detail";
import { createDraft, dryRunDraft, forkDraft, publishDraft, updateDraft } from "./author";
import { DEFAULT_DRAFT } from "./draft";

const cleanups: Array<() => void> = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ripple-author-"));
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
      `INSERT INTO users (id, handle, display_name, kind, email, created_at)
       VALUES ('usr_member', 'member.test', 'Member', 'member', 'member@ripple.local', ?),
              ('usr_guest', 'guest.test', 'Guest', 'guest', NULL, ?),
              ('usr_other', 'other.test', 'Other', 'member', 'other@ripple.local', ?)`,
    )
    .run(now, now, now);
  return { db, sqlite };
}

describe("publish versions", () => {
  it("keeps version 1 immutable after version 2 is published", () => {
    const { db, sqlite } = fixture();
    expect(createDraft(db, "usr_guest").ok).toBe(false);
    const created = createDraft(db, "usr_member");
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const draft = {
      ...DEFAULT_DRAFT,
      visibility: "public" as const,
      title: "Double a number",
    };
    expect(updateDraft(db, created.id, "usr_member", draft).ok).toBe(true);
    expect(publishDraft(db, created.id, "usr_member").ok).toBe(false);

    const dry = dryRunDraft(db, created.id, "usr_member", "idem-dry-run-000001");
    expect(dry.ok).toBe(true);
    if (!dry.ok) return;
    const message = dry.run.steps.find((step) => step.title === "Write it")?.safeResult as { message?: string };
    expect(message.message).toBe("Double is 8.");
    expect(dry.run.purpose).toBe("dry_run");

    const published = publishDraft(db, created.id, "usr_member");
    expect(published.ok && published.version).toBe(1);
    if (!published.ok) return;

    const detail = getPublicWorkflow(db, published.slug);
    expect(detail.status).toBe("ok");
    if (detail.status !== "ok") return;
    const firstRun = startRun(db, {
      userId: "usr_guest",
      slug: published.slug,
      inputs: { value: "4" },
      consents: detail.steps.map((step) => step.id),
      idempotencyKey: "idem-user-run-00001",
    });
    expect(firstRun.ok && firstRun.data.status).toBe("succeeded");
    if (!firstRun.ok) return;

    expect(forkDraft(db, created.id, "usr_other").ok).toBe(false);
    const fork = forkDraft(db, created.id, "usr_member");
    expect(fork.ok && fork.version).toBe(2);
    const next = {
      ...draft,
      steps: draft.steps.map((step) =>
        step.type === "transform" ? { ...step, template: "Twice is {{doubled}}." } : step,
      ),
    };
    expect(updateDraft(db, created.id, "usr_member", next).ok).toBe(true);
    expect(updateDraft(db, created.id, "usr_other", next).ok).toBe(false);
    expect(dryRunDraft(db, created.id, "usr_member", "idem-dry-run-000002").ok).toBe(true);
    const second = publishDraft(db, created.id, "usr_member");
    expect(second.ok && second.version).toBe(2);

    const v1 = sqlite
      .prepare(
        `SELECT config_json FROM workflow_steps
         WHERE version_id = (SELECT id FROM workflow_versions WHERE workflow_id = ? AND version = 1)
           AND step_type = 'transform'`,
      )
      .get(created.id) as { config_json: string };
    expect(JSON.parse(v1.config_json).template).toBe("Double is {{doubled}}.");
    const old = getRun(db, firstRun.data.id, "usr_guest");
    const oldMessage = old?.steps.find((step) => step.title === "Write it")?.safeResult as { message?: string };
    expect(oldMessage.message).toBe("Double is 8.");

    const latest = getPublicWorkflow(db, published.slug);
    expect(latest.status).toBe("ok");
    if (latest.status !== "ok") return;
    const secondRun = startRun(db, {
      userId: "usr_guest",
      slug: published.slug,
      inputs: { value: "4" },
      consents: latest.steps.map((step) => step.id),
      idempotencyKey: "idem-user-run-00002",
    });
    expect(secondRun.ok).toBe(true);
    if (!secondRun.ok) return;
    const newMessage = secondRun.data.steps.find((step) => step.title === "Write it")?.safeResult as {
      message?: string;
    };
    expect(newMessage.message).toBe("Twice is 8.");
  });

  it("rejects an unknown block in a draft", () => {
    const { db } = fixture();
    const created = createDraft(db, "usr_member");
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const rejected = updateDraft(db, created.id, "usr_member", {
      ...DEFAULT_DRAFT,
      steps: [{ type: "browser", title: "Open a site" }],
    });
    expect(rejected.ok).toBe(false);
  });
});
