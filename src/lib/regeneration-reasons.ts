/**
 * UI-facing reason options for regenerating an existing AI study plan.
 * The `value`s here must exactly match the keys in the private
 * REGENERATION_REASONS prompt-guidance map in
 * src/lib/actions/ai-study-plan.ts - that map holds the actual prompt
 * text sent to Claude (server-only content), while this file holds just
 * the values/labels the client needs to render the dropdown and
 * validate a selection was made.
 */
export const REGENERATION_REASONS = [
  { value: "schedule_changed", label: "My schedule changed" },
  { value: "missed_session", label: "I missed a session" },
  { value: "less_time", label: "I have less time now" },
  { value: "more_time", label: "I have more time now" },
  { value: "too_difficult", label: "The plan feels too difficult" },
] as const;
