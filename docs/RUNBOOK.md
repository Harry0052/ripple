# Ripple runbook

This is the local and hand-off procedure. It is not a claim that Ripple is production-ready, certified, or monitored by an on-call rotation.

## What is verified

CI and local checks run against SQLite. Hosted Postgres, including Supabase, has not been executed in this repository. Do not point a public deploy at a database until that path is migrated and tested.

## Environment

| Name | Required | Purpose |
| --- | --- | --- |
| `RIPPLE_DB_PATH` | No | SQLite file. Defaults to `data/ripple.db`. |
| `NODE_ENV` | Set by Next.js | `production` for `next start`. |

There is no API key, mail provider, or OAuth secret. Do not add one to the repo. Cookies are `Secure` only when the request is HTTPS.

## Start and migrate

Opening the database applies every SQL file in `drizzle/migrations` once and records it in `schema_migrations`. `npm run db:setup` also seeds the three DEMO recipes if their ids are absent.

```bash
npm install
npm run db:setup
npm run dev
```

Production-style local process:

```bash
npm run db:setup
npm run build
npm run start
```

## Backup

Stop the process, then copy `data/ripple.db` (and the `-wal` file if it is non-empty; checkpoint first with `sqlite3 data/ripple.db "PRAGMA wal_checkpoint(FULL);"`). There are no down migrations.

## Rollback

1. Stop the app.
2. Restore the previous SQLite file.
3. Start the app again on a build that matches that schema.

Do not delete rows from `schema_migrations` to “re-run” a migration against a database that already has the tables.

## Incident checks

- Process logs are JSON lines on stdout and stderr. `run_step_failed` is an error line. Logs omit passwords, tokens, and raw input objects.
- `audit_events` records account creation, run start, publish, report, and account deletion.
- `metric_events` with `name = 'run_completed'` is the per-person verified-run count. It is not a third-party analytics product.
- Rate limits live in `rate_buckets`.

## Data deletion

A signed-in person can export JSON and delete the session’s runs, reports, password hash, and email. Recipes they published are withdrawn from Explore. Other people’s runs of those recipes remain and are retitled “Deleted recipe”, because those runs are the other person’s record.
