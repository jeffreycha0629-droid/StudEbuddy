"use client";

import { Card } from "@/components/ui/Card";
import { TaskForm } from "@/components/tasks/TaskForm";
import type { Subject } from "@/types/database";

export interface CreateTaskFormProps {
  initialSubjects: Subject[];
  /** Called after a task is successfully saved, so a parent (e.g. the
   * task list) can refresh without the user needing to reload the page. */
  onCreated?: () => void;
}

/**
 * Thin wrapper around the shared TaskForm in "create" mode. External
 * props are unchanged from before this file was refactored to share code
 * with EditTaskForm (Feature 20) - StudyPlanClient.tsx (Feature 19)
 * needed zero changes as a result.
 */
export function CreateTaskForm({ initialSubjects, onCreated }: CreateTaskFormProps) {
  return (
    <Card title="Add a Task">
      <TaskForm mode="create" initialSubjects={initialSubjects} onSaved={() => onCreated?.()} />
    </Card>
  );
}
