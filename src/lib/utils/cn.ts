/**
 * Joins class names together, skipping any falsy values.
 * A tiny hand-written replacement for the `clsx` package so we don't add a
 * dependency just for this (see PROJECT_RULES.md rule 32).
 *
 * Example: cn("btn", isActive && "btn-active", undefined) -> "btn btn-active"
 */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
