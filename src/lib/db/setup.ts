import { databasePath, getSqlite } from "./client";

getSqlite();
console.log(`Ripple database is migrated at ${databasePath()}`);
