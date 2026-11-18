# Ripple

Shareable actions, not just shareable content. A Ripple recipe shows every step before it runs and keeps a record of what happened.

This repository is a local-first Next.js app. Explore and recipe pages read SQLite. `npm run db:setup` seeds three DEMO recipes. They can be inspected. They cannot be run yet.

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
| Three DEMO recipes and their detail pages | Real. Steps, permissions, risks, and version are stored. |
| Empty search and unknown addresses | Real. |
| Run a DEMO recipe | Real, after you allow every step. Results are stored in SQLite. |
| My Runs and Profile | Real for the guest session in this browser. |
| Create, email signup, OAuth, payments | Switched off. Not simulated. |

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
