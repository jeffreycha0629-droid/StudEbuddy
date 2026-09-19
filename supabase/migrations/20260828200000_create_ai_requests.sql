-- Feature 32: Claude Server Integration
-- An append-only log of AI requests, used server-side to enforce a
-- simple rate limit (count recent rows per user before allowing a new
-- call). Database-backed rather than in-memory, since in-memory
-- counters don't reliably survive across serverless function instances.

create table if not exists public.ai_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.ai_requests is
  'Append-only log of AI API calls per user, used only for server-side rate limiting. Not a conversation history.';

alter table public.ai_requests enable row level security;

create policy "Users can view their own AI request log"
  on public.ai_requests for select
  using (auth.uid() = user_id);

create policy "Users can insert their own AI request log"
  on public.ai_requests for insert
  with check (auth.uid() = user_id);

-- No update/delete policy: this is an append-only log, and the secure
-- default under RLS is no access without an explicit policy.

create index if not exists ai_requests_user_created_idx
  on public.ai_requests (user_id, created_at);
