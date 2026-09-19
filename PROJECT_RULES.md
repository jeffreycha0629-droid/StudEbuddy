# PROJECT_RULES.md

Engineering rules for StudEbuddy. Numbered so other documents and code
comments can reference a specific rule (e.g. "PROJECT_RULES.md rule 18").
Numbers are stable once assigned — don't renumber an existing rule; append
new ones instead.

## Architecture

1. **App Router only.** Routes live under `src/app`. Don't introduce the
   Pages Router alongside it.
2. **Server Actions for mutations and AI calls**, not hand-rolled API routes,
   unless something genuinely needs to be a webhook or OAuth callback (the
   one existing exception is `src/app/auth/confirm/route.ts`, which has to be
   a route because Supabase redirects a browser to it directly).
3. **One Supabase client per context**: `src/lib/supabase/client.ts` (browser,
   anon key), `src/lib/supabase/server.ts` (Server Components/Actions, anon
   key), `src/lib/supabase/middleware.ts` (session refresh only). Don't
   create additional ad-hoc Supabase client instances.
4. **One AI client.** `src/lib/ai/claude.ts` is the only file that imports
   `@anthropic-ai/sdk` or reads `ANTHROPIC_API_KEY`. Every AI-backed feature
   calls one of its exported functions rather than talking to the SDK
   directly.
5. Database types in `src/types/database.ts` are hand-written to mirror the
   migrations. If the schema grows substantially, consider switching to
   `supabase gen types typescript` — but keep the two in sync either way.

## Data handling

6. **Never see or store a user's raw password.** Passwords go directly from
   the browser to Supabase Auth over HTTPS (`supabase.auth.signUp` /
   `signInWithPassword`); no Server Action ever receives a password as a
   plain argument.
7. Every table with per-user data has Row Level Security enabled with
   explicit policies — see `DATABASE_SCHEMA.md`. A new table without RLS is a
   bug, not an oversight to fix later.
8. Every Server Action that reads or writes a specific row filters by
   `user_id = auth.uid()` explicitly, even though RLS would also block a
   cross-user access. This is defense in depth and it also lets us return a
   clean "not found" error instead of a raw permission error.
9. Client-supplied identifiers (task IDs, session IDs, etc.) are never
   trusted as-is — every action that uses one re-fetches it scoped to the
   authenticated user before acting on it.

## Errors and logging

10. Real error details (stack traces, database error codes, raw SDK errors)
    are logged server-side (`console.error`) and never returned to the
    client. Client-facing errors are short, specific, and actionable
    ("Please select a valid grade level.") or a safe generic fallback
    ("Something went wrong. Please try again.").
11. Two failure cases that must look identical to the client: "this record
    doesn't exist" and "this record belongs to someone else." Both return
    the same not-found message (see `SECURITY.md` section 12).

## AI usage

18. **The AI is never an authorization boundary.** Application code decides
    what data Claude may see and what it's allowed to produce *before*
    Claude is ever called — never by asking Claude nicely in a prompt to
    behave, and never by trusting Claude's output as sufficiently validated.
    Concretely: prompts are built from server-selected, minimal, per-user
    data; structured AI output is validated field-by-field before it touches
    the database (see `validateAiSessions` in
    `src/lib/actions/ai-study-plan.ts` for the canonical example); a schema
    match from the tool-use API is not treated as validation.
19. Every AI-calling Server Action is rate-limited per user via the
    append-only `ai_requests` table (see `DATABASE_SCHEMA.md`), because each
    call costs real money and hits a real third-party API.
20. AI responses are never silently substituted with fake content on
    failure. If the AI call fails, the user sees an error — not a canned
    "AI response."

## Dependencies

32. **Don't add a dependency for something a few lines of code can do.**
    Example: `src/lib/utils/cn.ts` is a 5-line hand-written replacement for
    `clsx`/`classnames` — this project has no icon library, no animation
    library, and no state-management library beyond React's own, for the
    same reason. Propose a new dependency only when the alternative is
    genuinely substantial (e.g., a real date-picker, not a `cn()` helper).

## Process

- When these rules and a specific ask from a user conflict, the explicit ask
  wins for that change — but flag the conflict rather than silently
  following either one.
- Rule numbers in this file are referenced from code comments throughout
  `src/`. If you renumber or remove a rule, grep the codebase for
  `PROJECT_RULES.md rule` and update every reference.
