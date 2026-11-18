import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { migrate } from "./migrate";

export type RippleDb = BetterSQLite3Database<typeof schema>;

const globalForDb = globalThis as unknown as { rippleSqlite?: Database.Database };

export function databasePath() {
  return process.env.RIPPLE_DB_PATH ?? path.join(process.cwd(), "data", "ripple.db");
}

export function openDatabase(filename: string) {
  if (filename !== ":memory:") {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }
  const sqlite = new Database(filename);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 3000");
  migrate(sqlite);
  return sqlite;
}

export function getSqlite() {
  if (!globalForDb.rippleSqlite) {
    globalForDb.rippleSqlite = openDatabase(databasePath());
  }
  return globalForDb.rippleSqlite;
}

export function getDb() {
  return drizzle(getSqlite(), { schema });
}

export function databaseFrom(sqlite: Database.Database): RippleDb {
  return drizzle(sqlite, { schema });
}
