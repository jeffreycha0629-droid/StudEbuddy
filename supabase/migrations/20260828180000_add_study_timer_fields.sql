-- Feature 30: Study Timer
-- Adds fields needed for a refresh-safe timer: elapsed time is always
-- recomputed from these absolute timestamps, never from a client-side
-- counter that would reset on reload.

alter table public.study_sessions
  add column if not exists accumulated_seconds integer not null default 0,
  add column if not exists last_resumed_at timestamptz;

alter table public.study_sessions
  add constraint study_sessions_accumulated_seconds_nonnegative
  check (accumulated_seconds >= 0);

-- Extend status to include 'paused', alongside the existing values.
alter table public.study_sessions drop constraint if exists study_sessions_status_check;
alter table public.study_sessions add constraint study_sessions_status_check
  check (status in ('scheduled', 'in_progress', 'paused', 'completed', 'skipped'));

-- A paused session still counts as the user's "current" session -
-- otherwise pausing would be a loophole around Feature 29's rule
-- against starting a second session while one is already underway.
drop index if exists study_sessions_one_active_per_user;
create unique index if not exists study_sessions_one_active_per_user
  on public.study_sessions (user_id)
  where status in ('in_progress', 'paused');
