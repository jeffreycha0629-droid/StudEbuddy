"use server";

import { createClient } from "@/lib/supabase/server";
import { callClaudeConversation } from "@/lib/ai/claude";
import { CHALLENGE_OPTIONS } from "@/lib/checkin-constants";
import { GOAL_TYPES } from "@/lib/onboarding-constants";

export interface StudyBuddyMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StudyBuddyMessageInput {
  /** Full conversation so far, ending with the new user message already
   * appended by the caller. Held only in the caller's own memory - this
   * action does not read or write any conversation storage table
   * (DATABASE_SCHEMA.md: persistent chat storage is explicitly deferred
   * until privacy/retention behavior is defined). */
  history: StudyBuddyMessage[];
  /** The caller's local "today" (YYYY-MM-DD), not the server's - used to
   * scope "upcoming tasks", "today's sessions", and "today's check-in".
   * Same reasoning as every other date-sensitive action in this project
   * (see getLocalDateString in src/lib/utils/date.ts). */
  todayDateString: string;
}

export interface StudyBuddyMessageResult {
  error: string | null;
  reply: string | null;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 5;
const MAX_MESSAGE_LENGTH = 1000;
const MAX_HISTORY_MESSAGES = 20;
const MAX_CONTEXT_TASKS = 5;
const MAX_CONTEXT_SESSIONS = 10;
const MAX_CONTEXT_GOALS = 10;

const SYSTEM_PROMPT =
  "You are Study Buddy, a friendly, encouraging academic assistant inside StudEbuddy, " +
  "a study app for students. Help with prioritizing work, breaking down assignments, " +
  "explaining concepts, and getting started when stuck. Keep responses concise and " +
  "focused on academics. Do not provide medical, legal, or mental-health advice, and do " +
  "not claim to know a specific teacher's test content. If asked something outside " +
  "academic support, gently redirect to how you can help with studying.";

/**
 * Feature 39 - Study Buddy Backend. Builds one plain-text context
 * summary from the student's own data, all queries explicitly scoped to
 * userId (never a client-supplied id), with minimal field selection and
 * capped counts - not full record dumps. This is the ONLY way Claude
 * ever learns anything about the student: it is handed a finished
 * string, never a query capability, a tool, or any other mechanism that
 * could let it ask for more than what this function decided to include
 * (PROJECT_RULES.md rule 18 - AI is never a security boundary; the
 * application decides what's safe to share before the AI is involved).
 */
async function buildStudentContext(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  todayDateString: string,
): Promise<string> {
  const lines: string[] = [];

  const { data: subjectsData } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("user_id", userId);
  const subjects = subjectsData ?? [];
  const subjectNameById = new Map(subjects.map((subject) => [subject.id, subject.name]));

  if (subjects.length > 0) {
    lines.push(`Subjects: ${subjects.map((subject) => subject.name).join(", ")}`);
  }

  const { data: tasksData } = await supabase
    .from("study_tasks")
    .select("title, due_date, subject_id, status")
    .eq("user_id", userId)
    .neq("status", "completed")
    .gte("due_date", todayDateString)
    .order("due_date")
    .limit(MAX_CONTEXT_TASKS);
  const tasks = tasksData ?? [];

  if (tasks.length > 0) {
    lines.push("Upcoming tasks:");
    for (const task of tasks) {
      const subjectName = task.subject_id ? subjectNameById.get(task.subject_id) : null;
      lines.push(
        `- ${task.title}${subjectName ? ` (${subjectName})` : ""}, due ${task.due_date}`,
      );
    }
  }

  const { data: sessionsData } = await supabase
    .from("study_sessions")
    .select("title, topic, planned_duration_minutes, status")
    .eq("user_id", userId)
    .eq("scheduled_date", todayDateString)
    .limit(MAX_CONTEXT_SESSIONS);
  const sessions = sessionsData ?? [];

  if (sessions.length > 0) {
    lines.push("Today's study sessions:");
    for (const session of sessions) {
      lines.push(
        `- ${session.topic ?? session.title}, ${session.planned_duration_minutes} min, status: ${session.status}`,
      );
    }
  }

  const { data: goalsData } = await supabase
    .from("study_goals")
    .select("goal_type, custom_goal")
    .eq("user_id", userId)
    .limit(MAX_CONTEXT_GOALS);
  const goals = goalsData ?? [];

  if (goals.length > 0) {
    const goalLabels = goals.map((goal) => {
      const label = GOAL_TYPES.find((option) => option.value === goal.goal_type)?.label ??
        goal.goal_type;
      return goal.goal_type === "other" && goal.custom_goal ? `${label}: ${goal.custom_goal}` : label;
    });
    lines.push(`Goals: ${goalLabels.join(", ")}`);
  }

  // Deliberately only energy/focus/challenge - not mood or motivation,
  // same minimization reasoning as Feature 37: these three are directly
  // useful academic-productivity context; the rest aren't necessary for
  // Study Buddy's job and are never selected from the database at all.
  const { data: checkIn } = await supabase
    .from("daily_checkins")
    .select("energy, focus, challenge, challenge_other")
    .eq("user_id", userId)
    .eq("checkin_date", todayDateString)
    .maybeSingle();

  if (checkIn) {
    const challengeLabel =
      CHALLENGE_OPTIONS.find((option) => option.value === checkIn.challenge)?.label ??
      checkIn.challenge;
    const challengeText =
      checkIn.challenge === "other" && checkIn.challenge_other
        ? `${challengeLabel}: ${checkIn.challenge_other}`
        : challengeLabel;
    lines.push(
      `Today's check-in (self-reported): energy ${checkIn.energy}/5, focus ${checkIn.focus}/5, biggest challenge: ${challengeText}.`,
    );
  }

  if (lines.length === 0) {
    return "";
  }

  return (
    "Here is some context about the student, to help you give relevant, specific advice. " +
    "Only use this to inform your answers - do not recite it back verbatim unless asked, " +
    "and do not comment on or interpret the check-in data beyond using it to gauge how " +
    "much to ask of the student right now:\n" +
    lines.join("\n")
  );
}

export async function sendStudyBuddyMessage(
  input: StudyBuddyMessageInput,
): Promise<StudyBuddyMessageResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to be logged in to continue.", reply: null };
  }

  if (!DATE_PATTERN.test(input.todayDateString)) {
    return { error: "Something went wrong. Please try again.", reply: null };
  }

  if (!Array.isArray(input.history) || input.history.length === 0) {
    return { error: "Please enter a message.", reply: null };
  }
  if (input.history.length > MAX_HISTORY_MESSAGES) {
    return {
      error: "This conversation has gotten too long. Please start a new one.",
      reply: null,
    };
  }

  const lastMessage = input.history[input.history.length - 1];
  if (lastMessage.role !== "user" || !lastMessage.content.trim()) {
    return { error: "Please enter a message.", reply: null };
  }
  if (lastMessage.content.length > MAX_MESSAGE_LENGTH) {
    return {
      error: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`,
      reply: null,
    };
  }

  for (const message of input.history) {
    if (message.role !== "user" && message.role !== "assistant") {
      return { error: "Something went wrong. Please try again.", reply: null };
    }
    if (!message.content || !message.content.trim()) {
      return { error: "Something went wrong. Please try again.", reply: null };
    }
  }

  // Rate limiting - same append-only ai_requests log and strategy
  // established in Feature 32, shared with study-plan generation.
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("ai_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", windowStart);

  if (countError) {
    return { error: "Something went wrong. Please try again.", reply: null };
  }
  if ((count ?? 0) >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      error: `You're sending messages too quickly. Please wait a bit and try again (limit: ${RATE_LIMIT_MAX_REQUESTS} per minute).`,
      reply: null,
    };
  }

  const context = await buildStudentContext(supabase, user.id, input.todayDateString);
  const systemPrompt = context ? `${SYSTEM_PROMPT}\n\n${context}` : SYSTEM_PROMPT;

  const result = await callClaudeConversation(systemPrompt, input.history);

  // Log the attempt regardless of outcome, for rate-limiting purposes.
  await supabase.from("ai_requests").insert({ user_id: user.id });

  if (result.error) {
    return { error: result.error, reply: null };
  }

  return { error: null, reply: result.text };
}
