/**
 * Shared between onboarding step components (for rendering options) and
 * the onboarding Server Actions (for server-side validation). Kept in its
 * own plain module rather than the actions file, because a 'use server'
 * file is only allowed to export async functions - it can't also export
 * these constants.
 */

export const GRADE_LEVELS = [
  "Middle School 13+",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12",
  "College",
  "Other",
] as const;

export const GOAL_TYPES = [
  { value: "improve_grades", label: "Improve grades" },
  { value: "prepare_for_tests", label: "Prepare for tests" },
  { value: "stop_procrastinating", label: "Stop procrastinating" },
  { value: "improve_focus", label: "Improve focus" },
  { value: "stay_organized", label: "Stay organized" },
  { value: "manage_time", label: "Manage time" },
  { value: "create_study_routine", label: "Create a study routine" },
  { value: "understand_difficult_material", label: "Understand difficult material" },
  { value: "other", label: "Something else" },
] as const;

export const STUDY_METHODS = [
  { value: "practice_problems", label: "Practice problems" },
  { value: "flashcards", label: "Flashcards" },
  { value: "explanations", label: "Explanations" },
  { value: "videos", label: "Videos" },
  { value: "diagrams", label: "Diagrams" },
  { value: "summarizing", label: "Summarizing" },
  { value: "teaching_concepts", label: "Teaching concepts to someone else" },
  { value: "short_study_blocks", label: "Short study blocks" },
  { value: "longer_sessions", label: "Longer sessions" },
] as const;

export const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
] as const;

export const SUGGESTED_SUBJECTS = [
  "Math",
  "English",
  "Biology",
  "Chemistry",
  "Physics",
  "History",
  "Foreign Language",
  "Computer Science",
  "Art",
  "Music",
] as const;

export const MAX_DISPLAY_NAME_LENGTH = 60;
export const MAX_SUBJECT_NAME_LENGTH = 60;
export const MAX_SUBJECTS = 15;
export const MAX_CUSTOM_GOAL_LENGTH = 200;
export const MAX_AVAILABLE_MINUTES = 12 * 60;

/**
 * Parses an "HH:MM" 24-hour time string (the format <input type="time">
 * produces and the format Postgres's `time` column accepts) into total
 * minutes since midnight, or null if it isn't a valid time. Shared by
 * both AvailabilityStep's client-side validation and saveAvailability's
 * server-side validation so the two can't silently drift apart.
 */
export function parseTimeToMinutes(time: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}
