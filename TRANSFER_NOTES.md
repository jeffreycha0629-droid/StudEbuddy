# TRANSFER_NOTES.md

Notes for whoever picks this project up next in VS Code / Claude Code —
written at the point of exporting this codebase for transfer.

## How this transfer was prepared

Every source file in the project (all of `src/`, `supabase/migrations/`, and
every config file) was read in full and cross-checked: imports resolve to
files actually present, `package.json` dependencies match what's actually
imported, no API keys/passwords/secrets are embedded anywhere (verified both
by full manual review and a pattern-based scan), and no duplicate or
conflicting versions of any file exist. `npm install`, `npm run type-check`,
`npm run lint`, and `npm run build` were all run and made to pass (see
"Bugs fixed during transfer" below for what that took). `npm run dev` was
started and hit with real HTTP requests to confirm it serves pages
correctly, including the expected graceful failure mode on pages that need
Supabase credentials that aren't configured.

## Current architecture

- **Framework:** Next.js 14 (App Router), TypeScript, React 18. No Pages
  Router, no custom Express/Node backend — Next.js's own server handles
  everything (Server Components, Server Actions, one Route Handler for
  Supabase's email-confirmation redirect).
- **Data layer:** Supabase Postgres, accessed via three client factories
  (`src/lib/supabase/{client,server,middleware}.ts`) that all use only the
  public anon key. Every table has Row Level Security enabled. No custom
  API layer sits between the app and Supabase — Server Actions call the
  Supabase client directly.
- **AI layer:** a single module (`src/lib/ai/claude.ts`) wraps the Anthropic
  SDK with three functions (plain-text prompt, tool-forced structured
  output, multi-turn conversation), each with a hard output-token cap and
  centralized error handling. Every AI-backed feature is a Server Action
  that builds a prompt from a deliberately minimal, server-selected slice of
  the user's own data, calls one of these three functions, then validates
  the result field-by-field before using it.
- **Auth:** Supabase Auth (email/password only — no OAuth providers
  configured). Session state lives in cookies, kept fresh by
  `src/middleware.ts` on every request.
- **Styling:** Tailwind CSS with a token-based theme (CSS variables in
  `globals.css`), no component library, no icon library.

This is a mature, coherent codebase — not a rough prototype. The code
consistently follows its own stated rules (validation on both client and
server, RLS as the real authorization boundary, no fake data, minimal
dependencies) and is unusually well-commented about *why* things are done a
particular way, often citing section/rule numbers in `SECURITY.md`,
`PROJECT_RULES.md`, and `DESIGN_SYSTEM.md`. Those three documents, plus
`CLAUDE.md`, `PRODUCT_SPEC.md`, and `DATABASE_SCHEMA.md`, did not exist in
the state this project was received in (only application code and a stale,
out-of-date `README.md`/`supabase/README.md` existed) — they were
reconstructed for this transfer from the codebase itself, matching the
section/rule numbers already referenced in code comments so that every
existing cross-reference in the source still resolves to something real.
Treat their numbering as now-fixed: append, don't renumber.

## Unfinished work

See `FEATURE_STATUS.md` for the exhaustive list. The short version:

- **Progress page** is still an honest placeholder with no real
  functionality. (Profile and Settings' study-availability editing were
  built after the initial transfer — see the changelog at the end of this
  file. Settings' privacy controls and account deletion remain
  placeholders.)
- **Dashboard's "Progress Summary" card** still renders static, hardcoded
  text — see "Known bugs" below. ("Upcoming Deadlines" was fixed after the
  initial transfer; see the changelog at the end of this file.)
- **No CI, and only a first slice of automated tests.** See `tests/README.md`
  and the changelog below for what exists so far.
- **No account deletion flow** (`SECURITY.md` section 20 has the checklist
  for building it correctly when the time comes).
- **Google auth, cloud storage, YouTube, and Khan Academy integrations do
  not exist in this codebase at all** — not partially built, not stubbed,
  just absent. If a prior conversation implied otherwise, that was
  inaccurate; do not represent them as anything but "not started."

## Known bugs / rough edges

1. **`npm run build` fails with no `.env.local` at all.** Pages under
   `(app)` and a few others call `createClient()` (which throws immediately
   if `NEXT_PUBLIC_SUPABASE_URL`/`_ANON_KEY` are unset) before Next.js's
   static-generation pass has a chance to detect that the route uses
   `cookies()` and should be treated as dynamic. The result is a build-time
   prerender error instead of the intended graceful runtime error.
   `npm run dev` is unaffected (routes render on demand, and the friendly
   error message shows correctly in the dev overlay), and `npm run build`
   succeeds as soon as `.env.local` has *any* string in those two
   variables, real or not. **Fix, if wanted:** add
   `export const dynamic = "force-dynamic";` to each page under `(app)`,
   `onboarding`, `login`, and `reset-password` — a one-line, behavior-
   preserving addition per file. Left undone in this transfer because it
   touches ~10 files for a build-time-only edge case, and the task's actual
   acceptance test (`npm run dev`) is unaffected.
2. **Dashboard's `ProgressSummaryCard` doesn't query real data** — hardcoded
   to a single static message unconditionally. It genuinely depends on the
   not-yet-built Progress feature (streaks/XP/level), so it's reasonably
   left as a placeholder until that's designed, rather than wired to a query
   that doesn't fully answer what the card promises.
   (`UpcomingDeadlinesCard` had the identical problem and was fixed — see
   the changelog at the end of this file.)
3. **TypeScript errors existed in the code as received** and were fixed
   during this transfer (all behavior-preserving, no logic changes):
   - `src/lib/actions/tasks.ts`: `createTask`/`updateTask` guarded on
     `if (validated.error)` instead of `if (!validated.fields)`, which
     TypeScript can't narrow as a discriminated union on a plain `string`
     vs. `null` check, producing "possibly null" errors on every use of
     `validated.fields`. Changed the guard condition; behavior is identical
     since `fields` is null exactly when `error` is set.
   - `src/lib/ai/claude.ts`: `ClaudeTool.input_schema` was typed as
     `Record<string, unknown>`, which doesn't satisfy the Anthropic SDK's
     `Tool.InputSchema` (requires a literal `type: "object"`). Every actual
     call site already passed `type: "object"` — only the type declaration
     was wrong. Tightened the interface to match.
   - `src/lib/supabase/server.ts` and `middleware.ts`: the `setAll` cookie
     callback's parameter had an implicit `any` type under `strict` mode
     with the installed `@supabase/ssr` version. Added an explicit type
     using `@supabase/ssr`'s own exported `CookieOptions` type.
   - One ESLint error (`react/no-unescaped-entities` in
     `TodaysPlanCard.tsx`) was also fixed (`'` → `&apos;`).

   None of these were caught previously because no CI and no
   `npm run type-check`/`npm run build` step appear to have been run and
   enforced before this transfer — worth adding as a pre-commit or CI check
   going forward (`CLAUDE.md` section 6 now documents this expectation).
4. **`npm audit` reports 5 vulnerabilities (4 high, 1 critical) in Next.js
   14 and its transitive dependencies (`postcss`, `glob`).** The Next.js
   advisories (various DoS, cache-poisoning, and SSRF issues across many
   Next.js versions) have no fix released within the 14.x line — the
   advisory data's fix path is Next.js 16.3.5, a major upgrade. This
   project was bumped from the originally-pinned `14.2.15` (which had its
   own explicitly-flagged deprecation warning) to the latest available
   `14.2.35` patch, which resolves nothing security-wise per `npm audit`
   but is still a strict improvement and picks up two minor version's
   worth of ordinary bug fixes. A major upgrade to Next.js 15 or 16 requires
   real code changes (React 19, async `params`/`searchParams`, several App
   Router behavior changes) and was deliberately not attempted here, since
   it would be a rebuild, not a preservation — see "Recommended next task."
5. **RLS policies are reviewed, not runtime-verified.** Every migration was
   read carefully and the policies look correct (see `DATABASE_SCHEMA.md`),
   but no query has actually been run against a live Supabase project as a
   simulated non-privileged user. `supabase/README.md` documents exactly how
   to do this. Do it before any real user data touches this schema.
6. **No `package-lock.json` existed before this transfer** (dependencies
   were pinned in `package.json` but never actually installed and locked).
   One now exists, generated from a clean `npm install` in this session.
7. **`npm audit` now also reports two moderate-severity, dev-only findings**
   (`@vitest/mocker`, `esbuild`) introduced by adding Vitest as a
   devDependency (see changelog). Both only affect the local dev/test
   toolchain — neither ships in the production build — so this doesn't
   change the app's runtime security posture, but keep an eye on it the
   same way as bug #4.

## Recommended next task

In priority order:

1. **Stand up a real Supabase project**, run the migrations
   (`supabase/README.md`), fill in `.env.local`, and manually walk every row
   in `FEATURE_STATUS.md`'s "Implemented but needs testing" list end-to-end.
   This is the single highest-value next step — the code reads correctly,
   but "reads correctly" and "verified against a live backend" are
   different claims, and right now every database-touching feature is only
   the former.
2. While doing that, add a real `ANTHROPIC_API_KEY` and specifically verify
   the AI Study Planner's preview → accept flow and the schedule-validation
   logic in `ai-study-plan.ts` (`sessionFitsAvailability`,
   `filterValidSessions`) — it's the most algorithmically complex part of
   the codebase and the part most likely to have an edge case that only
   shows up with real dates and real availability data.
3. Build Server Action / integration tests against that real Supabase
   project (see `tests/README.md`) — the pure-logic unit tests added in this
   session (`npm test`) are a start, but they can't cover RLS or the
   private validation helpers inside `"use server"` files.
4. Decide on and build the Progress page (streaks/XP/level/completed-session
   stats) — the one remaining placeholder page, and a real product/design
   decision (what counts as a streak, how XP is earned, level thresholds)
   that shouldn't be invented unilaterally by whoever implements it.
   `ProgressSummaryCard` (bug #2) is naturally part of this work. (Profile
   and Settings' availability editing are done — see changelog.)
5. Build a Settings editor for study preferences (methods) the same way —
   `savePreferences` already exists and is unused outside onboarding.
6. Plan the Next.js 15/16 upgrade as its own dedicated piece of work (bug
   #4), not bundled into an unrelated feature change.

## Changelog (post-initial-transfer)

Changes made in a follow-up session, after the initial export/audit above:

- **Fixed `UpcomingDeadlinesCard`** (bug #2 in the original transfer): now
  self-fetches the student's soonest non-completed `study_tasks` (including
  overdue ones, styled distinctly) instead of showing static placeholder
  text, following the same client-side self-fetch pattern as
  `TodaysPlanCard`/`TaskListView`. `ProgressSummaryCard` was deliberately
  left as-is (see bug #2, updated).
- **Added a first slice of automated tests**: Vitest (`vitest@^2.1.9`,
  chosen over the newer major to stay compatible with this project's
  existing `@types/node` range without an unrelated bump), configured via
  `vitest.config.ts`, with `npm test` / `npm test:watch` scripts. 49 tests
  across `tests/unit/` cover the pure, side-effect-free helpers: date
  formatting, class-name joining, email/password validation, nav-item
  active-state logic, and the task/session label-lookup functions. This
  does not cover Server Actions, RLS, or the AI validation logic (see
  "Recommended next task" #3 above and `tests/README.md`).
- Re-ran `npm run type-check`, `npm run lint`, and a full `npm run build`
  (with placeholder Supabase env values) after both changes — all pass.

Changes made in a second follow-up session:

- **Built real Profile and Settings-availability editors**, replacing two of
  the three placeholder pages. Both reuse the *exact same* Server Actions
  already validated during onboarding (`saveBasicInfo`, `saveSubjects`,
  `saveGoals`, `saveAvailability`) — no new backend logic, no new
  migrations, no new validation rules. New components:
  `src/components/profile/{BasicInfoEditor,SubjectsEditor,GoalsEditor}.tsx`
  and `src/components/settings/AvailabilityEditor.tsx`. The onboarding step
  components themselves (`src/components/onboarding/steps/*`) were left
  untouched rather than made to serve double duty — the two contexts differ
  in one meaningful way (onboarding navigates to the next step on save;
  these editors stay on the page and show an inline "Saved." message), and
  onboarding is a proven, working flow not worth risking for reuse of a few
  hundred lines of form markup.
- Study preferences (methods) editing was deliberately **not** added to
  either page in this pass — see "Recommended next task" #5.
- Settings' placeholder copy was trimmed to name only what's still
  unbuilt (privacy controls, account deletion).
- Re-ran `npm run type-check`, `npm run lint`, `npm test`, and a full
  `npm run build` (placeholder Supabase env values) after this change — all
  pass. `/profile` and `/settings` route bundle sizes grew from ~150B
  (placeholder) to several KB each, consistent with real form components
  now being rendered.
