# FEATURE_STATUS.md

Exhaustive feature-by-feature status, based on a full read-through of every
source file in this codebase during transfer (see `TRANSFER_NOTES.md` for
audit method). Status labels:

- **Implemented and tested** — code exists, and its behavior was actually
  verified working (build/lint/type-check passing, and/or manually exercised
  against real output).
- **Implemented but needs testing** — code exists, looks complete and
  correct on review, but has not been exercised end-to-end against a real
  backend. Most of this was later resolved for the non-AI features by
  running a real local Supabase stack (Postgres/Auth/REST, via
  `npx supabase start` — see `TRANSFER_NOTES.md`'s changelog) and driving
  the actual UI with Playwright; rows updated to **Implemented and tested**
  below say so explicitly, including what was and wasn't covered. Local and
  cloud Supabase run identical software, so this is real verification, not
  a mock — but it's still worth a pass against your own cloud project
  before trusting it with real users. AI features remain untested — they
  need a real `ANTHROPIC_API_KEY`, which no one has supplied yet.
- **Prototype simulation** — a feature that fakes real behavior (typically
  with `localStorage`) instead of using a real backend.
- **Planned** — no functional code exists yet; at most an honest placeholder
  page.
- **Blocked** — planned, but can't proceed without an external decision or
  resource not yet available.

## Auth & session

| Feature | Status |
|---|---|
| Sign up (Supabase Auth) | Implemented and tested — verified via Playwright against local Supabase (real signup, immediate session) |
| Log in | Implemented and tested — verified (log out, then log back in with the same credentials, landed on dashboard) |
| Log out | Implemented and tested — verified (redirected to `/login`) |
| Forgot password / reset password email flow | Implemented but needs testing (not exercised; local Supabase captures outgoing mail via Mailpit, which would let this be tested the same way, but it wasn't in this pass) |
| Session refresh via middleware | Implemented but needs testing — not directly exercised (would need a session nearing token expiry) |
| Route guards on authenticated pages (`(app)`, `/onboarding`) | Implemented and tested — every authenticated page visited during verification required the real session to render |

## Onboarding

| Feature | Status |
|---|---|
| 7-step flow (Welcome → Basic Info → Subjects → Goals → Preferences → Availability → Complete) | Implemented and tested — verified twice end-to-end via Playwright, including real database writes at each step |
| Resuming onboarding with previously-saved answers | Implemented but needs testing — the mechanism (pre-filling from the same data the Profile page reads) was indirectly confirmed, but re-visiting an in-progress onboarding step URL specifically wasn't exercised |
| Server-side gate requiring name + grade level before completion | Implemented but needs testing — the happy path (fields filled) was exercised; the rejection path wasn't |

## Tasks (Study Plan page)

| Feature | Status |
|---|---|
| Create task | Implemented and tested — verified via Playwright |
| Edit task | Implemented and tested — verified (renamed a task, new title persisted) |
| Delete task (with inline confirm) | Implemented and tested — verified (deleted, confirmed gone) |
| Mark task complete/incomplete (optimistic UI) | Implemented but needs testing — not exercised in this pass |
| Filter by subject/status/due date | Implemented but needs testing |
| Overdue/Today/Upcoming/Completed sectioning | Implemented but needs testing — tasks were created with future due dates, so only the "Upcoming" bucket was indirectly exercised |

## Study plans & sessions (manual)

| Feature | Status |
|---|---|
| Get-or-create a plan for a task | Implemented but needs testing — note: the task picker dropdown here doesn't refresh after adding a new task without a page reload; see `TRANSFER_NOTES.md` bug 0 |
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
| AI Study Plan — preview generation | Implemented but needs testing — same stale-dropdown caveat as the manual builder above (`TRANSFER_NOTES.md` bug 0) |
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
| Upcoming Deadlines card | Implemented and tested — now queries `study_tasks` for the student's soonest non-completed tasks (including overdue ones, styled distinctly) instead of showing static text; verified it displays a just-created real task immediately. Fixed after the initial transfer; see `TRANSFER_NOTES.md`. |
| **Progress Summary card** | **Planned** — still a static placeholder. Genuinely depends on the not-yet-built Progress feature (streaks/XP/level), so left alone; see `TRANSFER_NOTES.md`. |

## Progress, Profile, Settings pages

| Feature | Status |
|---|---|
| Progress page (streaks, XP, level, completed-session stats) | Planned — honest placeholder only |
| Profile page — edit name/grade level | Implemented but needs testing — reuses the same `saveBasicInfo` Server Action as onboarding (and that action is tested via onboarding); confirmed the Profile page correctly pre-fills from real data, but its own "Save Changes" button wasn't clicked in this pass |
| Profile page — edit subjects | Implemented but needs testing — same caveat as above, reuses tested `saveSubjects` |
| Profile page — edit goals | Implemented but needs testing — same caveat as above, reuses tested `saveGoals` |
| Settings — study availability editing | Implemented and tested — verified via Playwright: saved Wednesday's hours, reloaded the page, confirmed the value actually persisted (not just client-side state) |
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
| Manual RLS verification | Implemented and tested — performed against local Supabase (identical software to cloud): confirmed `study_tasks`'s policies actually block one user's token from seeing another user's row, not just that the policies exist in the migration. Only this one table was spot-checked this way; the rest are reviewed but not individually runtime-verified — see `supabase/README.md`. |
