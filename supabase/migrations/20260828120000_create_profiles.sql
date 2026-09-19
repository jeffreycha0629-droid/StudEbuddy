-- Feature 7: Profile Database
-- Creates the `profiles` table described in DATABASE_SCHEMA.md, enables
-- Row Level Security, and wires up automatic profile creation on signup.

-- pgcrypto provides gen_random_uuid(). Supabase enables this by default
-- on every project, but "if not exists" makes this migration safe to run
-- even on a project where it isn't.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text,
  grade_level text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per authenticated student. Created automatically on signup by the on_auth_user_created trigger below.';

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

-- Users may only see their own profile row. Nothing else - there is no
-- policy allowing a user to select another user's row, so under RLS's
-- secure-by-default model, all other rows are simply invisible to them.
create policy "Users can view their own profile"
  on public.profiles
  for select
  using (auth.uid() = user_id);

-- Defense in depth: profile rows are actually created by the trusted
-- trigger below (which bypasses RLS deliberately), but this policy means
-- that even a direct client-side insert attempt could only ever create a
-- row owned by the requesting user - never on someone else's behalf.
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- No delete policy is defined. Under RLS, no policy means no access -
-- users cannot delete their profile through the API yet. Account
-- deletion is a separate, later feature (SECURITY.md section 20) that
-- needs to deliberately handle every related table, not just this one.

-- ---------------------------------------------------------------------
-- Auto-create a profile row when a new user signs up
-- ---------------------------------------------------------------------
-- SECURITY DEFINER makes this function run with the privileges of the
-- function's owner (elevated) rather than the calling user, which is
-- required here because a brand-new user has no profile row yet for
-- their own RLS policies to apply to. This is the standard, Supabase-
-- documented pattern for this exact problem - it is a narrow, trusted
-- exception, not a general bypass: the function only ever inserts a row
-- tied to NEW.id (the user record Postgres itself just created), never
-- anything a client supplies.
--
-- `set search_path = public` is a deliberate hardening step: without it,
-- a SECURITY DEFINER function is vulnerable to "search path hijacking",
-- where a malicious schema earlier in the caller's search path could
-- shadow objects this function relies on. Pinning the search path closes
-- that off.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Keep updated_at accurate automatically
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
