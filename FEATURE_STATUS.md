# FEATURE_STATUS.md

Exhaustive feature-by-feature status, based on a full read-through of every
source file in this codebase during transfer (see `TRANSFER_NOTES.md` for
audit method). Status labels:

- **Implemented and tested** — code exists, and its behavior was actually
  verified working (build/lint/type-check passing, and/or manually exercised
  against real output).
- **Implemented but needs testing** — code exists, looks complete and
  correct on review, but has not been exercised end-to-end against a real
  Supabase project and/or a real Anthropic API key (neither was available
  during this transfer). This is the status for almost everything that
  touches the database or the AI, and it is not a mark against the code —
  it's an honest statement that "compiles and reads correctly" isn't the
  same as "verified against a live backend."
- **Prototype simulation** — a feature that fakes real behavior (typically
  with `localStorage`) instead of using a real backend.
- **Planned** — no functional code exists yet; at most an honest placeholder
  page.
- **Blocked** — planned, but can't proceed without an external decision or
  resource not yet available.

## Auth & session

| Feature | Status |
|---|---|
| Sign up (Supabase Auth) | Implemented but needs testing |
| Log in | Implemented but needs testing |
| Log out | Implemented but needs testing |
| Forgot password / reset password email flow | Implemented but needs testing (depends on Supabase project email delivery being configured) |
| Session refresh via middleware | Implemented but needs testing |
| Route guards on authenticated pages (`(app)`, `/onboarding`) | Implemented but needs testing |

## Onboarding

| Feature | Status |
|---|---|
| 7-step flow (Welcome → Basic Info → Subjects → Goals → Preferences → Availability → Complete) | Implemented but needs testing |
| Resuming onboarding with previously-saved answers | Implemented but needs testing |
| Server-side gate requiring name + grade level before completion | Implemented but needs testing |

## Tasks (Study Plan page)

| Feature | Status |
|---|---|
| Create task | Implemented but needs testing |
| Edit task | Implemented but needs testing |
| Delete task (with inline confirm) | Implemented but needs testing |
| Mark task complete/incomplete (optimistic UI) | Implemented but needs testing |
| Filter by subject/status/due date | Implemented but needs testing |
| Overdue/Today/Upcoming/Completed sectioning | Implemented but needs testing |

## Study plans & sessions (manual)

| Feature | Status |
|---|---|
| Get-or-create a plan for a task | Implemented but needs testing |
| Add/edit/remove a session | Implemented but needs testing |
| Study timer (start/pause/resume/end) | Implemented but needs testing |
| One-active-session-per-user enforcement (DB-level) | Implemented but needs testing |
| Post-session confidence rating (1–5, optional) | Implemented but needs testing |

## Daily check-in

| Feature | Status |
|---|---|
| Submit today's check-in (mood/energy/focus/motivation/challenge) | Implemented but needs testing |
| Edit today's check-in | Implemented but needs testing |
| One check-in per calendar day (DB-enforced upsert) | Implemented but needs testing |

## Calendar

| Feature | Status |
|---|---|
| Month grid with tasks (deadlines) and sessions | Implemented but needs testing |
| Task/session detail panel on click | Implemented but needs testing |
| Month navigation (prev/next/today) | Implemented and tested (pure client-side date logic, no backend dependency) |

## AI features (all require a real `ANTHROPIC_API_KEY` to function)

| Feature | Status |
|---|---|
| AI connection test (Settings page) | Implemented but needs testing |
| AI Study Plan — preview generation | Implemented but needs testing |
| AI Study Plan — accept/save (with schedule re-validation) | Implemented but needs testing |
| AI Study Plan — edit a proposed session before accepting | Implemented but needs testing |
| AI Study Plan — regenerate with a reason, replacing non-completed sessions | Implemented but needs testing |
| AI Assignment Breakdown | Implemented but needs testing |
| AI Concept Explanation (5 styles) | Implemented but needs testing |
| AI Study Buddy chat (context-aware, quick actions) | Implemented but needs testing |
| Per-user AI rate limiting (5 requests / 60s, DB-backed) | Implemented but needs testing |

## Dashboard

| Feature | Status |
|---|---|
| Time-of-day greeting | Implemented and tested |
| Today's Plan card (live sessions + timer) | Implemented but needs testing |
| Daily Check-In card | Implemented but needs testing |
| Upcoming Deadlines card | Implemented but needs testing — now queries `study_tasks` for the student's soonest non-completed tasks (including overdue ones, styled distinctly) instead of showing static text. Fixed after the initial transfer; see `TRANSFER_NOTES.md`. |
| **Progress Summary card** | **Planned** — still a static placeholder. Genuinely depends on the not-yet-built Progress feature (streaks/XP/level), so left alone; see `TRANSFER_NOTES.md`. |

## Progress, Profile, Settings pages

| Feature | Status |
|---|---|
| Progress page (streaks, XP, level, completed-session stats) | Planned — honest placeholder only |
| Profile page — edit name/grade level | Implemented but needs testing — reuses the same `saveBasicInfo` Server Action as onboarding |
| Profile page — edit subjects | Implemented but needs testing — reuses `saveSubjects` |
| Profile page — edit goals | Implemented but needs testing — reuses `saveGoals` |
| Settings — study availability editing | Implemented but needs testing — reuses `saveAvailability`, same validation as onboarding's Availability step |
| Settings — study preferences (methods) editing | Planned — `savePreferences` exists and is exercised during onboarding, but no dedicated editor was built for it in Profile or Settings in this pass |
| Settings — privacy controls | Planned — honest placeholder only |
| Settings — account deletion | Planned — honest placeholder only (see `SECURITY.md` section 20 for what this needs to handle when built) |
| Settings — log out | Implemented but needs testing |

## Integrations explicitly called out by name

| Feature | Status |
|---|---|
| Google authentication | **Not started.** No code exists anywhere in this repository for Google OAuth or any provider other than Supabase's email/password auth. |
| Cloud storage (file uploads, etc.) | **Not started.** No storage integration of any kind exists. |
| YouTube integration | **Not started.** No code references YouTube anywhere. |
| Khan Academy integration | **Not started.** No code references Khan Academy anywhere. |
| AI (Anthropic/Claude) | **Implemented but needs testing** — this one is real: `src/lib/ai/claude.ts` and every AI Server Action are genuine, working integrations against the Anthropic API. They need a real `ANTHROPIC_API_KEY` to actually call Claude; without one, they fail gracefully with a clear "AI isn't configured yet" message rather than pretending to work. |

## Prototype simulations (localStorage-based fake features)

**None.** A full search of the codebase for `localStorage`, `sessionStorage`,
mock/fake data generators, and simulated network delays found zero matches
tied to feature behavior. Every feature in this codebase is either wired to
a real backend (Supabase and/or Anthropic) or is an honest, unbuilt
placeholder. This is worth stating explicitly because it means "Prototype
simulation" is an empty category for this project as received — if that
changes in future work, this table should gain rows.

## Testing infrastructure

| Item | Status |
|---|---|
| Unit test framework (Vitest) | Implemented and tested — configured (`vitest.config.ts`), runs via `npm test`. |
| Unit tests for pure logic (date/class-name/validation/nav/formatting helpers) | Implemented and tested — 49 tests across 6 files, all passing. See `tests/unit/`. |
| Server Action / integration tests | Planned — the validation logic inside `"use server"` action files (e.g. `validateAiSessions`) isn't exported and can't be unit-tested without either exporting it or a real/mocked Supabase client; see `tests/README.md`. |
| End-to-end tests | Planned |
| CI pipeline | Planned — no `.github/workflows` or equivalent exists |
| Manual RLS verification against a live Supabase project | Planned — documented as a manual procedure in `supabase/README.md`, not yet performed |
