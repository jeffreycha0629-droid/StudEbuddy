# SECURITY.md

Security posture and rules for StudEbuddy. Sections are numbered and
referenced by number from code comments (e.g. "SECURITY.md section 2") —
numbers are stable once assigned.

## 1. Threat model, in one paragraph

StudEbuddy stores a student's academic data (tasks, study sessions,
check-ins, goals) and lets them send some of it to a third-party AI
(Anthropic). The main things to protect against are: one user reading or
modifying another user's data, a compromised or malicious client bypassing
server-side checks, secrets (API keys) leaking into the browser or into
version control, and over-sharing student data with the AI provider beyond
what a feature actually needs.

## 2. Authorization is enforced at trusted server/database layers, not by hiding UI

Every access-control decision that matters is made in Postgres (Row Level
Security) or in a Server Action running on the server — never by simply not
rendering a button, and never by trusting a client-supplied flag. A
determined user with browser dev tools has the same access as what the
server and database actually allow, no more.

## 3. Authentication

- Supabase Auth handles signup, login, logout, and password reset. No custom
  auth system exists.
- Server-side code that needs to know "who is this request from"
  authoritatively calls `supabase.auth.getUser()`, which round-trips to
  Supabase's server to verify the session. It never relies on
  `getSession()`, which only decodes a local cookie and is not proof the
  session is still valid.
- The `(app)` route group and the `onboarding` layout both re-check
  `getUser()` server-side and redirect to `/login` if there's no valid user
  — this holds even if someone bookmarks or directly navigates to an
  authenticated URL.

## 4. Session management

`src/lib/supabase/middleware.ts` runs on (almost) every request and calls
`supabase.auth.getUser()`, which refreshes the session's access token via its
refresh token when needed and writes the updated cookies onto the response.
Without this, a signed-in user could appear logged out after roughly an hour
even with a valid refresh token.

## 5. The Supabase anon key is not a secret

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are safe to
ship to the browser — that's what `NEXT_PUBLIC_` means, and it's how
Supabase's client-side SDK is designed to work. The anon key alone grants no
special access; it identifies the project, and real access to data is
controlled entirely by Row Level Security (section 6), not by keeping this
key hidden.

## 6. Row Level Security (RLS) is the real enforcement mechanism

Every table holding per-user data has RLS enabled with explicit policies (see
`DATABASE_SCHEMA.md` for the full list). The pattern used throughout is:

```sql
create policy "Users can view their own X"
  on public.x for select
  using (auth.uid() = user_id);
```

With RLS enabled and no policy granting broader access, Postgres denies
access by default — there is no "everyone can read everything" fallback.
A future feature that genuinely needs to bypass RLS from trusted server code
(rare) would use `SUPABASE_SERVICE_ROLE_KEY`, which must be read only in
server-only files, never prefixed `NEXT_PUBLIC_`, and never returned to the
browser in any form. As of this transfer, no code uses the service-role key
at all.

## 7. Server Actions re-validate everything

Client-side validation exists only for fast UX feedback. Every Server Action
independently re-validates its input — types, ranges, enum membership,
string lengths, ownership of referenced rows — regardless of what the client
already checked. See `PROJECT_RULES.md` rules 8–9.

## 8. Passwords

No Server Action or API route ever receives a raw password as an argument.
Signup, login, and password update all call the Supabase Auth client SDK
directly from the browser (`supabase.auth.signUp`,
`signInWithPassword`, `updateUser`), which sends credentials straight to
Supabase over HTTPS. StudEbuddy's own server code never has the password in
memory.

## 9. Data minimization for AI context

When a feature builds a prompt from the student's own data (the AI Study
Planner, Study Buddy), it selects only the specific fields that feature
actually needs — not full-row dumps, and not unrelated tables. For example,
AI Study Plan generation reads only `energy` and `focus` from today's
check-in (never `mood`, `motivation`, or `challenge`, which aren't relevant
to session pacing); Study Buddy's context builder selects a capped number of
upcoming tasks and today's sessions, not the student's entire history. This
is enforced in code (explicit `.select()` column lists, `.limit()` calls),
not left as an instruction to the AI.

## 10. Rate limiting

Every AI-calling Server Action checks the append-only `ai_requests` table for
that user's request count in the last 60 seconds before calling Claude, and
logs the attempt afterward regardless of outcome. This is a real cost and
abuse control, not a UI nicety, and it's enforced server-side where a client
can't bypass it.

## 11. Server Actions and CSRF

Next.js Server Actions include built-in origin-checking protection against
cross-site request forgery; this project doesn't add custom CSRF tokens on
top of that, consistent with Next.js's documented security model for Server
Actions.

## 12. Ambiguous "not found" vs. "forbidden" responses

Every action that looks up a row by ID and checks ownership (a task, a study
session, a study plan) returns the exact same error whether the row doesn't
exist at all or belongs to a different user. This prevents a client from
using error messages to enumerate which IDs exist. The same principle
applies to Supabase Auth's own responses for login and signup (see
`mapLoginError`/`mapSignupError` in the auth components) — StudEbuddy
preserves Supabase's deliberate ambiguity about which emails have accounts
rather than exposing it.

## 13. Secrets

- `ANTHROPIC_API_KEY` and (if ever used) `SUPABASE_SERVICE_ROLE_KEY` are
  read only from `process.env` in server-only files, never committed, and
  never logged.
- `.env.local` is git-ignored. `.env.local.example` documents every variable
  with no real values.
- This repository was audited before transfer and contains no embedded API
  keys, passwords, or other secrets (see `TRANSFER_NOTES.md` for the audit
  method).

## 14. User-facing error messages never leak internal detail

Server Actions catch their own errors, log the real error with
`console.error` (server-side only), and return a short, safe message to the
client — e.g. "Something went wrong. Please try again." rather than a raw
database error code or stack trace. The one deliberate exception is
Supabase Auth's own error messages, which are already written to be
shown to end users (see `mapLoginError`/`mapSignupError`/`mapResetError`).

## 15. Input validation

All user input is validated server-side against explicit allow-lists,
ranges, and length limits defined in `src/lib/*-constants.ts` files and
enforced again in the corresponding Server Action — not just checked against
a regex once on the client. Database constraints (`check` clauses in the
migrations) are a second, independent layer under that.

## 16. Dependencies

Kept deliberately small — see `PROJECT_RULES.md` rule 32. Fewer third-party
packages means a smaller supply-chain surface. Run `npm audit` periodically;
see `TRANSFER_NOTES.md` for the current audit status and why one dependency
(Next.js itself) has a known, currently-unpatched-within-its-major-version
advisory.

## 17. Check-ins and preferences are self-reported wellness signals, not clinical data

The daily check-in (mood, energy, focus, motivation, biggest challenge) and
the onboarding "study preferences" step are explicitly framed to the user as
informal, self-reported signals — not a medical, psychological, or learning-
disability assessment of any kind (see the copy in `CheckInForm.tsx` and
`PreferencesStep.tsx`). The AI is instructed to use this data only to adjust
pacing (e.g., shorter sessions on a low-energy day) and explicitly told not
to comment on, interpret, or diagnose the student's health or mood. Treat
this data with care if a future feature (analytics, export, sharing) touches
it — it's still personal, even though it isn't clinical.

## 18. AI-specific risks

- **Prompt injection via user input:** a student's own free-text (chat
  messages, task notes, topics) is included in prompts sent to Claude.
  Nothing in this codebase currently treats AI output as a security decision
  (see rule 18 in `PROJECT_RULES.md`), so a successful injection can at most
  produce a bad *content* response, which is still validated field-by-field
  before being saved (see `validateAiSessions`, `validateSteps`) — it cannot
  grant access to another user's data or bypass authorization, because the
  AI never receives credentials, tool access to the database, or any
  capability beyond "generate text/structured output from what it was told."
- **Hallucinated facts:** prompts explicitly instruct Claude not to invent
  specific facts, requirements, or figures it wasn't given (see
  `assignment-breakdown.ts` and `concept-explanation.ts`).
- **Cost/abuse:** covered by rate limiting (section 10).

## 19. Known gaps (as of this transfer)

- No account-deletion flow exists yet (section 20).
- No automated security tests exist (see `FEATURE_STATUS.md` and
  `TRANSFER_NOTES.md`); the RLS policies have been reviewed by reading the
  migrations, not verified by running queries as different simulated users
  against a live database. `supabase/README.md` documents how to do that
  verification manually once a real Supabase project is connected.
- Next.js 14 has open security advisories with no patched 14.x release
  available (fixes require Next.js 15/16); see `TRANSFER_NOTES.md`.

## 20. Account deletion (future work)

Not implemented. When it is, it must delete or anonymize every table that
references the user across `profiles`, `subjects`, `study_goals`,
`study_preferences`, `study_availability`, `daily_checkins`, `study_tasks`,
`study_plans`, `study_sessions`, and `ai_requests` — most of these already
cascade automatically via `on delete cascade` on `user_id`, but this should
be verified table-by-table (see `DATABASE_SCHEMA.md`) and account deletion
should also revoke the Supabase Auth user itself, not just its rows.
