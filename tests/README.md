# tests/

Test runner: [Vitest](https://vitest.dev), configured in `vitest.config.ts`
at the project root.

```bash
npm test         # run once
npm run test:watch   # watch mode
```

## What's covered so far

`tests/unit/` has unit tests for the pure, side-effect-free helper modules —
no Supabase, no network, no DOM:

- `date.test.ts` — `getLocalDateString` (`src/lib/utils/date.ts`)
- `cn.test.ts` — the `cn` class-name helper (`src/lib/utils/cn.ts`)
- `validation-auth.test.ts` — email/password validation
  (`src/lib/validation/auth.ts`)
- `nav-items.test.ts` — active-nav-item logic (`src/lib/nav-items.ts`)
- `task-format.test.ts` — the label-lookup helpers in `task-format.ts` and
  `session-format.ts`
- `onboarding-constants.test.ts` — `parseTimeToMinutes`
  (`src/lib/onboarding-constants.ts`)

## What's *not* covered, and why

- **Server Actions** (`src/lib/actions/*.ts`) — every mutation and AI call
  in the app lives here, but these files use `"use server"`, which restricts
  their exports to async functions only. The interesting validation logic
  inside them (`validateTaskFields` in `tasks.ts`, `validateAiSessions` and
  `sessionFitsAvailability` in `ai-study-plan.ts`, etc.) is deliberately
  *not* exported, so it can't be unit-tested by importing it directly.
  Testing this layer means either (a) integration-testing the exported
  action functions themselves against a real or mocked Supabase client, or
  (b) extracting the pure validation logic into a separate, testable module
  that the action then calls — a real refactor, not a test-only change,
  and one that should be a deliberate decision rather than a side effect of
  wanting tests.
- **Row Level Security** — can only be meaningfully tested against a real
  Postgres/Supabase project, run as a simulated non-privileged user. See
  `supabase/README.md`'s "testing Row Level Security correctly" section.
- **End-to-end flows** (signup → onboarding → task → AI plan → timer) — no
  Playwright/Cypress setup exists yet.
- **UI component rendering** — no React Testing Library / jsdom setup yet;
  today's suite runs in plain Node (`environment: "node"` in
  `vitest.config.ts`).

## Recommended next steps, in order

1. Server Action integration tests against a real (test) Supabase project —
   the security guarantees in `SECURITY.md` are only actually proven by a
   test that runs as an authenticated, non-privileged user, not by reading
   the code.
2. End-to-end tests (Playwright) for the critical path: signup → onboarding
   → create task → generate/accept an AI study plan → run a session with
   the timer.
3. Component tests (would need `jsdom` + `@testing-library/react` added as
   devDependencies) if UI regressions become a recurring problem.

See `FEATURE_STATUS.md`'s "Implemented but needs testing" rows for the full
backlog this maps to.
