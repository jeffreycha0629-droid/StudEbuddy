/**
 * Mirrors the `profiles` table created in
 * supabase/migrations/20260828120000_create_profiles.sql (see also
 * DATABASE_SCHEMA.md). Hand-written for now since this is the project's
 * first table - if the schema grows significantly, consider switching to
 * `supabase gen types typescript` generated types instead.
 */
export interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  grade_level: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * The remaining four mirror the tables created in
 * supabase/migrations/20260828130000_create_onboarding_tables.sql.
 */
export interface Subject {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface StudyGoal {
  id: string;
  user_id: string;
  goal_type: string;
  custom_goal: string | null;
  created_at: string;
}

export interface StudyPreferences {
  id: string;
  user_id: string;
  preferences: string[];
  created_at: string;
  updated_at: string;
}

export interface StudyAvailability {
  id: string;
  user_id: string;
  day_of_week: number;
  available: boolean;
  start_time: string | null;
  end_time: string | null;
  available_minutes: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Mirrors the daily_checkins table created in
 * supabase/migrations/20260828140000_create_daily_checkins.sql.
 */
export interface DailyCheckIn {
  id: string;
  user_id: string;
  checkin_date: string;
  mood: string;
  energy: number;
  focus: number;
  motivation: number;
  challenge: string;
  challenge_other: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Mirrors the study_tasks table created in
 * supabase/migrations/20260828150000_create_study_tasks.sql.
 */
export interface StudyTask {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  task_type: string;
  due_date: string;
  due_time: string | null;
  difficulty: string | null;
  estimated_study_minutes: number | null;
  notes: string | null;
  status: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Mirrors the study_plans and study_sessions tables created in
 * supabase/migrations/20260828160000_create_study_plans_and_sessions.sql.
 * Not yet used by any UI - the tables exist ahead of the features that
 * will populate and display them, same as Profile did before Onboarding.
 */
export interface StudyPlan {
  id: string;
  user_id: string;
  task_id: string | null;
  title: string;
  source: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  study_plan_id: string | null;
  task_id: string | null;
  subject_id: string | null;
  title: string;
  topic: string | null;
  objective: string | null;
  scheduled_date: string;
  scheduled_start: string | null;
  planned_duration_minutes: number;
  actual_duration_minutes: number | null;
  study_method: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  accumulated_seconds: number;
  last_resumed_at: string | null;
  confidence_rating: number | null;
  created_at: string;
  updated_at: string;
}
