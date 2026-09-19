# tests/

No automated test suite exists yet for this project — no Jest, Vitest,
Playwright, or Testing Library setup, and no test files anywhere in the
codebase as received. This directory is a placeholder so the expected
project structure exists, not evidence that tests were written and removed.

## Recommended starting point

For a Next.js App Router + Server Actions codebase like this one:

- **Unit tests** for the pure logic that's easiest to get real value from
  first: `src/lib/utils/date.ts`, `src/lib/*-format.ts`, and the validation
  functions inside `src/lib/actions/*.ts` (e.g. `validateAiSessions` in
  `ai-study-plan.ts`, `validateTaskFields` in `tasks.ts`). Vitest is a
  reasonable choice — fast, minimal config, works well with TypeScript and
  the App Router.
- **Server Action integration tests** against a real (test) Supabase
  project, exercising RLS as a real user rather than mocking Supabase
  entirely — the security guarantees in `SECURITY.md` are only actually
  proven by a test that runs as an authenticated, non-privileged user.
- **End-to-end tests** (Playwright) for the critical paths: signup → onboarding
  → create task → generate/accept an AI study plan → run a session with the
  timer.

See `FEATURE_STATUS.md` for the current "Implemented but needs testing"
list — that list is effectively the initial test-writing backlog.
