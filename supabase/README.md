# Applying database migrations

This project doesn't have the Supabase CLI set up yet, so for now, migrations
are applied by hand through the Supabase Dashboard. This file explains how.

## Applying `20260828120000_create_profiles.sql`

1. Go to your project at [supabase.com](https://supabase.com) and open it.
2. In the left sidebar, click **SQL Editor**.
3. Click **New query**.
4. Open `supabase/migrations/20260828120000_create_profiles.sql` in this
   repo, copy its entire contents, and paste it into the SQL Editor.
5. Click **Run**. You should see "Success. No rows returned."
6. To confirm it worked: go to **Table Editor** in the sidebar — you
   should now see a `profiles` table with the columns described in
   `DATABASE_SCHEMA.md`.

## Applying `20260828130000_create_onboarding_tables.sql`

Run this **after** the profiles migration above — it reuses a trigger
function that migration defines. Same process: open the file, copy its
contents, paste into a new SQL Editor query, and click Run. You should
then see four new tables in Table Editor: `subjects`, `study_goals`,
`study_preferences`, `study_availability`.

## Applying `20260828140000_create_daily_checkins.sql`

Same process. Adds the `daily_checkins` table.

## Applying `20260828150000_create_study_tasks.sql`

Same process. Adds the `study_tasks` table - run this before the next
migration below, since it references `subjects`.

## Applying `20260828160000_create_study_plans_and_sessions.sql`

Same process. Adds `study_plans` and `study_sessions`. Run this after
`study_tasks`, since both new tables reference it.

## Applying `20260828170000_one_active_session_per_user.sql`

Same process. Adds a database-level rule preventing more than one
study session from being "in progress" for the same user at once. Run
this after `study_plans_and_sessions.sql`, since it references
`study_sessions`.

## Applying `20260828180000_add_study_timer_fields.sql`

Same process. Adds the fields the study timer needs (accumulated time,
last-resumed timestamp), extends session status to include "paused",
and extends the one-active-session rule above to also cover paused
sessions. Run this after `one_active_session_per_user.sql`.

## Applying `20260828190000_add_session_confidence_rating.sql`

Same process. Adds an optional 1-5 confidence rating recorded when a
session is completed.

## Applying `20260828200000_create_ai_requests.sql`

Same process. Adds an append-only log table used to rate-limit AI
requests per user.

## Important: testing Row Level Security correctly

The Table Editor and SQL Editor both connect to your database with
elevated (service-role) access by default — so simply looking at rows
there does **not** prove RLS is actually protecting anything. To really
test it, you need to run a query *as if you were a specific logged-in
user*, using Postgres session variables to simulate that. See the manual
testing steps in this feature's write-up for the exact queries to run.

## Future migrations

As new tables get added in later features, they'll follow the same
`supabase/migrations/<timestamp>_<description>.sql` naming pattern. If
this project moves to using the Supabase CLI later, these files are
already in the standard location it expects (`supabase/migrations/`).
