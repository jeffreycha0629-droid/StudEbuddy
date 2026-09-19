# PRODUCT_SPEC.md

## What StudEbuddy is

StudEbuddy is a web app that helps students turn a pile of assignments into a
realistic, personalized study plan — and helps them actually follow it. It
combines manual planning tools (tasks, a study session builder, a timer) with
an AI layer (Claude, via the Anthropic API) that can generate a study plan,
break an assignment into steps, explain a concept, and answer study
questions in context.

It is **not**: a learning-management system, a grading tool, a messaging
platform, a general-purpose chatbot, or a medical/mental-health app. The
daily check-in and study-preferences features collect self-reported signals
to make planning better — they are explicitly not a clinical assessment (see
`SECURITY.md` section 17).

## Target user

A middle/high-school or college student who has multiple classes, real
deadlines, and wants help figuring out *what* to study and *when*, not just a
place to write down due dates.

## Core user journey

1. **Sign up** → **Onboarding** (name, grade level, subjects, goals, study
   preferences, weekly availability) → land on the **Dashboard**.
2. Add academic work as **Tasks** (Study Plan page) with a type, due date,
   difficulty, and estimated time.
3. Build a **Study Plan** of sessions for a task — either manually (pick a
   date, topic, duration, method) or by asking the **AI Study Planner** to
   propose one from the task's details, the student's availability, study
   preferences, and today's check-in (if any). AI plans are always previewed
   and editable before anything is saved — never auto-saved.
4. On the **Dashboard**, see today's sessions and daily check-in prompt. Run
   a session with the **Study Timer** (start/pause/resume/end, with an
   optional post-session confidence rating).
5. See everything on a monthly **Calendar** (deadlines and sessions
   together).
6. Get unstuck via **Study Buddy**: a chat that knows the student's own
   upcoming tasks, today's sessions, and today's check-in (energy/focus/
   challenge only), plus dedicated tools to break an assignment into steps
   or get a concept explained in a chosen style (simple/normal/detailed/
   example/analogy).

## Feature areas and where they stand

See `FEATURE_STATUS.md` for the authoritative, exhaustive list. Summary:

| Area | Status |
|---|---|
| Auth (signup/login/logout/password reset) | Implemented, needs testing against a live Supabase project |
| Onboarding (7 steps) | Implemented, needs testing |
| Task management | Implemented, needs testing |
| Manual study plan builder + timer | Implemented, needs testing |
| Daily check-in | Implemented, needs testing |
| Calendar | Implemented, needs testing |
| AI Study Planner (preview → accept, with regeneration) | Implemented, needs testing (requires a real Anthropic key) |
| AI Assignment Breakdown | Implemented, needs testing |
| AI Concept Explanation | Implemented, needs testing |
| AI Study Buddy chat | Implemented, needs testing |
| Progress tracking (streaks, XP, level, completed-session stats) | Planned — page exists as an honest placeholder |
| Profile editing (name, grade, subjects, goals) | Implemented, needs testing |
| Settings — study availability editing | Implemented, needs testing |
| Settings (privacy, account deletion) | Planned — placeholder text only |
| Google auth, cloud storage, YouTube, Khan Academy integrations | **Not started** — no code for any of these exists anywhere in this codebase |

## Explicitly out of scope for now

- Any third-party integration beyond Supabase and Anthropic. Nothing in this
  codebase talks to Google, YouTube, or Khan Academy — those are ideas for
  later, not partially-built features.
- Persistent Study Buddy chat history. Conversations live only in the
  browser tab for the current visit; refreshing starts fresh, by design
  (deferred until retention/privacy behavior is explicitly decided — see
  `DATABASE_SCHEMA.md`'s note on `ai_requests`).
- Multi-device real-time sync beyond what Supabase gives for free (data is
  shared across devices because it's in Postgres, but there's no live
  "seeing the same screen update in real time" feature).
- Notifications/reminders (email, push, or otherwise).
- Teacher/parent accounts or any multi-user-per-account concept — one
  Supabase Auth user is one student, full stop.

## Design commitments

- Desktop-first, fully responsive (see `DESIGN_SYSTEM.md`).
- Never show fake data or a feature that silently does nothing — an unbuilt
  page says so (`CLAUDE.md` section 4, `DESIGN_SYSTEM.md` section 13).
- AI features are always reviewable before they change real data (the AI
  Study Planner's preview step is the clearest example) and never claim more
  certainty than they have (concept explanations and assignment breakdowns
  are explicitly instructed not to invent specific facts or requirements).
