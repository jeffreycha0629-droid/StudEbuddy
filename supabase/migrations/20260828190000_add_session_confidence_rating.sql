-- Feature 31: Complete Study Session
-- Optional post-session reflection, kept deliberately simple: a single
-- 1-5 self-reported confidence rating, nothing more elaborate.

alter table public.study_sessions
  add column if not exists confidence_rating integer;

alter table public.study_sessions
  add constraint study_sessions_confidence_rating_range
  check (confidence_rating is null or confidence_rating between 1 and 5);
