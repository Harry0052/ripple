import { databasePath, getDb, getSqlite } from "./client";
import { seedDemoWorkflows } from "./seed";

getSqlite();
seedDemoWorkflows(getDb());
console.log(`Ripple database is migrated and demo recipes are seeded at ${databasePath()}`);
