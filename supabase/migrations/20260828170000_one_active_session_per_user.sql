-- Feature 29: Start Study Session
-- Ensures a user can never have more than one study session "in
-- progress" at the same time, enforced at the database level - the
-- ultimate backstop against accidentally starting multiple sessions,
-- not just a UI-level restriction. A partial index (the `where` clause)
-- only applies to rows with status = 'in_progress', so any number of
-- scheduled/completed/skipped sessions are unaffected.

create unique index if not exists study_sessions_one_active_per_user
  on public.study_sessions (user_id)
  where status = 'in_progress';
