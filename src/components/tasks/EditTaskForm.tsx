"use client";

import { TaskForm } from "@/components/tasks/TaskForm";
import type { StudyTask, Subject } from "@/types/database";

export interface EditTaskFormProps {
  task: StudyTask;
  subjects: Subject[];
  onSaved: (task: StudyTask) => void;
  onCancel: () => void;
}

export function EditTaskForm({ task, subjects, onSaved, onCancel }: EditTaskFormProps) {
  return (
    <TaskForm
      mode="edit"
      initialSubjects={subjects}
      initialTask={task}
      onSaved={onSaved}
      onCancel={onCancel}
    />
  );
}
