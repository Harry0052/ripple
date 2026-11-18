import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { databaseFrom, openDatabase } from "@/lib/db/client";
import { seedDemoWorkflows } from "@/lib/db/seed";
import { getPublicWorkflow } from "./detail";
import { listPublishedWorkflows } from "./list";

const cleanups: Array<() => void> = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ripple-detail-"));
  const sqlite = openDatabase(path.join(dir, "test.db"));
  cleanups.push(() => {
    sqlite.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return { db: databaseFrom(sqlite), sqlite };
}

describe("demo recipes", () => {
  it("seeds three public recipes once and keeps the bill formula readable", () => {
    const { db } = fixture();
    seedDemoWorkflows(db);
    seedDemoWorkflows(db);
    const listed = listPublishedWorkflows(db, {});
    expect(listed.workflows).toHaveLength(3);
    expect(listed.workflows.every((workflow) => workflow.origin === "demo_seed")).toBe(true);
    expect(listed.workflows.every((workflow) => workflow.verified === "Not verified by a run yet")).toBe(
      true,
    );

    const bill = getPublicWorkflow(db, "split-a-bill");
    expect(bill.status).toBe("ok");
    if (bill.status !== "ok") return;
    expect(bill.permissions).toContain("Does not send them to another service");
    expect(bill.steps.map((step) => step.type)).toEqual([
      "input",
      "calculate",
      "calculate",
      "calculate",
      "transform",
      "transform",
    ]);
    const tip = bill.steps.find((step) => step.type === "calculate" && step.outputKey === "tip");
    expect(tip && tip.type === "calculate" ? tip.expression : "").toBe("bill * tipPercent / 100");
  });

  it("does not reveal a private slug and refuses an unknown block", () => {
    const { db, sqlite } = fixture();
    seedDemoWorkflows(db);
    const now = "2026-11-18T20:00:00.000Z";
    sqlite
      .prepare(
        `INSERT INTO workflows (
           id, owner_id, slug, title, summary, category, visibility, estimated_minutes,
           origin, published_version_id, created_at, updated_at
         ) VALUES ('wf_private', 'usr_ripple_demo', 'private-note', 'Private note', 'Hidden',
           'text-tools', 'private', 1, 'user', 'ver_private', ?, ?)`,
      )
      .run(now, now);
    sqlite
      .prepare(
        `INSERT INTO workflow_versions (
           id, workflow_id, version, status, permissions_json, prerequisites, success_criteria,
           risks, test_status, published_at, last_verified_at, created_at
         ) VALUES ('ver_private', 'wf_private', 1, 'published', '{"items":["owner only"]}',
           'None', 'None', 'None', 'untested', ?, NULL, ?)`,
      )
      .run(now, now);
    expect(getPublicWorkflow(db, "private-note").status).toBe("not-found");
    expect(getPublicWorkflow(db, "../secret").status).toBe("not-found");

    sqlite
      .prepare(
        `UPDATE workflow_steps SET step_type = 'browser', config_json = ?
         WHERE id = 'ver_split_bill_v1_s2'`,
      )
      .run(JSON.stringify({ type: "browser", title: "Open a site" }));
    const broken = getPublicWorkflow(db, "split-a-bill");
    expect(broken.status).toBe("unreadable");
    expect(listPublishedWorkflows(db, {}).workflows.map((workflow) => workflow.slug)).toContain(
      "split-a-bill",
    );
  });
});
