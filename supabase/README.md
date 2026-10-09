# Applying database migrations

## Option A: local development (recommended, no Supabase account needed)

```bash
npx supabase start
```

This runs the real Supabase stack (Postgres, Auth, REST API) in Docker on
your own machine and **applies every migration in this directory
automatically, in order**, every time you run it against a fresh local
database. Nothing below is needed for local development — see the main
`README.md`'s "fastest path to a fully working prototype" section.

`npx supabase stop` shuts it down. `npx supabase db reset` wipes the local
database and re-applies every migration from scratch (useful after editing
a migration file during development).

## Option B: your own cloud Supabase project

Once you have a cloud project, either:

- **Via the CLI** (recommended): `npx supabase link --project-ref <ref>`
  once (find `<ref>` in your project's Dashboard URL or Settings → General),
  then `npx supabase db push` to apply every migration here.
- **By hand**, if you'd rather not link the CLI to your account — the steps
  below walk through pasting each migration into the SQL Editor manually.

### Applying `20260828120000_create_profiles.sql`

1. Go to your project at [supabase.com](https://supabase.com) and open it.
2. In the left sidebar, click **SQL Editor**.
3. Click **New query**.
4. Open `supabase/migrations/20260828120000_create_profiles.sql` in this
   repo, copy its entire contents, and paste it into the SQL Editor.
5. Click **Run**. You should see "Success. No rows returned."
6. To confirm it worked: go to **Table Editor** in the sidebar — you
   should now see a `profiles` table with the columns described in
   `DATABASE_SCHEMA.md`.

### Applying `20260828130000_create_onboarding_tables.sql`

Run this **after** the profiles migration above — it reuses a trigger
function that migration defines. Same process: open the file, copy its
contents, paste into a new SQL Editor query, and click Run. You should
then see four new tables in Table Editor: `subjects`, `study_goals`,
`study_preferences`, `study_availability`.

### Applying `20260828140000_create_daily_checkins.sql`

Same process. Adds the `daily_checkins` table.

### Applying `20260828150000_create_study_tasks.sql`

Same process. Adds the `study_tasks` table - run this before the next
migration below, since it references `subjects`.

### Applying `20260828160000_create_study_plans_and_sessions.sql`

Same process. Adds `study_plans` and `study_sessions`. Run this after
`study_tasks`, since both new tables reference it.

### Applying `20260828170000_one_active_session_per_user.sql`

Same process. Adds a database-level rule preventing more than one
study session from being "in progress" for the same user at once. Run
this after `study_plans_and_sessions.sql`, since it references
`study_sessions`.

### Applying `20260828180000_add_study_timer_fields.sql`

Same process. Adds the fields the study timer needs (accumulated time,
last-resumed timestamp), extends session status to include "paused",
and extends the one-active-session rule above to also cover paused
sessions. Run this after `one_active_session_per_user.sql`.

### Applying `20260828190000_add_session_confidence_rating.sql`

Same process. Adds an optional 1-5 confidence rating recorded when a
session is completed.

### Applying `20260828200000_create_ai_requests.sql`

Same process. Adds an append-only log table used to rate-limit AI
requests per user.

## Important: testing Row Level Security correctly

The Table Editor and SQL Editor both connect to your database with
elevated (service-role) access by default — so simply looking at rows
there does **not** prove RLS is actually protecting anything. To really
test it, you need to run a query *as if you were a specific logged-in
user* — either via Postgres session variables, or more simply, by calling
the REST API (`$API_URL/rest/v1/<table>`) with a real user's access token
in the `Authorization: Bearer` header and comparing what two different
users can see.

This has been done against the local stack (Option A above): two users
signed up, one created a `study_tasks` row, and the other's own token
could not see it — confirmed `study_tasks`'s RLS policies actually isolate
users, not just that they exist in the migration. See `TRANSFER_NOTES.md`'s
changelog for how. The same should be done against any new table's
policies before trusting them with real data, and against a real cloud
project before going to production (local and cloud run the identical
Supabase software, but it's still worth the few extra minutes).

## Future migrations

New tables follow the same `supabase/migrations/<timestamp>_<description>.sql`
naming pattern. The Supabase CLI is already set up in this repo
(`supabase/config.toml`) to pick them up automatically — see Option A/B
above.
