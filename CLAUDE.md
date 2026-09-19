# CLAUDE.md

Guidance for Claude Code (or any AI coding agent) working in this repository.

## 1. What this project is

StudEbuddy is an AI-powered study companion for students: task tracking,
manual and AI-generated study plans, a study timer, daily check-ins, and an
AI "Study Buddy" chat — built on Next.js (App Router), Supabase (Postgres +
Auth), and the Anthropic API. See `PRODUCT_SPEC.md` for the product vision
and `FEATURE_STATUS.md` for exactly what's built versus planned.

## 2. Stack

- **Framework:** Next.js 14 (App Router), TypeScript, React 18
- **Styling:** Tailwind CSS, CSS variables for theming (`src/app/globals.css`)
- **Backend:** Supabase (Postgres, Auth, Row Level Security) — no custom
  backend server exists; all persistence goes through Supabase
- **AI:** Anthropic API (`@anthropic-ai/sdk`), called only from
  `src/lib/ai/claude.ts` via Server Actions
- **No** other cloud services, no custom REST/GraphQL API layer

## 3. Ground rules for changes

- **Preserve the App Router structure.** Routes live in `src/app`, grouped
  into `(marketing)` (public), `(app)` (authenticated shell with sidebar/mobile
  nav), and `onboarding` (its own minimal shell). Don't flatten this into a
  different routing style without a strong reason.
- **Server Actions, not API routes, for app logic.** Every mutation and every
  AI call is a `"use server"` action in `src/lib/actions/`. Keep following
  this pattern rather than introducing `route.ts` API handlers for things a
  Server Action already covers well.
- **Never call Supabase or Anthropic directly from a Client Component** for
  anything that needs authorization or a secret. Client Components may only
  use the anon-key Supabase client (`src/lib/supabase/client.ts`) for
  RLS-protected reads/writes a user is allowed to do as themselves (see
  `SECURITY.md` sections 5–6). Anthropic is server-only, always.
- **Match existing validation discipline.** Every Server Action re-validates
  its own input server-side, even when a client already validated it. Look at
  `src/lib/actions/tasks.ts` or `src/lib/actions/check-in.ts` before adding a
  new action, and follow the same shape (typed input/result interfaces,
  explicit field checks, generic error messages to the client, real errors
  logged server-side only).

## 4. No Fake Functionality

If a feature isn't built yet, its page must say so honestly — see
`src/components/PlaceholderPage.tsx` and `DESIGN_SYSTEM.md` section 13. Never:

- Hardcode fake data that looks like it came from a real user or a real AI
  response.
- Simulate a network call with a `setTimeout` and canned output.
- Claim a page "works" when it silently no-ops.

If you build a feature partially, ship what's real and label the rest as not
built (see `FEATURE_STATUS.md` for the exact status vocabulary this project
uses). This rule is why the codebase currently has zero `localStorage`-backed
"prototype simulation" features — everything shipped so far is wired to the
real Supabase/Anthropic backend, or is an honest placeholder.

## 5. Security posture (see SECURITY.md for the full document)

The short version, repeated because it's easy to violate by accident:

- Authorization is enforced by Postgres Row Level Security and by explicit
  `user_id` filters in every query — never by hiding a button in the UI.
- The AI is never an authorization boundary (`PROJECT_RULES.md` rule 18):
  application code decides what data Claude is allowed to see and do,
  before Claude is ever called.
- `ANTHROPIC_API_KEY` and any future service-role key are server-only and
  must never reach a file a Client Component imports.

## 6. Before committing a change

Run, in this order, and fix anything that fails before considering the work
done:

```bash
npm run type-check
npm run lint
npm run build
```

`npm run build` requires `.env.local` to exist with at least placeholder
Supabase values (see `README.md`) — Next.js needs real-looking config present
to decide which routes are static vs. dynamic during the build.

## 7. Where to look first

| Task | Start here |
|---|---|
| Add a new database-backed feature | `DATABASE_SCHEMA.md`, then a new `supabase/migrations/*.sql` file, then a Server Action in `src/lib/actions/` |
| Add a new AI-backed feature | `src/lib/ai/claude.ts` (don't add a second Anthropic client), then a Server Action that builds the prompt and validates the structured/plain-text result |
| Change how something looks | `DESIGN_SYSTEM.md` and the existing `src/components/ui/*` primitives before writing new markup from scratch |
| Understand current gaps | `FEATURE_STATUS.md` and `TRANSFER_NOTES.md` |
