import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { databaseFrom, openDatabase } from "@/lib/db/client";
import { listPublishedWorkflows } from "./list";

const cleanups: Array<() => void> = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ripple-list-"));
  const sqlite = openDatabase(path.join(dir, "test.db"));
  cleanups.push(() => {
    sqlite.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
  return { db: databaseFrom(sqlite), sqlite };
}

function insertWorkflow(
  sqlite: ReturnType<typeof fixture>["sqlite"],
  row: {
    id: string;
    visibility: "public" | "private";
    published?: boolean;
    title: string;
    summary?: string;
    category?: string;
  },
) {
  const now = "2026-11-18T20:00:00.000Z";
  sqlite
    .prepare(
      `INSERT INTO users (id, handle, display_name, kind, created_at)
       VALUES (?, ?, ?, 'demo', ?)
       ON CONFLICT(id) DO NOTHING`,
    )
    .run("user-demo", "ripple.demo", "Ripple Demo", now);
  sqlite
    .prepare(
      `INSERT INTO workflows (
         id, owner_id, slug, title, summary, category, visibility,
         estimated_minutes, origin, published_version_id, created_at, updated_at
       ) VALUES (?, 'user-demo', ?, ?, ?, ?, ?, 2, 'demo_seed', ?, ?, ?)`,
    )
    .run(
      row.id,
      row.id,
      row.title,
      row.summary ?? "A stored recipe.",
      row.category ?? "everyday-math",
      row.visibility,
      row.published === false ? null : `ver-${row.id}`,
      now,
      now,
    );
}

describe("listPublishedWorkflows", () => {
  it("returns an empty library when nothing is published", () => {
    const result = listPublishedWorkflows(fixture().db, {});
    expect(result.status).toBe("empty-library");
    expect(result.workflows).toEqual([]);
  });

  it("returns only public published recipes and matches a search", () => {
    const { db, sqlite } = fixture();
    insertWorkflow(sqlite, { id: "bill", visibility: "public", title: "Split a bill fairly" });
    insertWorkflow(sqlite, { id: "secret", visibility: "private", title: "Split a bill privately" });
    insertWorkflow(sqlite, {
      id: "draft",
      visibility: "public",
      published: false,
      title: "Unpublished splitter",
    });

    const all = listPublishedWorkflows(db, {});
    expect(all.status).toBe("results");
    expect(all.workflows.map((workflow) => workflow.slug)).toEqual(["bill"]);
    expect(all.workflows[0]?.creatorHandle).toBe("ripple.demo");

    const search = listPublishedWorkflows(db, { query: "fairly" });
    expect(search.workflows).toHaveLength(1);

    const missed = listPublishedWorkflows(db, { query: "zzzz-no-such-recipe" });
    expect(missed.status).toBe("empty-search");

    const wildcard = listPublishedWorkflows(db, { query: "%" });
    expect(wildcard.workflows).toHaveLength(0);
  });

  it("rejects an unknown topic without listing recipes", () => {
    const { db, sqlite } = fixture();
    insertWorkflow(sqlite, { id: "bill", visibility: "public", title: "Split a bill fairly" });
    const result = listPublishedWorkflows(db, { category: "banking" });
    expect(result.status).toBe("unknown-category");
    expect(result.workflows).toEqual([]);
  });
});
