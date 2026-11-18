# Ripple

Shareable actions, not just shareable content. A Ripple recipe shows every step before it runs and keeps a record of what happened.

This repository is a local-first Next.js app. Stage 1 is the shell and Explore. Explore reads SQLite. With a fresh database the library is empty on purpose — Ripple does not invent recipes.

## Quickstart

Requirements: Node.js 22+.

```bash
npm install
npm run db:setup
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

`npm run db:setup` creates `data/ripple.db` and applies SQL migrations in `drizzle/migrations`. The database path is `RIPPLE_DB_PATH` (see `.env.example`). No account or API key is required.

## What works in this checkout

| Area | State |
| --- | --- |
| Explore search and topic filters | Real. Reads published public rows from SQLite. |
| Empty library and unknown addresses | Real. |
| My Runs, Create, Profile | Switched off, with an explanation on the page. |
| Running a recipe | Not built. |
| Accounts, email, OAuth, payments | Not configured. Disabled, not simulated. |

Hosted Postgres (for example Supabase) and Vercel are the intended later deploy path. This checkout is verified with SQLite only.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

End-to-end tests build the app, start it, and write screenshots to `docs/screenshots`.
