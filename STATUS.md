# Ripple status

Working codename in the build brief: DONE. The product name in code, UI, and docs is **Ripple**.

Current stage: **2 complete**. Next: Stage 3, run one recipe end to end.

## Stage 2 report

```text
PRODUCT: Ripple
STAGE: 2
STATUS: PASS
USER-FACING WORKING FLOWS: Explore lists three seeded DEMO recipes from SQLite. Search and topic filters narrow that list. Empty search and the unused "Saved notes" topic say nothing matches. Opening a card shows steps, the exact permission lines, prerequisites, success criteria, risks, version, publisher, and published time. An unknown or private slug is a 404. Run stays disabled and says nothing will start.
UI/UX: Inspected Explore and the bill recipe at 390×844 and 1440×900 (docs/screenshots/02-*). Cards show time, creator, permissions, and "Not verified by a run yet". Desktop detail is a two-column reading layout. Mobile puts permissions above the step list. The run control is visibly disabled with the reason in the same section. Topic chips wrap. No sample cards are invented beyond the three labeled DEMO rows.
DATA + SECURITY: Migration 0002 adds workflow_versions and workflow_steps. Seed is idempotent and validates steps before insert. Explore and detail only return public published versions. A private slug test returns not-found. An unknown block stored in a step makes that recipe unreadable and not runnable. Versions are inserted once; the seed does not rewrite them.
TESTS: npm run lint -> pass. npm run typecheck -> pass. npm test -> pass, 9 tests. npm run test:e2e -> pass, 1 Chromium test (the command also runs the production build).
REAL INTEGRATIONS: SQLite | SANDBOX: none | DISABLED: recipe execution, accounts, email, OAuth, payments
FILES CHANGED: version/step schema, three DEMO recipes, detail page, card links, tests, screenshots, README.
OPEN BUGS/RISKS: On a phone the first recipe card continues under the bottom nav, so the rest of the card is reached by scrolling. "Last verified" is honestly empty until a run exists. Hosted Postgres is still not wired.
NEXT STAGE PROPOSAL: Consent, validation, and a persisted run of "Split a bill fairly", including bad input, duplicate submit, stop, and retry.
AWAITING APPROVAL: NO — the owner pre-approved stages 0–6. This report is the stage record.
```

## Stage 1 report

```text
PRODUCT: Ripple
STAGE: 1
STATUS: PASS
USER-FACING WORKING FLOWS: Explore loads from SQLite. Search and topic filters submit with a normal form. An empty database says the library is empty. A query with no match says nothing matches. An unknown address shows a 404 with a way back. My Runs, Create, and Profile are switched off and point at an explanation. They do not navigate to a blank page.
UI/UX: Inspected Explore at 390×844 and 1440×900 (docs/screenshots/01-explore-empty-390.png, 01-explore-empty-1440.png, 01-explore-no-results-390.png). Skip link is the first tab stop. Search has a visible label. Focus ring is the ink outline. Topic chips wrap instead of clipping. The empty-library card sits above the mobile nav. Lime is used as a button fill with ink text. Muted text #4A4E59 on #FAFAF7 is the secondary copy color. Reduced motion collapses transitions. Loading skeleton exists for the results region.
DATA + SECURITY: Migration 0001 creates users and workflows. Explore returns only public rows with a published version id. Private and unpublished rows are excluded (unit tested). No sessions, secrets, or accounts yet. Cache Components are off so personalized pages are not introduced behind a shared cache.
TESTS: npm run lint -> pass. npm run typecheck -> pass. npm test -> pass, 6 tests. npm run build -> pass (Next.js 16.4.6). npm run test:e2e -> pass, 1 Chromium test, including the 404 and both widths.
REAL INTEGRATIONS: SQLite via better-sqlite3 | SANDBOX: none | DISABLED: email, OAuth, payments, browser automation, recipe execution
FILES CHANGED: Next.js app, design tokens, shell, Explore, Drizzle schema and migration, Vitest, Playwright, README, screenshots.
OPEN BUGS/RISKS: The switched-off navigation explanation sits in the footer, so on a phone it is below the first screen; tapping those items scrolls to it. Hosted Postgres is still not wired. Low-severity npm audit finding was left unpatched rather than applying an unreviewed audit fix.
NEXT STAGE PROPOSAL: Seed three DEMO recipes with typed steps and permission text. Link cards to a detail page. Keep Run visibly unavailable until execution exists.
AWAITING APPROVAL: NO — the owner pre-approved stages 0–6. This report is the stage record.
```

## Stage 0 report

```text
PRODUCT: Ripple
STAGE: 0
STATUS: PASS
USER-FACING WORKING FLOWS: None yet. The repository was an empty product surface (placeholder README only) on main. No application code existed to preserve.
UI/UX: No screens rendered. Mobile flow is specified below and will be built in later stages. Desktop and mobile widths are not inspected until a UI exists.
DATA + SECURITY: No database, sessions, or secrets. No .env file. Integrations are not configured.
TESTS: not run — there is no project toolchain yet. Stage 1 adds lint, typecheck, unit, and build.
REAL INTEGRATIONS: none configured | SANDBOX: none | DISABLED: OAuth connectors, outbound email, payments, browser automation, third-party account actions (no credentials and out of MVP scope)
FILES CHANGED: STATUS.md only. README left as the existing placeholder until Stage 1 replaces it with a real quickstart.
OPEN BUGS/RISKS: See technical risks below. No product defects yet.
NEXT STAGE PROPOSAL: Stage 1 — Next.js strict TypeScript app, design tokens, accessible shell, empty Explore wired to a real SQLite query, lint/typecheck/unit/build.
AWAITING APPROVAL: NO — the owner pre-approved stages 0–6 and asked for a continuous build. This report is the stage record.
```

## Repository inspection

- Remote: `Harry0052/ripple`, private, branch `main`.
- History before this stage: one commit, `Initial commit`, file `README.md` containing `# ripple`.
- No application source, lockfile, CI, license file, or secrets.
- Local tools observed: Node.js 22, npm 10, Python 3.12, `sqlite3`. Docker is not installed, so the local database will be SQLite rather than Docker Postgres.
- Nothing existing was overwritten.

## Confirmed assumptions

- Product name is Ripple everywhere the brief says DONE.
- Build proceeds stage by stage on `main` with a commit after each stage. No pull requests.
- First real user outcome by the end of Stage 2: a visitor can search three persisted, clearly labeled DEMO recipes and open one to read steps, permissions, risks, and version. Nothing runs yet.
- First real execution by the end of Stage 3: the bill-splitting recipe validates input, requires explicit consent, computes a deterministic per-person amount, and stores the run. Bad input does not create a run. Duplicate submit returns the same run. Stop and retry are persisted.
- Local database is SQLite via `better-sqlite3` and Drizzle. A hosted Postgres (Supabase) or hosted libSQL (Turso) deploy is documented later and is not claimed as verified until a live database is actually used.
- Accounts use email and password stored as a hash. Passwordless email is not offered, because no mail provider is configured.
- Guests may run public recipes. Publishing requires an account. Public pages stay readable without login.
- Native blocks only: `input`, `calculate`, `transform`, `demo_form`. Unknown blocks fail closed.
- `demo_form` writes to Ripple's own database after a second approval. It does not email anyone.
- Times are stored in UTC and labeled UTC in the UI.
- Seeded recipes and the demo account are marked DEMO. The demo password is a local fixture, not a production credential.

## Product scope for the MVP

In scope:

- Explore, workflow detail, run preview, run console, run history, creator studio, profile.
- Public share links for published recipes, version labels, a stored report, and rate limits.
- Account export and deletion, audit events, and a personal north-star count (verified completed runs).

Out of scope, and shown as disabled rather than simulated:

- Money movement, legal/medical/government filing, emailing other people, scraping, or acting on third-party accounts.
- OAuth connectors, payments, and outbound email.
- Claims of compliance certification or production readiness.

## Integrations

| Capability | State | Reason |
| --- | --- | --- |
| SQLite persistence | Will be real from Stage 1 | Local file, migrations in git |
| First-party demo form | Will be real from Stage 3 | Row in Ripple's database |
| Arithmetic and text transforms | Will be real from Stage 3 | In-process, no network |
| Email login links | Disabled | No email provider |
| OAuth / third-party APIs | Disabled | No provider credentials; disallowed in MVP |
| Payments | Disabled | Out of scope |
| Hosted Postgres / Vercel | Documented, not verified | No hosted database in this environment |

## Primary mobile flow

Width target: 360–430px. One-handed, sticky primary action, bottom navigation.

1. **Explore.** Heading states the job. Search and topic chips sit under it. Cards show time, creator, permissions, and last verified date. Empty search is a real empty state.
2. **Recipe.** Full-screen detail: what it does, ordered steps, prerequisites, permissions, success criteria, risks, version, DEMO label when applicable. Primary button: "Preview and run".
3. **Preview.** Inputs and a consent checkbox per step. Run stays disabled until required consents are checked. Copy states that nothing has started.
4. **Console.** Status comes from saved rows: pending, running, needs approval, succeeded, failed, cancelled. Evidence, Stop, and Retry are visible when they apply. A demo-form step waits for an explicit save approval.
5. **My Runs.** The same person sees their private history after refresh. Another account opening the run URL does not see inputs or outputs.
6. **Create (signed in).** Build a draft from allowed blocks, validate, dry-run, publish. A later edit publishes a new version and leaves the old one immutable.
7. **Profile.** Account, local activity count, export, delete. Disabled integrations are listed with the reason.

### Happy path

Open "Split a bill fairly", enter 80 / 20% / 4 people, consent to each step, run, see $24.00, refresh, see the same succeeded run.

### Failure and permission paths

- Empty search: no cards, recovery hint, library itself remains reachable.
- Unknown slug: 404, no invented recipe.
- Missing consent: run is not created.
- Invalid number: field error, run is not created.
- Divide by zero or failed step: persisted failed status and retry. No fake success.
- Second click with the same idempotency key: one run.
- Another person, or no session: public recipe is visible; the run is not.
- Private draft: owner only. Everyone else gets 404.
- Unknown block type: publish rejected and execution fails closed.
- Report: stored for review. No claim that a moderator already acted.
- Rate limit: 429 with a plain explanation.

## Component map (lean)

Design system first, then product components:

- Shell: skip link, header, mobile bottom nav, footer limitation line, toasts.
- Primitives: button, text field, textarea, checkbox, badge, card, dialog, skeleton, empty state, status pill.
- Product: recipe card, filter bar, step list, permission list, consent form, run console, version stamp, block editor, report dialog, disabled-integration list.

## Domain model for Stage 2 only

Stage 2 persists only what Explore and detail need:

- `users` — id, handle, display name, kind (`demo` for the seeded publisher).
- `workflows` — owner, slug, title, summary, category, visibility, estimated minutes, origin (`demo_seed`), published version pointer.
- `workflow_versions` — version number, permissions JSON, risks, success criteria, prerequisites, test status, published time, last verified time. Published rows are not updated later.
- `workflow_steps` — version, ordinal, type, title, config JSON.

Runs, approvals, sessions, reports, and audit rows wait until the stage that uses them.

## Security boundary

- Public read: published public recipes only.
- Writes and personal runs: session required (guest session is enough to run; member session is required to publish).
- Every run and draft read/write checks the owner. Missing rows and forbidden rows both return 404 for private objects.
- Consent recorded before any step executes. Secrets and password hashes never go into logs, safe results, or exports of someone else's data.
- Demo-form payload is the visitor's own checklist, stored server-side, shown only to that visitor.
- No execution against another person's account.

## Prioritized build and test plan

1. Stage 1 — toolchain, tokens, shell, Explore empty state backed by SQLite, smoke test, screenshots at 390 and 1440.
2. Stage 2 — seed three DEMO recipes, search, filters, detail, invalid URL.
3. Stage 3 — consent, validation, calculator run, persisted statuses, idempotency, stop, retry.
4. Stage 4 — draft builder, dry-run, immutable publish v1 then v2, ownership.
5. Stage 5 — share link, version/source labels, report, rate limit, public-block confirmation. Private runs stay private.
6. Stage 6 — authorization audit, export/delete, metrics, CI, runbook, pilot plan, full test pass.

Non-negotiable regressions, automated when the behavior exists:

- No step runs before authorization.
- A shared run never exposes the originator's inputs or outputs.
- Double submit does not execute twice.
- A published version does not change after later edits.
- An unknown block fails closed.

## Technical risks

1. **Next.js caching vs private data.** Personalized runs must not be cached across users. Ripple will keep authorization-sensitive pages dynamic and review cache settings in Stage 6.
2. **SQLite on serverless hosts.** The verified runtime is a local SQLite file. Vercel needs a hosted database; that path is not verified here.
3. **Idempotency races.** Two requests with one key must serialize on a unique constraint. Stage 3 tests the duplicate, including a close pair.
4. **Floating-point money.** The calculator will use a decimal library, with a fixture for the bill splitter so cents do not drift.
5. **Consent UX vs a dead button.** The primary action is disabled until consent is complete, with text that says why, so a disabled control is explained rather than inert.

## Stage 1 checklist

- Strict TypeScript Next.js app, Tailwind, ESLint, Vitest, Playwright, Drizzle, SQLite migrations.
- `.env.example` with names only.
- Design tokens: `#111318`, `#FAFAF7`, `#C8F36A`. Fraunces for headings, a plain sans for UI. Focus rings, skip link, reduced motion, 404 and error boundaries.
- Header and bottom navigation. Links that do not exist yet are visibly disabled with a reason, not dead ends.
- Explore reads the database. With no rows it shows an empty library, not fake recipes.
- Commands recorded: lint, typecheck, unit test, production build, screenshots at 390px and 1440px.
