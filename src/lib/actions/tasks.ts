"use server";

import { createClient } from "@/lib/supabase/server";
import {
  DIFFICULTY_OPTIONS,
  MAX_ESTIMATED_MINUTES,
  MAX_NOTES_LENGTH,
  MAX_TITLE_LENGTH,
  TASK_TYPES,
} from "@/lib/task-constants";
import type { StudyTask } from "@/types/database";

export interface CreateTaskInput {
  title: string;
  subjectId: string | null;
  taskType: string;
  dueDate: string;
  dueTime: string | null;
  difficulty: string | null;
  estimatedMinutes: number | null;
  notes: string | null;
}

export interface UpdateTaskInput extends CreateTaskInput {
  taskId: string;
}

export interface TaskActionResult {
  error: string | null;
  task: StudyTask | null;
}

// Kept for backward compatibility with existing imports of this name.
export type CreateTaskResult = TaskActionResult;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

interface ValidatedTaskFields {
  title: string;
  taskType: string;
  dueDate: string;
  dueTime: string | null;
  difficulty: string | null;
  estimatedMinutes: number | null;
  notes: string | null;
}

/**
 * Shared by createTask and updateTask so the two can never drift apart -
 * a private (non-exported) helper is fine in a 'use server' file; only
 * exports are restricted to async functions.
 */
function validateTaskFields(
  input: CreateTaskInput,
): { error: string; fields: null } | { error: null; fields: ValidatedTaskFields } {
  const title = input.title.trim();
  if (!title) return { error: "Please enter a title.", fields: null };
  if (title.length > MAX_TITLE_LENGTH) {
    return { error: `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`, fields: null };
  }

  const validTypes = new Set(TASK_TYPES.map((type) => type.value));
  if (!validTypes.has(input.taskType as (typeof TASK_TYPES)[number]["value"])) {
    return { error: "Please select a valid task type.", fields: null };
  }

  if (!DATE_PATTERN.test(input.dueDate)) {
    return { error: "Please enter a valid due date.", fields: null };
  }

  if (input.dueTime && !TIME_PATTERN.test(input.dueTime)) {
    return { error: "Please enter a valid due time.", fields: null };
  }

  if (input.difficulty) {
    const validDifficulties = new Set(DIFFICULTY_OPTIONS.map((option) => option.value));
    if (!validDifficulties.has(input.difficulty as (typeof DIFFICULTY_OPTIONS)[number]["value"])) {
      return { error: "Please select a valid difficulty.", fields: null };
    }
  }

  if (input.estimatedMinutes !== null) {
    if (
      !Number.isInteger(input.estimatedMinutes) ||
      input.estimatedMinutes <= 0 ||
      input.estimatedMinutes > MAX_ESTIMATED_MINUTES
    ) {
      return {
        error: `Estimated study time must be between 1 and ${MAX_ESTIMATED_MINUTES} minutes.`,
        fields: null,
      };
    }
  }

  const notes = input.notes?.trim() || null;
  if (notes && notes.length > MAX_NOTES_LENGTH) {
    return { error: `Notes must be ${MAX_NOTES_LENGTH} characters or fewer.`, fields: null };
  }

  return {
    error: null,
    fields: {
      title,
      taskType: input.taskType,
      dueDate: input.dueDate,
      dueTime: input.dueTime,
      difficulty: input.difficulty,
      estimatedMinutes: input.estimatedMinutes,
      notes,
    },
  };
}

/**
 * If a subject was chosen, confirms it actually belongs to this user
 * before attaching it. RLS would independently block a cross-user
 * reference at the database level too - this just gives a clearer error
 * message instead of a generic save failure.
 */
async function verifySubjectOwnership(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  subjectId: string | null,
): Promise<string | null> {
  if (!subjectId) return null;

  const { data: subject } = await supabase
    .from("subjects")
    .select("id")
    .eq("id", subjectId)
    .eq("user_id", userId)
    .maybeSingle();

  return subject ? null : "That subject couldn't be found. Please choose again.";
}

export async function createTask(input: CreateTaskInput): Promise<TaskActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be logged in to add a task.", task: null };

  const validated = validateTaskFields(input);
  if (!validated.fields) return { error: validated.error, task: null };

  const subjectError = await verifySubjectOwnership(supabase, user.id, input.subjectId);
  if (subjectError) return { error: subjectError, task: null };

  const { data, error } = await supabase
    .from("study_tasks")
    .insert({
      user_id: user.id,
      subject_id: input.subjectId,
      title: validated.fields.title,
      task_type: validated.fields.taskType,
      due_date: validated.fields.dueDate,
      due_time: validated.fields.dueTime,
      difficulty: validated.fields.difficulty,
      estimated_study_minutes: validated.fields.estimatedMinutes,
      notes: validated.fields.notes,
    })
    .select()
    .single();

  if (error || !data) {
    return { error: "Something went wrong saving your task. Please try again.", task: null };
  }

  return { error: null, task: data as StudyTask };
}

/**
 * Security note: filters by BOTH id and user_id explicitly, on top of
 * the study_tasks UPDATE RLS policy (auth.uid() = user_id) which already
 * makes another user's row simply not match at the database level. If
 * zero rows match - whether the task doesn't exist or belongs to someone
 * else - both cases return the identical "couldn't be found" message,
 * so a manipulated task ID can't be used to tell those cases apart.
 */
/**
 * Security note: same reasoning as updateTask - filters by BOTH id and
 * user_id explicitly, on top of the study_tasks DELETE RLS policy
 * (auth.uid() = user_id). If zero rows match, whether the task doesn't
 * exist or belongs to someone else, the response is identical: "delete
 * only the authenticated user's record" holds regardless of what ID is
 * supplied.
 */
export async function updateTask(input: UpdateTaskInput): Promise<TaskActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be logged in to edit a task.", task: null };

  if (!input.taskId) {
    return { error: "Something went wrong. Please try again.", task: null };
  }

  const validated = validateTaskFields(input);
  if (!validated.fields) return { error: validated.error, task: null };

  const subjectError = await verifySubjectOwnership(supabase, user.id, input.subjectId);
  if (subjectError) return { error: subjectError, task: null };

  const { data, error } = await supabase
    .from("study_tasks")
    .update({
      subject_id: input.subjectId,
      title: validated.fields.title,
      task_type: validated.fields.taskType,
      due_date: validated.fields.dueDate,
      due_time: validated.fields.dueTime,
      difficulty: validated.fields.difficulty,
      estimated_study_minutes: validated.fields.estimatedMinutes,
      notes: validated.fields.notes,
    })
    .eq("id", input.taskId)
    .eq("user_id", user.id)
    .select()
    .maybeSingle();

  if (error) {
    return { error: "Something went wrong saving your changes. Please try again.", task: null };
  }

  if (!data) {
    return { error: "That task couldn't be found.", task: null };
  }

  return { error: null, task: data as StudyTask };
}

/**
 * Security note: same reasoning as updateTask - filters by BOTH id and
 * user_id explicitly, on top of the study_tasks DELETE RLS policy
 * (auth.uid() = user_id). If zero rows match, whether the task doesn't
 * exist or belongs to someone else, the response is identical: "delete
 * only the authenticated user's record" holds regardless of what ID is
 * supplied.
 */
export async function deleteTask(taskId: string): Promise<TaskActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be logged in to delete a task.", task: null };

  if (!taskId) {
    return { error: "Something went wrong. Please try again.", task: null };
  }

  const { data, error } = await supabase
    .from("study_tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", user.id)
    .select()
    .maybeSingle();

  if (error) {
    return { error: "Something went wrong deleting your task. Please try again.", task: null };
  }

  if (!data) {
    return { error: "That task couldn't be found.", task: null };
  }

  return { error: null, task: data as StudyTask };
}

export interface SetTaskCompletionInput {
  taskId: string;
  completed: boolean;
}

/**
 * Security note: same reasoning as updateTask/deleteTask - filters by
 * BOTH id and user_id explicitly, on top of RLS. If zero rows match,
 * whether the task doesn't exist or belongs to someone else, the
 * response is identical.
 *
 * Design note: this toggles both directions (completed <-> pending)
 * through one mechanism rather than being a one-way "mark complete"
 * action - a one-way action with no undo would make a misclick
 * permanently lose the distinction. Unchecking always reverts to
 * 'pending' rather than trying to restore a prior 'in_progress' state,
 * since nothing currently sets 'in_progress' anywhere in the UI.
 */
export async function setTaskCompletion(
  input: SetTaskCompletionInput,
): Promise<TaskActionResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be logged in to update a task.", task: null };

  if (!input.taskId) {
    return { error: "Something went wrong. Please try again.", task: null };
  }

  const { data, error } = await supabase
    .from("study_tasks")
    .update({
      status: input.completed ? "completed" : "pending",
      completed_at: input.completed ? new Date().toISOString() : null,
    })
    .eq("id", input.taskId)
    .eq("user_id", user.id)
    .select()
    .maybeSingle();

  if (error) {
    return { error: "Something went wrong updating your task. Please try again.", task: null };
  }

  if (!data) {
    return { error: "That task couldn't be found.", task: null };
  }

  return { error: null, task: data as StudyTask };
}
