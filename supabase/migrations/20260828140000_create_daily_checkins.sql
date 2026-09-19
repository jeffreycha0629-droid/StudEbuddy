-- Feature 17: Daily Check-In
-- One row per student per calendar day. Range constraints for
-- energy/focus/motivation and the (user_id, checkin_date) unique
-- constraint are enforced here at the database level as the ultimate
-- source of truth, not just in application code.

create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  checkin_date date not null,
  mood text not null,
  energy integer not null,
  focus integer not null,
  motivation integer not null,
  challenge text not null,
  challenge_other text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint daily_checkins_energy_range check (energy between 1 and 5),
  constraint daily_checkins_focus_range check (focus between 1 and 5),
  constraint daily_checkins_motivation_range check (motivation between 1 and 5),
  constraint daily_checkins_user_date_unique unique (user_id, checkin_date)
);

comment on table public.daily_checkins is
  'One row per student per calendar day. Self-reported academic-readiness snapshot only - not a medical or mental-health assessment, per SECURITY.md section 17 and PRODUCT_SPEC.md.';

alter table public.daily_checkins enable row level security;

create policy "Users can view their own check-ins"
  on public.daily_checkins for select
  using (auth.uid() = user_id);

create policy "Users can insert their own check-ins"
  on public.daily_checkins for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own check-ins"
  on public.daily_checkins for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No delete policy: deleting a check-in isn't part of this feature's
-- scope, and the secure default under RLS is no access without an
-- explicit policy.

drop trigger if exists set_daily_checkins_updated_at on public.daily_checkins;
create trigger set_daily_checkins_updated_at
  before update on public.daily_checkins
  for each row execute function public.set_updated_at();
