"use server";

import { createClient } from "@/lib/supabase/server";
import {
  MAX_OBJECTIVE_LENGTH,
  MAX_SESSION_DURATION_MINUTES,
  MAX_TOPIC_LENGTH,
  SESSION_STUDY_METHODS,
} from "@/lib/session-constants";
import type { StudyPlan, StudySession } from "@/types/database";

export interface GetOrCreatePlanResult {
  error: string | null;
  plan: StudyPlan | null;
  sessions: StudySession[] | null;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;
const WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

/**
 * Parses a "YYYY-MM-DD" date string using explicit year/month/day
 * components (not new Date(dateStr), which parses as UTC and can shift
 * the weekday depending on the server's timezone) so the derived weekday
 * name is always correct regardless of where this code runs.
 */
function weekdayNameFromDateString(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return WEEKDAY_NAMES[new Date(year, month - 1, day).getDay()];
}

/**
 * Finds the user's own task, then reuses an existing study plan for it
 * if one already exists, or creates one ("{Task title} Study Plan",
 * matching the feature's own example) if not. Returns the plan's
 * existing sessions either way.
 */
export async function getOrCreateStudyPlan(taskId: string): Promise<GetOrCreatePlanResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to be logged in to continue.", plan: null, sessions: null };
  }
  if (!taskId) {
    return { error: "Please select a task.", plan: null, sessions: null };
  }

  const { data: task, error: taskError } = await supabase
    .from("study_tasks")
    .select("id, title")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (taskError || !task) {
    return { error: "That task couldn't be found.", plan: null, sessions: null };
  }

  const { data: existingPlan, error: existingPlanError } = await supabase
    .from("study_plans")
    .select("*")
    .eq("task_id", taskId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingPlanError) {
    return { error: "Something went wrong. Please try again.", plan: null, sessions: null };
  }

  let plan = existingPlan as StudyPlan | null;

  if (!plan) {
    const { data: createdPlan, error: createError } = await supabase
      .from("study_plans")
      .insert({
        user_id: user.id,
        task_id: taskId,
        title: `${task.title} Study Plan`,
        source: "manual",
      })
      .select()
      .single();

    if (createError || !createdPlan) {
      return {
        error: "Something went wrong creating your study plan. Please try again.",
        plan: null,
        sessions: null,
      };
    }
    plan = createdPlan as StudyPlan;
  }

  const { data: sessionsData, error: sessionsError } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("study_plan_id", plan.id)
    .order("scheduled_date");

  if (sessionsError) {
    return { error: "Something went wrong loading sessions. Please try again.", plan, sessions: [] };
  }

  return { error: null, plan, sessions: (sessionsData ?? []) as StudySession[] };
}

export interface CreateStudySessionInput {
  planId: string;
  scheduledDate: string;
  scheduledStart: string | null;
  topic: string | null;
  objective: string | null;
  plannedDurationMinutes: number;
  studyMethod: string | null;
}

export interface CreateStudySessionResult {
  error: string | null;
  session: StudySession | null;
}

export async function createStudySession(
  input: CreateStudySessionInput,
): Promise<CreateStudySessionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be logged in to continue.", session: null };

  if (!DATE_PATTERN.test(input.scheduledDate)) {
    return { error: "Please enter a valid date.", session: null };
  }
  if (input.scheduledStart && !TIME_PATTERN.test(input.scheduledStart)) {
    return { error: "Please enter a valid time.", session: null };
  }
  if (
    !Number.isInteger(input.plannedDurationMinutes) ||
    input.plannedDurationMinutes <= 0 ||
    input.plannedDurationMinutes > MAX_SESSION_DURATION_MINUTES
  ) {
    return {
      error: `Duration must be between 1 and ${MAX_SESSION_DURATION_MINUTES} minutes.`,
      session: null,
    };
  }

  const topic = input.topic?.trim() || null;
  if (topic && topic.length > MAX_TOPIC_LENGTH) {
    return { error: `Topic must be ${MAX_TOPIC_LENGTH} characters or fewer.`, session: null };
  }

  const objective = input.objective?.trim() || null;
  if (objective && objective.length > MAX_OBJECTIVE_LENGTH) {
    return {
      error: `Objective must be ${MAX_OBJECTIVE_LENGTH} characters or fewer.`,
      session: null,
    };
  }

  if (input.studyMethod) {
    const validMethods = new Set(SESSION_STUDY_METHODS.map((method) => method.value));
    if (!validMethods.has(input.studyMethod as (typeof SESSION_STUDY_METHODS)[number]["value"])) {
      return { error: "Please select a valid study method.", session: null };
    }
  }

  // Confirm the plan actually belongs to this user before attaching a
  // session to it. RLS would independently block a cross-user reference
  // at the database level too - this just gives a clearer error message.
  const { data: plan } = await supabase
    .from("study_plans")
    .select("id, task_id")
    .eq("id", input.planId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!plan) {
    return { error: "That study plan couldn't be found.", session: null };
  }

  // Inherit the subject from the plan's task, rather than asking the
  // person to re-select something already implied by it.
  let subjectId: string | null = null;
  if (plan.task_id) {
    const { data: task } = await supabase
      .from("study_tasks")
      .select("subject_id")
      .eq("id", plan.task_id)
      .eq("user_id", user.id)
      .maybeSingle();
    subjectId = task?.subject_id ?? null;
  }

  const weekday = weekdayNameFromDateString(input.scheduledDate);
  const title = topic ? `${weekday}: ${topic}` : `${weekday} study session`;

  const { data, error } = await supabase
    .from("study_sessions")
    .insert({
      user_id: user.id,
      study_plan_id: input.planId,
      task_id: plan.task_id,
      subject_id: subjectId,
      title,
      topic,
      objective,
      scheduled_date: input.scheduledDate,
      scheduled_start: input.scheduledStart,
      planned_duration_minutes: input.plannedDurationMinutes,
      study_method: input.studyMethod,
    })
    .select()
    .single();

  if (error || !data) {
    return { error: "Something went wrong saving your session. Please try again.", session: null };
  }

  return { error: null, session: data as StudySession };
}

export interface UpdateStudySessionInput {
  sessionId: string;
  scheduledDate: string;
  topic: string | null;
  plannedDurationMinutes: number;
}

export interface SessionActionResult {
  error: string | null;
  session: StudySession | null;
}

/**
 * Scoped to exactly the fields the feature asked for (date, duration,
 * topic) - time, objective, and study method stay as set at creation.
 * Title is recomputed with the same weekday-prefix logic as creation, so
 * it never goes stale relative to a changed date or topic.
 *
 * Security note: same pattern as every other update/delete action in
 * this project - explicit id + user_id filtering on top of RLS,
 * identical "not found" response whether the session doesn't exist or
 * belongs to someone else.
 */
export async function updateStudySession(
  input: UpdateStudySessionInput,
): Promise<SessionActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be logged in to continue.", session: null };
  if (!input.sessionId) {
    return { error: "Something went wrong. Please try again.", session: null };
  }

  if (!DATE_PATTERN.test(input.scheduledDate)) {
    return { error: "Please enter a valid date.", session: null };
  }
  if (
    !Number.isInteger(input.plannedDurationMinutes) ||
    input.plannedDurationMinutes <= 0 ||
    input.plannedDurationMinutes > MAX_SESSION_DURATION_MINUTES
  ) {
    return {
      error: `Duration must be between 1 and ${MAX_SESSION_DURATION_MINUTES} minutes.`,
      session: null,
    };
  }

  const topic = input.topic?.trim() || null;
  if (topic && topic.length > MAX_TOPIC_LENGTH) {
    return { error: `Topic must be ${MAX_TOPIC_LENGTH} characters or fewer.`, session: null };
  }

  const weekday = weekdayNameFromDateString(input.scheduledDate);
  const title = topic ? `${weekday}: ${topic}` : `${weekday} study session`;

  const { data, error } = await supabase
    .from("study_sessions")
    .update({
      scheduled_date: input.scheduledDate,
      planned_duration_minutes: input.plannedDurationMinutes,
      topic,
      title,
    })
    .eq("id", input.sessionId)
    .eq("user_id", user.id)
    .select()
    .maybeSingle();

  if (error) {
    return { error: "Something went wrong saving your changes. Please try again.", session: null };
  }
  if (!data) {
    return { error: "That study session couldn't be found.", session: null };
  }

  return { error: null, session: data as StudySession };
}

export async function deleteStudySession(sessionId: string): Promise<SessionActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be logged in to continue.", session: null };
  if (!sessionId) {
    return { error: "Something went wrong. Please try again.", session: null };
  }

  const { data, error } = await supabase
    .from("study_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .select()
    .maybeSingle();

  if (error) {
    return { error: "Something went wrong deleting your session. Please try again.", session: null };
  }
  if (!data) {
    return { error: "That study session couldn't be found.", session: null };
  }

  return { error: null, session: data as StudySession };
}

/**
 * Marks a session as started. Prevents accidentally starting multiple
 * sessions at once: checks for another session already in_progress OR
 * paused first (a paused session still counts as "current" - see
 * Feature 30's migration), and separately catches a unique-constraint
 * violation from the database's own index as a backstop against a race
 * condition slipping past that initial check.
 *
 * Security note: same pattern as every other update/delete action here -
 * explicit id + user_id filtering on top of RLS.
 */
export async function startStudySession(sessionId: string): Promise<SessionActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be logged in to continue.", session: null };
  if (!sessionId) {
    return { error: "Something went wrong. Please try again.", session: null };
  }

  const { data: activeSessions, error: activeError } = await supabase
    .from("study_sessions")
    .select("id, title")
    .eq("user_id", user.id)
    .in("status", ["in_progress", "paused"])
    .neq("id", sessionId);

  if (activeError) {
    return { error: "Something went wrong. Please try again.", session: null };
  }
  if (activeSessions && activeSessions.length > 0) {
    return {
      error: `You already have "${activeSessions[0].title}" in progress. Finish or pause it before starting another session.`,
      session: null,
    };
  }

  const { data, error } = await supabase
    .from("study_sessions")
    .update({
      status: "in_progress",
      started_at: new Date().toISOString(),
      last_resumed_at: new Date().toISOString(),
      accumulated_seconds: 0,
    })
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .select()
    .maybeSingle();

  if (error) {
    // Postgres unique_violation - the database's own backstop catching a
    // race condition that slipped past the check above.
    if (error.code === "23505") {
      return {
        error: "You already have another session in progress. Finish or pause it before starting another.",
        session: null,
      };
    }
    return { error: "Something went wrong starting your session. Please try again.", session: null };
  }
  if (!data) {
    return { error: "That study session couldn't be found.", session: null };
  }

  return { error: null, session: data as StudySession };
}

/**
 * Banks the current running segment's elapsed time into
 * accumulated_seconds, then marks the session paused. Recomputing from
 * last_resumed_at (an absolute timestamp) rather than trusting any
 * client-reported duration means the server is always the source of
 * truth for how much time actually elapsed.
 */
export async function pauseStudySession(sessionId: string): Promise<SessionActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be logged in to continue.", session: null };
  if (!sessionId) {
    return { error: "Something went wrong. Please try again.", session: null };
  }

  const { data: current, error: fetchError } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !current) {
    return { error: "That study session couldn't be found.", session: null };
  }
  if (current.status !== "in_progress") {
    return { error: "This session isn't currently running.", session: null };
  }

  const lastResumedMs = current.last_resumed_at
    ? new Date(current.last_resumed_at).getTime()
    : Date.now();
  const elapsedThisSegment = Math.max(0, Math.floor((Date.now() - lastResumedMs) / 1000));
  const newAccumulated = current.accumulated_seconds + elapsedThisSegment;

  const { data, error } = await supabase
    .from("study_sessions")
    .update({
      status: "paused",
      accumulated_seconds: newAccumulated,
      last_resumed_at: null,
    })
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .select()
    .maybeSingle();

  if (error) {
    return { error: "Something went wrong pausing your session. Please try again.", session: null };
  }
  if (!data) {
    return { error: "That study session couldn't be found.", session: null };
  }

  return { error: null, session: data as StudySession };
}

/**
 * Starts a new running segment from now - accumulated_seconds (the
 * banked time from before the pause) is left untouched.
 */
export async function resumeStudySession(sessionId: string): Promise<SessionActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be logged in to continue.", session: null };
  if (!sessionId) {
    return { error: "Something went wrong. Please try again.", session: null };
  }

  const { data: current, error: fetchError } = await supabase
    .from("study_sessions")
    .select("status")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !current) {
    return { error: "That study session couldn't be found.", session: null };
  }
  if (current.status !== "paused") {
    return { error: "This session isn't currently paused.", session: null };
  }

  const { data, error } = await supabase
    .from("study_sessions")
    .update({ status: "in_progress", last_resumed_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .select()
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return {
        error: "You already have another session in progress.",
        session: null,
      };
    }
    return { error: "Something went wrong resuming your session. Please try again.", session: null };
  }
  if (!data) {
    return { error: "That study session couldn't be found.", session: null };
  }

  return { error: null, session: data as StudySession };
}

export interface EndSessionInput {
  sessionId: string;
  confidenceRating: number | null;
}

/**
 * Banks any remaining running time, converts total accumulated seconds
 * to actual_duration_minutes (minimum 1, so an immediately-ended session
 * doesn't record 0), marks the session completed, and optionally records
 * a simple 1-5 self-reported confidence rating.
 */
export async function endStudySession(input: EndSessionInput): Promise<SessionActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be logged in to continue.", session: null };
  if (!input.sessionId) {
    return { error: "Something went wrong. Please try again.", session: null };
  }
  if (
    input.confidenceRating !== null &&
    (!Number.isInteger(input.confidenceRating) ||
      input.confidenceRating < 1 ||
      input.confidenceRating > 5)
  ) {
    return { error: "Please select a valid confidence rating.", session: null };
  }

  const { data: current, error: fetchError } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("id", input.sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !current) {
    return { error: "That study session couldn't be found.", session: null };
  }
  if (current.status !== "in_progress" && current.status !== "paused") {
    return { error: "This session isn't currently active.", session: null };
  }

  let totalSeconds = current.accumulated_seconds;
  if (current.status === "in_progress" && current.last_resumed_at) {
    const lastResumedMs = new Date(current.last_resumed_at).getTime();
    totalSeconds += Math.max(0, Math.floor((Date.now() - lastResumedMs) / 1000));
  }
  const actualMinutes = Math.max(1, Math.round(totalSeconds / 60));

  const { data, error } = await supabase
    .from("study_sessions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      actual_duration_minutes: actualMinutes,
      accumulated_seconds: totalSeconds,
      last_resumed_at: null,
      confidence_rating: input.confidenceRating,
    })
    .eq("id", input.sessionId)
    .eq("user_id", user.id)
    .select()
    .maybeSingle();

  if (error) {
    return { error: "Something went wrong ending your session. Please try again.", session: null };
  }
  if (!data) {
    return { error: "That study session couldn't be found.", session: null };
  }

  return { error: null, session: data as StudySession };
}
