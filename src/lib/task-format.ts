import { DIFFICULTY_OPTIONS, TASK_TYPES } from "@/lib/task-constants";
import type { Subject } from "@/types/database";

export function subjectName(subjects: Subject[], subjectId: string | null): string | null {
  if (!subjectId) return null;
  return subjects.find((subject) => subject.id === subjectId)?.name ?? null;
}

export function taskTypeLabel(value: string): string {
  return TASK_TYPES.find((type) => type.value === value)?.label ?? value;
}

export function difficultyLabel(value: string | null): string | null {
  if (!value) return null;
  return DIFFICULTY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}
