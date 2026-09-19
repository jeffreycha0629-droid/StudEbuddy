# DATABASE_SCHEMA.md

The database is Postgres, managed through Supabase. This document mirrors
`supabase/migrations/*.sql`, which is the source of truth — if this document
and the migrations ever disagree, the migrations are correct and this file
needs updating.

No migration has been run against a live Supabase project as part of this
transfer (no Supabase project is connected to this codebase yet). See
`supabase/README.md` for how to apply them by hand via the SQL Editor, and
`README.md` for first-time setup.

## Entity relationship overview

```
auth.users (Supabase-managed)
  └─ profiles            (1:1)
  └─ subjects            (1:many)
  └─ study_goals         (1:many)
  └─ study_preferences   (1:1)
  └─ study_availability  (1:many, up to one row per day-of-week)
  └─ daily_checkins      (1:many, one per calendar day)
  └─ study_tasks         (1:many)
  │    └─ study_plans        (1:1 via task_id, nullable)
  │         └─ study_sessions (1:many)
  └─ ai_requests         (1:many, append-only log)

subjects ──< study_tasks.subject_id (set null on delete)
subjects ──< study_sessions.subject_id (set null on delete)
study_tasks ──< study_plans.task_id (set null on delete)
study_tasks ──< study_sessions.task_id (set null on delete)
study_plans ──< study_sessions.study_plan_id (cascade on delete)
```

## Tables

### `profiles` (1 row per user)
Migration: `20260828120000_create_profiles.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid, unique, FK → `auth.users`, cascade delete | |
| `display_name` | text, nullable | |
| `grade_level` | text, nullable | one of `src/lib/onboarding-constants.ts` `GRADE_LEVELS` |
| `onboarding_completed` | boolean, default false | |
| `created_at`, `updated_at` | timestamptz | |

Auto-created by the `on_auth_user_created` trigger on `auth.users` insert
(`SECURITY DEFINER`, pinned `search_path`), seeded with `display_name` from
signup metadata if provided. RLS: select/insert/update own row only; no
delete policy yet (see `SECURITY.md` section 20).

### `subjects`
Migration: `20260828130000_create_onboarding_tables.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid, FK → `auth.users`, cascade delete | |
| `name` | text | |
| `created_at`, `updated_at` | timestamptz | |

RLS: full CRUD, own rows only.

### `study_goals`
Same migration as `subjects`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid, FK → `auth.users`, cascade delete | |
| `goal_type` | text | one of `GOAL_TYPES` values, or `other` |
| `custom_goal` | text, nullable | only set when `goal_type = 'other'` |
| `created_at` | timestamptz | |
| unique | `(user_id, goal_type)` | |

RLS: select/insert/delete own rows (no update — goals are replaced by
delete + re-insert, see `saveGoals` in `src/lib/actions/onboarding.ts`).

### `study_preferences` (1 row per user)
Same migration.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid, unique, FK → `auth.users`, cascade delete | |
| `preferences` | jsonb, default `[]` | array of study-method identifiers, **self-reported only, not a learning-style diagnosis** |
| `created_at`, `updated_at` | timestamptz | |

RLS: select/insert/update own row.

### `study_availability` (up to 7 rows per user, one per weekday)
Same migration.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid, FK → `auth.users`, cascade delete | |
| `day_of_week` | smallint, 0–6 | 0 = Sunday |
| `available` | boolean, default true | |
| `start_time`, `end_time` | time, nullable | constraint: `start_time < end_time` when both set |
| `available_minutes` | integer, nullable | |
| `created_at`, `updated_at` | timestamptz | |
| unique | `(user_id, day_of_week)` | |

RLS: full CRUD, own rows only.

### `daily_checkins` (1 row per user per calendar day)
Migration: `20260828140000_create_daily_checkins.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid, FK → `auth.users`, cascade delete | |
| `checkin_date` | date | student's local date, not server's |
| `mood` | text | one of `MOOD_OPTIONS` |
| `energy`, `focus`, `motivation` | integer, 1–5 | range-checked at the DB level |
| `challenge` | text | one of `CHALLENGE_OPTIONS` |
| `challenge_other` | text, nullable | only when `challenge = 'other'` |
| `created_at`, `updated_at` | timestamptz | |
| unique | `(user_id, checkin_date)` | upserted on this key — one check-in per day, ever |

**Self-reported wellness snapshot, not a medical or mental-health
assessment** (see `SECURITY.md` section 17). RLS: select/insert/update own
rows; no delete policy.

### `study_tasks`
Migration: `20260828150000_create_study_tasks.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid, FK → `auth.users`, cascade delete | |
| `subject_id` | uuid, FK → `subjects`, **set null** on delete | |
| `title` | text | |
| `task_type` | text | check: homework/quiz/test/exam/essay/project/presentation/reading/other |
| `due_date` | date | |
| `due_time` | time, nullable | |
| `difficulty` | text, nullable | check: easy/medium/hard |
| `estimated_study_minutes` | integer, nullable | check: > 0 |
| `notes` | text, nullable | |
| `status` | text, default `pending` | check: pending/in_progress/completed |
| `completed_at` | timestamptz, nullable | |
| `created_at`, `updated_at` | timestamptz | |

Index: `(user_id, due_date)`. RLS: full CRUD, own rows only.

### `study_plans`
Migration: `20260828160000_create_study_plans_and_sessions.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid, FK → `auth.users`, cascade delete | |
| `task_id` | uuid, FK → `study_tasks`, **set null** on delete, nullable | |
| `title` | text | e.g. "Biology Exam Study Plan" |
| `source` | text, default `manual` | check: manual/ai |
| `status` | text, default `active` | check: active/completed/archived |
| `created_at`, `updated_at` | timestamptz | |

RLS: full CRUD, own rows only.

### `study_sessions`
Same migration, extended by three later migrations below.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid, FK → `auth.users`, cascade delete | |
| `study_plan_id` | uuid, FK → `study_plans`, **cascade** delete, nullable | |
| `task_id` | uuid, FK → `study_tasks`, set null, nullable | |
| `subject_id` | uuid, FK → `subjects`, set null, nullable | |
| `title` | text | derived: `"{Weekday}: {topic}"` or `"{Weekday} study session"` |
| `topic`, `objective` | text, nullable | |
| `scheduled_date` | date | |
| `scheduled_start` | time, nullable | |
| `planned_duration_minutes` | integer | check: > 0 |
| `actual_duration_minutes` | integer, nullable | check: ≥ 0 |
| `study_method` | text, nullable | |
| `status` | text, default `scheduled` | check: scheduled/in_progress/paused/completed/skipped |
| `started_at`, `completed_at` | timestamptz, nullable | |
| `accumulated_seconds` | integer, default 0 | added in `20260828180000` |
| `last_resumed_at` | timestamptz, nullable | added in `20260828180000` |
| `confidence_rating` | integer, nullable | added in `20260828190000`; check: 1–5 |
| `created_at`, `updated_at` | timestamptz | |

Indexes: `(study_plan_id)`, `(user_id, scheduled_date)`. Partial unique
index `study_sessions_one_active_per_user` on `user_id` where
`status in ('in_progress', 'paused')` — the database-level guarantee that a
user can never have more than one session running or paused at once
(`20260828170000`, extended in `20260828180000`). RLS: full CRUD, own rows
only.

### `ai_requests` (append-only log)
Migration: `20260828200000_create_ai_requests.sql`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid, FK → `auth.users`, cascade delete | |
| `created_at` | timestamptz | |

Used only to rate-limit AI calls per user (count rows in the last 60
seconds). Not a conversation history — no message content is ever stored
here or anywhere else; Study Buddy conversations exist only in the
browser's memory for the current page session. Index: `(user_id,
created_at)`. RLS: select/insert own rows only; no update/delete.

## Migration order

Migrations must be applied in filename order (they're timestamp-prefixed and
several depend on earlier ones — see the header comment in each file and
`supabase/README.md`):

1. `20260828120000_create_profiles.sql`
2. `20260828130000_create_onboarding_tables.sql`
3. `20260828140000_create_daily_checkins.sql`
4. `20260828150000_create_study_tasks.sql`
5. `20260828160000_create_study_plans_and_sessions.sql`
6. `20260828170000_one_active_session_per_user.sql`
7. `20260828180000_add_study_timer_fields.sql`
8. `20260828190000_add_session_confidence_rating.sql`
9. `20260828200000_create_ai_requests.sql`

## Row Level Security summary

Every table above has RLS **enabled**, with policies scoped to
`auth.uid() = user_id`. There is no table in this schema that is readable or
writable across users. No policy has been runtime-verified against a live
Supabase project as part of this transfer — `supabase/README.md`'s "testing
Row Level Security correctly" section explains how to do that once a real
project is connected, and it should be done before shipping to real users.
