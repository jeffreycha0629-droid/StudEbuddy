import { SESSION_STUDY_METHODS } from "@/lib/session-constants";

export function sessionMethodLabel(value: string | null): string | null {
  if (!value) return null;
  return SESSION_STUDY_METHODS.find((method) => method.value === value)?.label ?? value;
}
