/**
 * Returns the browser's LOCAL calendar date as "YYYY-MM-DD". Deliberately
 * not using date.toISOString(), which converts to UTC first and can
 * silently shift the date near midnight in any timezone west of UTC.
 * Used anywhere "today" needs to mean the student's own calendar day
 * rather than the server's (daily check-ins, task due-date grouping).
 */
export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
