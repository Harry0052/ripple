# Ripple

Ripple is a link that runs a small, visible recipe and keeps a record of what happened. You preview every step, allow it, and can come back to the same result. It is not an autonomous browser and it does not sign in to other websites.

The working codename in the original brief was DONE. The product name is Ripple.

## Quickstart

Node.js 22 or newer.

```bash
npm install
npm run db:setup
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

`npm run db:setup` creates `data/ripple.db`, applies the SQL in `drizzle/migrations`, and seeds three DEMO recipes if they are not already there. The database path is `RIPPLE_DB_PATH` (see `.env.example`). No API key is required.

A production-style local process:

```bash
npm run db:setup
npm run build
npm run start
```

## Architecture

- Next.js App Router and React, TypeScript strict, Tailwind CSS.
- SQLite through `better-sqlite3` and Drizzle. The server opens the file and applies migrations.
- Server routes under `src/app/api` call services in `src/lib`. Pages read those services directly.
- Sessions are random tokens stored only as a SHA-256 hash. The cookie is `httpOnly` and `SameSite=Lax`, and `Secure` only on HTTPS.
- Passwords are hashed with bcrypt. There is no email delivery.
- A run executes in-process: input, decimal arithmetic, text transforms, and an optional save into Ripple’s own `demo_submissions` table. Unknown block types fail closed.
- Cache Components are off so a person’s runs are not placed in a shared cache.

```text
src/app            routes and pages
src/components     shell, forms, and design-system pieces
src/lib/db         schema, migrations, seed
src/lib/engine     formula and text transforms
src/lib/runs       execution, consent, idempotency
src/lib/workflows  explore, detail, drafts, publish
src/lib/auth       sessions and accounts
src/lib/account    export and deletion
```

## What is real, sandboxed, or disabled

| Capability | State |
| --- | --- |
| Explore, search, filters, recipe detail | Real. Public published rows in SQLite. |
| Three DEMO recipes | Real seed data, labeled Demo. |
| Run after per-step consent | Real. Status is read back from the database. |
| Duplicate submit | Real. The same idempotency key returns the same run. |
| Stop, retry, and a second approval before a Ripple save | Real. |
| Draft, dry run, publish v1, then v2 | Real. Older versions and older runs stay as they were. |
| Accounts | Real email and password hash. Signup can keep a guest session’s runs. Login does not merge a different guest. |
| Public recipe link and copy | Real. The link is the recipe, not a run. |
| Reports | Real rows in SQLite. They are not sent to an outside moderator. |
| Rate limits | Real fixed windows for runs, dry runs, reports, login, and signup. |
| Export and delete | Real for the current session. |
| Verified-run count | Real rows named `run_completed` for that person. Not a site-wide dashboard. |
| Demo-form save | Sandbox. It writes to Ripple’s database only, after approval. |
| Password reset, OAuth, payments, outbound email, browser automation | Disabled. Nothing is simulated. |
| Hosted Postgres / Vercel / Supabase | Documented as a later target. Not verified in CI. |

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

GitHub Actions runs the same list on pushes to `main`. End-to-end tests cover explore, a bill run that stays private, stopping a checklist before it is saved, and publishing version 2 without changing an earlier run.

Screenshots of the main screens are in `docs/screenshots`. Deployment and rollback notes are in `docs/RUNBOOK.md`. The unrun pilot plan is in `docs/PILOT.md`.

This repository does not claim a compliance certification or that the app is ready for a public launch.
