-- Feature 18: Create Task
-- Creates study_tasks per DATABASE_SCHEMA.md. Full CRUD RLS policies are
-- set up now even though this feature only exercises insert/select,
-- because "Users may CRUD only their own tasks" is this table's already-
-- documented intended access pattern (see DATABASE_SCHEMA.md).

create table if not exists public.study_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete set null,
  title text not null,
  task_type text not null,
  due_date date not null,
  due_time time,
  difficulty text,
  estimated_study_minutes integer,
  notes text,
  status text not null default 'pending',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_tasks_task_type_check check (
    task_type in (
      'homework', 'quiz', 'test', 'exam', 'essay',
      'project', 'presentation', 'reading', 'other'
    )
  ),
  constraint study_tasks_difficulty_check check (
    difficulty is null or difficulty in ('easy', 'medium', 'hard')
  ),
  constraint study_tasks_status_check check (
    status in ('pending', 'in_progress', 'completed')
  ),
  constraint study_tasks_estimated_minutes_positive check (
    estimated_study_minutes is null or estimated_study_minutes > 0
  )
);

comment on column public.study_tasks.subject_id is
  'References a row the same user owns in public.subjects. Set to null on delete rather than blocking subject deletion.';

alter table public.study_tasks enable row level security;

create policy "Users can view their own tasks"
  on public.study_tasks for select
  using (auth.uid() = user_id);

create policy "Users can insert their own tasks"
  on public.study_tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own tasks"
  on public.study_tasks for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own tasks"
  on public.study_tasks for delete
  using (auth.uid() = user_id);

drop trigger if exists set_study_tasks_updated_at on public.study_tasks;
create trigger set_study_tasks_updated_at
  before update on public.study_tasks
  for each row execute function public.set_updated_at();

create index if not exists study_tasks_user_due_date_idx
  on public.study_tasks (user_id, due_date);
