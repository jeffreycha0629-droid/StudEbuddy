-- Feature 24: Study Plan Database
-- Creates study_plans and study_sessions per DATABASE_SCHEMA.md.
-- Relationship: Task -> Study Plan -> Study Sessions, e.g.
--   "Biology Exam" (study_tasks)
--     -> "Biology Exam Study Plan" (study_plans, task_id set)
--       -> "Monday: Cell Review" (study_sessions, study_plan_id set)
--       -> "Tuesday: DNA"
--       -> "Wednesday: Mitosis"
--       -> "Thursday: Practice Test"

-- ---------------------------------------------------------------------
-- study_plans
-- ---------------------------------------------------------------------
create table if not exists public.study_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  task_id uuid references public.study_tasks (id) on delete set null,
  title text not null,
  source text not null default 'manual',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_plans_source_check check (source in ('manual', 'ai')),
  constraint study_plans_status_check check (status in ('active', 'completed', 'archived'))
);

comment on table public.study_plans is
  'A plan made up of study sessions, optionally built around one academic task (e.g. "Biology Exam Study Plan" for a "Biology Exam" task). See study_sessions for the individual scheduled blocks within a plan.';

alter table public.study_plans enable row level security;

create policy "Users can view their own study plans"
  on public.study_plans for select
  using (auth.uid() = user_id);

create policy "Users can insert their own study plans"
  on public.study_plans for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own study plans"
  on public.study_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own study plans"
  on public.study_plans for delete
  using (auth.uid() = user_id);

drop trigger if exists set_study_plans_updated_at on public.study_plans;
create trigger set_study_plans_updated_at
  before update on public.study_plans
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- study_sessions
-- ---------------------------------------------------------------------
create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- A session has no independent meaning without the plan it was
  -- scheduled as part of, so deleting a plan cascades to its sessions.
  study_plan_id uuid references public.study_plans (id) on delete cascade,
  -- Weaker, informational-only references: detach rather than delete
  -- the session if the originating task or subject disappears.
  task_id uuid references public.study_tasks (id) on delete set null,
  subject_id uuid references public.subjects (id) on delete set null,
  title text not null,
  topic text,
  objective text,
  scheduled_date date not null,
  scheduled_start time,
  planned_duration_minutes integer not null,
  actual_duration_minutes integer,
  study_method text,
  status text not null default 'scheduled',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_sessions_status_check check (
    status in ('scheduled', 'in_progress', 'completed', 'skipped')
  ),
  constraint study_sessions_planned_duration_positive check (planned_duration_minutes > 0),
  constraint study_sessions_actual_duration_nonnegative check (
    actual_duration_minutes is null or actual_duration_minutes >= 0
  )
);

comment on table public.study_sessions is
  'An individual scheduled study block, e.g. "Monday: Cell Review" within a "Biology Exam Study Plan". May optionally link back to the study_plan, the originating task, and/or a subject.';

alter table public.study_sessions enable row level security;

create policy "Users can view their own study sessions"
  on public.study_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own study sessions"
  on public.study_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own study sessions"
  on public.study_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own study sessions"
  on public.study_sessions for delete
  using (auth.uid() = user_id);

drop trigger if exists set_study_sessions_updated_at on public.study_sessions;
create trigger set_study_sessions_updated_at
  before update on public.study_sessions
  for each row execute function public.set_updated_at();

create index if not exists study_sessions_plan_idx
  on public.study_sessions (study_plan_id);

create index if not exists study_sessions_user_scheduled_date_idx
  on public.study_sessions (user_id, scheduled_date);
