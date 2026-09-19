-- Feature 8: Onboarding Shell
-- Creates the subjects, study_goals, study_preferences, and
-- study_availability tables described in DATABASE_SCHEMA.md.
--
-- Depends on: 20260828120000_create_profiles.sql, which defines the
-- public.set_updated_at() trigger function reused below. Run that
-- migration first.

-- ---------------------------------------------------------------------
-- subjects
-- ---------------------------------------------------------------------
create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subjects enable row level security;

create policy "Users can view their own subjects"
  on public.subjects for select
  using (auth.uid() = user_id);

create policy "Users can insert their own subjects"
  on public.subjects for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own subjects"
  on public.subjects for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own subjects"
  on public.subjects for delete
  using (auth.uid() = user_id);

drop trigger if exists set_subjects_updated_at on public.subjects;
create trigger set_subjects_updated_at
  before update on public.subjects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- study_goals
-- ---------------------------------------------------------------------
create table if not exists public.study_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_type text not null,
  custom_goal text,
  created_at timestamptz not null default now(),
  constraint study_goals_user_goal_unique unique (user_id, goal_type)
);

alter table public.study_goals enable row level security;

create policy "Users can view their own goals"
  on public.study_goals for select
  using (auth.uid() = user_id);

create policy "Users can insert their own goals"
  on public.study_goals for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own goals"
  on public.study_goals for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- study_preferences (one row per user, like profiles)
-- ---------------------------------------------------------------------
create table if not exists public.study_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  preferences jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.study_preferences.preferences is
  'A JSONB array of study-method identifiers the student selected (e.g. ["flashcards","videos"]). Self-reported preferences only - not a scientific learning-style diagnosis, per DATABASE_SCHEMA.md.';

alter table public.study_preferences enable row level security;

create policy "Users can view their own study preferences"
  on public.study_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert their own study preferences"
  on public.study_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own study preferences"
  on public.study_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists set_study_preferences_updated_at on public.study_preferences;
create trigger set_study_preferences_updated_at
  before update on public.study_preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- study_availability (up to one row per day-of-week per user)
-- ---------------------------------------------------------------------
create table if not exists public.study_availability (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day_of_week smallint not null,
  available boolean not null default true,
  start_time time,
  end_time time,
  available_minutes integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_availability_day_of_week_range check (day_of_week between 0 and 6),
  constraint study_availability_time_range check (
    start_time is null or end_time is null or start_time < end_time
  ),
  constraint study_availability_user_day_unique unique (user_id, day_of_week)
);

alter table public.study_availability enable row level security;

create policy "Users can view their own availability"
  on public.study_availability for select
  using (auth.uid() = user_id);

create policy "Users can insert their own availability"
  on public.study_availability for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own availability"
  on public.study_availability for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own availability"
  on public.study_availability for delete
  using (auth.uid() = user_id);

drop trigger if exists set_study_availability_updated_at on public.study_availability;
create trigger set_study_availability_updated_at
  before update on public.study_availability
  for each row execute function public.set_updated_at();
