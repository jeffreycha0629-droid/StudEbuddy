"use server";

import { createClient } from "@/lib/supabase/server";
import { callClaudeWithTool, type ClaudeTool } from "@/lib/ai/claude";
import type { StudyPlan, StudySession } from "@/types/database";

export interface GenerateAiPlanInput {
  taskId: string;
  topics: string[];
  /** The caller's local "today" (YYYY-MM-DD), not the server's - see
   * getLocalDateString in src/lib/utils/date.ts for why this matters. */
  todayDateString: string;
  /** Set only when regenerating an already-saved plan (Feature 36) -
   * changes what Claude actually generates, not just cosmetic. */
  regenerationReason?: string | null;
}

export interface GenerateAiPlanResult {
  error: string | null;
  plan: StudyPlan | null;
  sessions: StudySession[] | null;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_TOPICS = 10;
const MAX_TOPIC_INPUT_LENGTH = 100;

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 5;

const WEEKDAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const;

const MAX_SESSIONS = 14;
const MAX_SESSION_TOPIC_LENGTH = 150;
const MAX_METHOD_LENGTH = 100;
const MAX_OBJECTIVE_LENGTH = 300;
const MAX_DURATION_MINUTES = 240;

/**
 * Feature 36 - AI Plan Regeneration. Each reason maps to specific
 * guidance added to the prompt - this is a real input that changes what
 * Claude generates, not a cosmetic label.
 */
const REGENERATION_REASONS: Record<string, string> = {
  schedule_changed:
    "The student's schedule has changed since the original plan was made. Create a fresh plan based on their current availability, not assumptions from before.",
  missed_session:
    "The student missed one or more scheduled sessions and needs an adjusted plan to catch up before the deadline.",
  less_time:
    "The student now has less time available than before. Prioritize the most important topics and use shorter or fewer sessions accordingly.",
  more_time:
    "The student now has more time available than before. Feel free to add more depth, more practice, or additional sessions.",
  too_difficult:
    "The student found the previous plan too difficult or overwhelming. Make this plan more manageable: shorter sessions, simpler methods, more gradual pacing.",
};

const STUDY_PLAN_TOOL: ClaudeTool = {
  name: "create_study_plan",
  description:
    "Creates a structured study plan of sessions leading up to an academic task's due date.",
  input_schema: {
    type: "object",
    properties: {
      sessions: {
        type: "array",
        description: "Ordered list of study sessions, one per entry.",
        items: {
          type: "object",
          properties: {
            day_of_week: {
              type: "string",
              enum: [...WEEKDAY_NAMES],
              description: "Which day of the week this session happens on.",
            },
            topic: { type: "string", description: "Specific topic to study in this session." },
            duration_minutes: {
              type: "integer",
              description: "Planned length of the session in minutes.",
            },
            method: {
              type: "string",
              description: "How to study, e.g. 'Retrieval + diagram' or 'Practice problems'.",
            },
            objective: {
              type: "string",
              description: "A concrete, checkable goal for the session, e.g. 'Explain organelle functions from memory'.",
            },
          },
          required: ["day_of_week", "topic", "duration_minutes", "method", "objective"],
        },
      },
    },
    required: ["sessions"],
  },
};

const SYSTEM_PROMPT =
  "You are a study planning assistant for a student productivity app. " +
  "You only ever respond by calling the create_study_plan tool - never with plain text. " +
  "Only use the information given to you in the user's message. " +
  "Only schedule sessions on days the student listed as available, and keep total planned time " +
  "reasonable given their available minutes per day. Distribute sessions across multiple days " +
  "rather than cramming everything into one. Keep objectives concrete and checkable.";

interface RawAiSession {
  day_of_week?: unknown;
  topic?: unknown;
  duration_minutes?: unknown;
  method?: unknown;
  objective?: unknown;
}

interface ValidatedAiSession {
  dayOfWeek: (typeof WEEKDAY_NAMES)[number];
  topic: string;
  durationMinutes: number;
  method: string;
  objective: string;
}

/**
 * Explicit, field-by-field validation of Claude's structured output.
 * This is what "Validate AI output before saving" means in practice -
 * schema compliance from the tool-use API is not trusted on its own.
 * Any field that doesn't pass fails the whole response rather than
 * silently coercing or guessing a fallback value.
 */
function validateAiSessions(raw: unknown): {
  error: string | null;
  sessions: ValidatedAiSession[] | null;
} {
  if (
    !raw ||
    typeof raw !== "object" ||
    !("sessions" in raw) ||
    !Array.isArray((raw as { sessions: unknown }).sessions)
  ) {
    return { error: "The AI response wasn't in the expected format.", sessions: null };
  }

  const rawSessions = (raw as { sessions: unknown[] }).sessions;

  if (rawSessions.length === 0) {
    return { error: "The AI didn't generate any sessions. Please try again.", sessions: null };
  }
  if (rawSessions.length > MAX_SESSIONS) {
    return { error: "The AI generated too many sessions. Please try again.", sessions: null };
  }

  const validated: ValidatedAiSession[] = [];

  for (const item of rawSessions) {
    if (!item || typeof item !== "object") {
      return { error: "The AI response wasn't in the expected format.", sessions: null };
    }
    const session = item as RawAiSession;

    if (
      typeof session.day_of_week !== "string" ||
      !(WEEKDAY_NAMES as readonly string[]).includes(session.day_of_week)
    ) {
      return { error: "The AI returned an invalid day. Please try again.", sessions: null };
    }
    if (
      typeof session.topic !== "string" ||
      !session.topic.trim() ||
      session.topic.length > MAX_SESSION_TOPIC_LENGTH
    ) {
      return { error: "The AI returned an invalid topic. Please try again.", sessions: null };
    }
    if (
      typeof session.duration_minutes !== "number" ||
      !Number.isInteger(session.duration_minutes) ||
      session.duration_minutes <= 0 ||
      session.duration_minutes > MAX_DURATION_MINUTES
    ) {
      return { error: "The AI returned an invalid duration. Please try again.", sessions: null };
    }
    if (
      typeof session.method !== "string" ||
      !session.method.trim() ||
      session.method.length > MAX_METHOD_LENGTH
    ) {
      return { error: "The AI returned an invalid study method. Please try again.", sessions: null };
    }
    if (
      typeof session.objective !== "string" ||
      !session.objective.trim() ||
      session.objective.length > MAX_OBJECTIVE_LENGTH
    ) {
      return { error: "The AI returned an invalid objective. Please try again.", sessions: null };
    }

    validated.push({
      dayOfWeek: session.day_of_week as (typeof WEEKDAY_NAMES)[number],
      topic: session.topic.trim(),
      durationMinutes: session.duration_minutes,
      method: session.method.trim(),
      objective: session.objective.trim(),
    });
  }

  return { error: null, sessions: validated };
}

interface DatedSession extends ValidatedAiSession {
  scheduledDate: string;
}

/**
 * Maps each session's weekday name to an actual upcoming calendar date,
 * starting the search from the caller's local "today" (not the
 * server's). Repeated weekday names (e.g. two "Monday" sessions in a
 * longer plan) are assigned to successive future occurrences of that
 * weekday, one week apart.
 */
function assignDatesToSessions(
  sessions: ValidatedAiSession[],
  todayDateString: string,
): DatedSession[] {
  const [year, month, day] = todayDateString.split("-").map(Number);
  const today = new Date(year, month - 1, day);

  const occurrenceCount = new Map<string, number>();

  return sessions.map((session) => {
    const occurrence = occurrenceCount.get(session.dayOfWeek) ?? 0;
    occurrenceCount.set(session.dayOfWeek, occurrence + 1);

    const targetWeekday = WEEKDAY_NAMES.indexOf(session.dayOfWeek);
    const date = new Date(today);
    date.setDate(date.getDate() + 1); // start searching from tomorrow
    while (date.getDay() !== targetWeekday) {
      date.setDate(date.getDate() + 1);
    }
    date.setDate(date.getDate() + occurrence * 7);

    const scheduledDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

    return { ...session, scheduledDate };
  });
}

function getWeekdayName(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  return WEEKDAY_NAMES[new Date(year, month - 1, day).getDay()];
}

interface DayAvailability {
  available: boolean;
  availableMinutes: number | null;
}

interface AvailabilityCheckable {
  scheduledDate: string;
  durationMinutes: number;
}

/**
 * Feature 34 - Schedule Validation. The prompt asks Claude to respect
 * availability, but an instruction in a prompt is not verification: this
 * actually checks each session against the user's real study_availability
 * data before anything is saved, rejecting sessions that don't fit rather
 * than trusting the AI (or an edit) followed the rules.
 *
 * Takes the minimal shape needed (scheduledDate + durationMinutes) rather
 * than a specific session type, so the same function works both for
 * freshly-generated sessions (Feature 33/34) and for possibly-edited
 * sessions being re-validated at accept time (Feature 35) - the weekday
 * is derived from scheduledDate directly rather than trusting a separate
 * dayOfWeek field that could be stale after an edit.
 *
 * Missing availability data entirely (the user never set any) is
 * treated as "no constraint to check" - not as "nothing is available" -
 * matching how buildPrompt() already tells Claude the same thing in that
 * case. Availability rows that do exist are authoritative.
 */
function sessionFitsAvailability(
  session: AvailabilityCheckable,
  availabilityByDay: Map<number, DayAvailability>,
  hasAvailabilityData: boolean,
): boolean {
  if (!hasAvailabilityData) return true;

  const [year, month, day] = session.scheduledDate.split("-").map(Number);
  const dayIndex = new Date(year, month - 1, day).getDay();
  const dayAvailability = availabilityByDay.get(dayIndex);

  if (!dayAvailability || !dayAvailability.available) {
    return false;
  }
  if (
    dayAvailability.availableMinutes !== null &&
    session.durationMinutes > dayAvailability.availableMinutes
  ) {
    return false;
  }

  return true;
}

/**
 * The schedule-validation gate: every session is checked against real
 * data (the task's actual due date, the user's actual availability)
 * before it's allowed anywhere near a database write. Used at preview
 * time to silently filter AI-hallucinated bad sessions the user never
 * saw; accept time uses the same underlying check but rejects loudly
 * instead (see acceptAiStudyPlan).
 */
function filterValidSessions<T extends AvailabilityCheckable>(
  sessions: T[],
  dueDate: string,
  availabilityByDay: Map<number, DayAvailability>,
  hasAvailabilityData: boolean,
): T[] {
  return sessions.filter((session) => {
    const occursBeforeDeadline = session.scheduledDate <= dueDate;
    const fitsAvailability = sessionFitsAvailability(
      session,
      availabilityByDay,
      hasAvailabilityData,
    );
    return occursBeforeDeadline && fitsAvailability;
  });
}

function buildPrompt(input: {
  taskTitle: string;
  subjectName: string | null;
  dueDate: string;
  difficulty: string | null;
  estimatedMinutes: number | null;
  topics: string[];
  availability: Array<{ day: string; availableMinutes: number | null }>;
  preferences: string[];
  regenerationReason: string | null;
  /** Today's self-reported energy/focus (1-5), if a check-in exists for
   * today - Feature 37. Deliberately just these two fields, not the
   * full check-in (mood/motivation/challenge are not relevant to
   * session structuring and are not fetched at all, not just omitted
   * here - see SECURITY.md section 9). */
  readiness: { energy: number; focus: number } | null;
}): string {
  const lines: string[] = [];

  if (input.regenerationReason && REGENERATION_REASONS[input.regenerationReason]) {
    lines.push(
      "This is a regeneration of an existing study plan, not a first-time plan.",
    );
    lines.push(REGENERATION_REASONS[input.regenerationReason]);
    lines.push("");
  }

  lines.push("Create a study plan for the following academic task.");
  lines.push(`Task: ${input.taskTitle}`);
  if (input.subjectName) lines.push(`Subject: ${input.subjectName}`);
  lines.push(`Due date: ${input.dueDate}`);
  if (input.difficulty) lines.push(`Difficulty: ${input.difficulty}`);
  if (input.estimatedMinutes) {
    lines.push(`Estimated total study time: ${input.estimatedMinutes} minutes`);
  }
  if (input.topics.length > 0) {
    lines.push(`Topics to cover: ${input.topics.join(", ")}`);
  }

  if (input.availability.length > 0) {
    lines.push("Weekly availability (only schedule sessions on these days):");
    for (const day of input.availability) {
      lines.push(
        `- ${day.day}: ${day.availableMinutes ? `${day.availableMinutes} minutes available` : "available, no specific minute limit given"}`,
      );
    }
  } else {
    lines.push("No specific weekly availability was provided - use reasonable judgment.");
  }

  if (input.preferences.length > 0) {
    lines.push(`Preferred study methods: ${input.preferences.join(", ")}`);
  }

  if (input.readiness) {
    lines.push("");
    lines.push(
      `Today's readiness (self-reported by the student, 1-5 scale): energy ${input.readiness.energy}/5, focus ${input.readiness.focus}/5.`,
    );
    lines.push(
      "When energy or focus are low (1-2), favor shorter, lighter sessions for the nearest upcoming days and describe a gentler approach in the method field - for example, a brief review before tackling harder material, with a short break built in - rather than one long demanding session. When both are higher (4-5), longer or more demanding sessions are fine. Use these numbers only to shape session length, intensity, and pacing. Do not comment on, interpret, or diagnose the student's health, mood, or psychological state in any way.",
    );
  }

  return lines.join("\n");
}

async function fetchAvailability(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<{
  availabilityByDay: Map<number, DayAvailability>;
  hasAvailabilityData: boolean;
  forPrompt: Array<{ day: string; availableMinutes: number | null }>;
}> {
  const { data: availabilityRows } = await supabase
    .from("study_availability")
    .select("day_of_week, available, available_minutes")
    .eq("user_id", userId);

  const availabilityByDay = new Map<number, DayAvailability>();
  for (const row of availabilityRows ?? []) {
    availabilityByDay.set(row.day_of_week as number, {
      available: Boolean(row.available),
      availableMinutes: row.available_minutes as number | null,
    });
  }

  const forPrompt = (availabilityRows ?? [])
    .filter((row) => row.available)
    .map((row) => ({
      day: WEEKDAY_NAMES[row.day_of_week as number],
      availableMinutes: row.available_minutes as number | null,
    }));

  return {
    availabilityByDay,
    hasAvailabilityData: (availabilityRows ?? []).length > 0,
    forPrompt,
  };
}

// ---------------------------------------------------------------------
// Feature 35: AI Plan Preview
// ---------------------------------------------------------------------

export interface ProposedSession {
  /** Client-side reference key only - not a database id, since nothing
   * is saved yet. */
  clientId: string;
  scheduledDate: string;
  topic: string;
  durationMinutes: number;
  method: string;
  objective: string;
}

export interface PreviewAiPlanResult {
  error: string | null;
  sessions: ProposedSession[] | null;
}

/**
 * Generates a proposed plan and returns it WITHOUT saving anything - no
 * study_plans row, no study_sessions rows. "Do not instantly save AI
 * plan": this function's entire reason for existing is to stop at the
 * point the old generateAiStudyPlan used to write to the database.
 */
export async function previewAiStudyPlan(
  input: GenerateAiPlanInput,
): Promise<PreviewAiPlanResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to be logged in to continue.", sessions: null };
  }
  if (!input.taskId) {
    return { error: "Please select a task.", sessions: null };
  }
  if (!DATE_PATTERN.test(input.todayDateString)) {
    return { error: "Something went wrong. Please try again.", sessions: null };
  }

  const regenerationReason = input.regenerationReason ?? null;
  if (regenerationReason && !REGENERATION_REASONS[regenerationReason]) {
    return { error: "Please select a valid reason for regenerating.", sessions: null };
  }

  const cleanedTopics = Array.from(
    new Set(input.topics.map((topic) => topic.trim()).filter(Boolean)),
  );
  // Topics are required for a first-time plan, but optional when
  // regenerating an existing one - the reason itself is the primary
  // input at that point, and topics are just additional context.
  if (cleanedTopics.length === 0 && !regenerationReason) {
    return { error: "Please list at least one topic to cover.", sessions: null };
  }
  if (cleanedTopics.length > MAX_TOPICS) {
    return { error: `Please list ${MAX_TOPICS} topics or fewer.`, sessions: null };
  }
  if (cleanedTopics.some((topic) => topic.length > MAX_TOPIC_INPUT_LENGTH)) {
    return {
      error: `Each topic must be ${MAX_TOPIC_INPUT_LENGTH} characters or fewer.`,
      sessions: null,
    };
  }

  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("ai_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", windowStart);

  if (countError) {
    return { error: "Something went wrong. Please try again.", sessions: null };
  }
  if ((count ?? 0) >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      error: `You're sending requests too quickly. Please wait a bit and try again (limit: ${RATE_LIMIT_MAX_REQUESTS} per minute).`,
      sessions: null,
    };
  }

  const { data: task, error: taskError } = await supabase
    .from("study_tasks")
    .select("*")
    .eq("id", input.taskId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (taskError || !task) {
    return { error: "That task couldn't be found.", sessions: null };
  }

  let subjectName: string | null = null;
  if (task.subject_id) {
    const { data: subject } = await supabase
      .from("subjects")
      .select("name")
      .eq("id", task.subject_id)
      .eq("user_id", user.id)
      .maybeSingle();
    subjectName = subject?.name ?? null;
  }

  const { availabilityByDay, hasAvailabilityData, forPrompt } = await fetchAvailability(
    supabase,
    user.id,
  );

  const { data: preferencesRow } = await supabase
    .from("study_preferences")
    .select("preferences")
    .eq("user_id", user.id)
    .maybeSingle();
  const preferences = Array.isArray(preferencesRow?.preferences)
    ? (preferencesRow.preferences as string[])
    : [];

  // Feature 37 - Check-In-Aware Planning. Only energy/focus are selected
  // here, not the whole check-in row - mood/motivation/challenge are not
  // relevant to session structuring and are never fetched at all.
  const { data: checkIn } = await supabase
    .from("daily_checkins")
    .select("energy, focus")
    .eq("user_id", user.id)
    .eq("checkin_date", input.todayDateString)
    .maybeSingle();
  const readiness =
    checkIn && typeof checkIn.energy === "number" && typeof checkIn.focus === "number"
      ? { energy: checkIn.energy, focus: checkIn.focus }
      : null;

  const prompt = buildPrompt({
    taskTitle: task.title,
    subjectName,
    dueDate: task.due_date,
    difficulty: task.difficulty,
    estimatedMinutes: task.estimated_study_minutes,
    topics: cleanedTopics,
    availability: forPrompt,
    preferences,
    regenerationReason,
    readiness,
  });

  const toolResult = await callClaudeWithTool(SYSTEM_PROMPT, prompt, STUDY_PLAN_TOOL);

  // Log the attempt regardless of outcome, for rate-limiting purposes.
  await supabase.from("ai_requests").insert({ user_id: user.id });

  if (toolResult.error) {
    return { error: toolResult.error, sessions: null };
  }

  const validation = validateAiSessions(toolResult.input);
  if (validation.error || !validation.sessions) {
    return { error: validation.error ?? "The AI response couldn't be validated.", sessions: null };
  }

  const dated = assignDatesToSessions(validation.sessions, input.todayDateString);
  const validSessions = filterValidSessions(
    dated,
    task.due_date,
    availabilityByDay,
    hasAvailabilityData,
  );

  if (validSessions.length === 0) {
    return {
      error:
        "The AI couldn't generate a plan that fits your deadline and availability. Please try again.",
      sessions: null,
    };
  }

  const proposed: ProposedSession[] = validSessions.map((session, index) => ({
    clientId: `${Date.now()}-${index}`,
    scheduledDate: session.scheduledDate,
    topic: session.topic,
    durationMinutes: session.durationMinutes,
    method: session.method,
    objective: session.objective,
  }));

  return { error: null, sessions: proposed };
}

export interface ProposedSessionInput {
  scheduledDate: string;
  topic: string;
  durationMinutes: number;
  method: string;
  objective: string;
}

export interface AcceptAiPlanInput {
  taskId: string;
  sessions: ProposedSessionInput[];
  /** Set when accepting a regeneration of an already-saved plan
   * (Feature 36) - replaces the plan's existing non-completed sessions
   * rather than adding alongside them. Completed sessions are preserved
   * so a regeneration can't erase actual study history. */
  replaceExisting?: boolean;
}

/**
 * Once editable in the preview, these sessions are client-submitted
 * input by the time this runs - not trusted just because they
 * originated from a validated AI response. Every field is re-validated
 * with the same rigor as any form submission.
 */
function validateSessionFields(session: ProposedSessionInput): string | null {
  if (!DATE_PATTERN.test(session.scheduledDate)) {
    return "One of the sessions has an invalid date.";
  }
  if (!session.topic || !session.topic.trim() || session.topic.length > MAX_SESSION_TOPIC_LENGTH) {
    return "One of the sessions has an invalid topic.";
  }
  if (
    !Number.isInteger(session.durationMinutes) ||
    session.durationMinutes <= 0 ||
    session.durationMinutes > MAX_DURATION_MINUTES
  ) {
    return "One of the sessions has an invalid duration.";
  }
  if (!session.method || !session.method.trim() || session.method.length > MAX_METHOD_LENGTH) {
    return "One of the sessions has an invalid study method.";
  }
  if (
    !session.objective ||
    !session.objective.trim() ||
    session.objective.length > MAX_OBJECTIVE_LENGTH
  ) {
    return "One of the sessions has an invalid objective.";
  }
  return null;
}

/**
 * Saves a previewed (and possibly edited) plan. Re-runs the full
 * Feature 34 schedule validation against whatever is submitted, not
 * just field-type checks - editing a session's date must not be a way
 * to bypass deadline/availability checks that already passed once at
 * preview time. Unlike preview-time filtering (which silently drops
 * AI-hallucinated sessions the user never saw), this rejects the whole
 * submission with a specific error if anything fails: the student has
 * explicitly reviewed what they're submitting, so silently dropping
 * part of it without saying so would be confusing.
 */
export async function acceptAiStudyPlan(
  input: AcceptAiPlanInput,
): Promise<GenerateAiPlanResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to be logged in to continue.", plan: null, sessions: null };
  }
  if (!input.taskId) {
    return { error: "Something went wrong. Please try again.", plan: null, sessions: null };
  }
  if (!Array.isArray(input.sessions) || input.sessions.length === 0) {
    return {
      error: "There's nothing to save. Please generate a plan first.",
      plan: null,
      sessions: null,
    };
  }
  if (input.sessions.length > MAX_SESSIONS) {
    return { error: "Too many sessions. Please regenerate.", plan: null, sessions: null };
  }

  for (const session of input.sessions) {
    const fieldError = validateSessionFields(session);
    if (fieldError) {
      return { error: fieldError, plan: null, sessions: null };
    }
  }

  const { data: task, error: taskError } = await supabase
    .from("study_tasks")
    .select("*")
    .eq("id", input.taskId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (taskError || !task) {
    return { error: "That task couldn't be found.", plan: null, sessions: null };
  }

  const { availabilityByDay, hasAvailabilityData } = await fetchAvailability(supabase, user.id);

  for (const session of input.sessions) {
    if (session.scheduledDate > task.due_date) {
      return {
        error: "One of the sessions is scheduled after the due date. Please adjust it.",
        plan: null,
        sessions: null,
      };
    }
    if (!sessionFitsAvailability(session, availabilityByDay, hasAvailabilityData)) {
      return {
        error: "One of the sessions doesn't fit your weekly availability. Please adjust it.",
        plan: null,
        sessions: null,
      };
    }
  }

  // Get or create this task's plan, same pattern as the manual builder
  // (Feature 25) but with source explicitly "ai" - written inline here
  // rather than modifying that feature's shared function.
  const { data: existingPlan } = await supabase
    .from("study_plans")
    .select("*")
    .eq("task_id", input.taskId)
    .eq("user_id", user.id)
    .maybeSingle();

  let plan = existingPlan as StudyPlan | null;

  if (!plan) {
    const { data: createdPlan, error: createError } = await supabase
      .from("study_plans")
      .insert({
        user_id: user.id,
        task_id: input.taskId,
        title: `${task.title} Study Plan`,
        source: "ai",
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

  if (input.replaceExisting) {
    // Regeneration: replace this plan's existing sessions with the
    // newly accepted ones. Completed sessions are deliberately
    // preserved - a regeneration reflects a changed forward-looking
    // plan, not a reason to erase what the student already did.
    const { error: deleteError } = await supabase
      .from("study_sessions")
      .delete()
      .eq("study_plan_id", plan.id)
      .eq("user_id", user.id)
      .neq("status", "completed");

    if (deleteError) {
      return {
        error: "Something went wrong replacing your existing plan. Please try again.",
        plan,
        sessions: null,
      };
    }
  }

  const rows = input.sessions.map((session) => ({
    user_id: user.id,
    study_plan_id: plan!.id,
    task_id: input.taskId,
    subject_id: task.subject_id,
    title: `${getWeekdayName(session.scheduledDate)}: ${session.topic.trim()}`,
    topic: session.topic.trim(),
    objective: session.objective.trim(),
    scheduled_date: session.scheduledDate,
    planned_duration_minutes: session.durationMinutes,
    study_method: session.method.trim(),
  }));

  const { data: insertedSessions, error: insertError } = await supabase
    .from("study_sessions")
    .insert(rows)
    .select();

  if (insertError || !insertedSessions) {
    return {
      error: "Something went wrong saving your study plan. Please try again.",
      plan,
      sessions: null,
    };
  }

  return { error: null, plan, sessions: insertedSessions as StudySession[] };
}
