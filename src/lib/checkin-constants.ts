/**
 * Shared between the check-in form (rendering options) and the
 * saveCheckIn Server Action (server-side validation), same pattern as
 * onboarding-constants.ts.
 */

export const MOOD_OPTIONS = [
  { value: "great", label: "Great" },
  { value: "good", label: "Good" },
  { value: "okay", label: "Okay" },
  { value: "stressed", label: "Stressed" },
  { value: "tired", label: "Tired" },
] as const;

export const CHALLENGE_OPTIONS = [
  { value: "too_much_work", label: "Too much work" },
  { value: "tired", label: "Tired" },
  { value: "distracted", label: "Distracted" },
  { value: "procrastinating", label: "Procrastinating" },
  { value: "confused", label: "Confused" },
  { value: "dont_know_where_to_start", label: "Don't know where to start" },
  { value: "overwhelmed", label: "Overwhelmed" },
  { value: "other", label: "Other" },
] as const;

export const SCALE_VALUES = [1, 2, 3, 4, 5] as const;

export const MAX_CHALLENGE_OTHER_LENGTH = 200;

/**
 * Returns the browser's LOCAL calendar date as "YYYY-MM-DD". Deliberately
 * not using date.toISOString(), which converts to UTC first and can
 * silently shift the date near midnight in any timezone west of UTC.
 */
/**
 * Re-exported from the shared date utility so this stays a valid import
 * path for existing code (DailyCheckInCard.tsx) without needing to touch
 * that file - the canonical definition now lives in src/lib/utils/date.ts,
 * shared with the Task List feature's due-date grouping.
 */
export { getLocalDateString } from "@/lib/utils/date";
