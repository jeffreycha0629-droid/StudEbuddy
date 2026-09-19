"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { createTask, updateTask } from "@/lib/actions/tasks";
import {
  DIFFICULTY_OPTIONS,
  MAX_ESTIMATED_MINUTES,
  MAX_NOTES_LENGTH,
  MAX_TITLE_LENGTH,
  TASK_TYPES,
} from "@/lib/task-constants";
import type { StudyTask, Subject } from "@/types/database";

export interface TaskFormProps {
  mode: "create" | "edit";
  initialSubjects: Subject[];
  /** Required and used to pre-fill fields when mode is "edit". */
  initialTask?: StudyTask | null;
  onSaved: (task: StudyTask) => void;
  /** Shown only in edit mode. */
  onCancel?: () => void;
}

interface FormState {
  title: string;
  subjectId: string;
  taskType: string;
  dueDate: string;
  dueTime: string;
  difficulty: string;
  estimatedMinutes: string;
  notes: string;
}

interface FieldErrors {
  title?: string;
  taskType?: string;
  dueDate?: string;
  estimatedMinutes?: string;
  notes?: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  subjectId: "",
  taskType: "",
  dueDate: "",
  dueTime: "",
  difficulty: "",
  estimatedMinutes: "",
  notes: "",
};

function formStateFromTask(task: StudyTask): FormState {
  return {
    title: task.title,
    subjectId: task.subject_id ?? "",
    taskType: task.task_type,
    dueDate: task.due_date,
    dueTime: task.due_time ? task.due_time.slice(0, 5) : "",
    difficulty: task.difficulty ?? "",
    estimatedMinutes: task.estimated_study_minutes != null ? String(task.estimated_study_minutes) : "",
    notes: task.notes ?? "",
  };
}

export function TaskForm({ mode, initialSubjects, initialTask, onSaved, onCancel }: TaskFormProps) {
  const [form, setForm] = useState<FormState>(
    mode === "edit" && initialTask ? formStateFromTask(initialTask) : EMPTY_FORM,
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof FormState>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setFormError(null);
    setSuccessMessage(null);

    const errors: FieldErrors = {};
    const trimmedTitle = form.title.trim();
    if (!trimmedTitle) {
      errors.title = "Please enter a title.";
    } else if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      errors.title = `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`;
    }

    if (!form.taskType) errors.taskType = "Please select a task type.";
    if (!form.dueDate) errors.dueDate = "Please select a due date.";

    let estimatedMinutes: number | null = null;
    if (form.estimatedMinutes.trim() !== "") {
      const parsed = Number(form.estimatedMinutes);
      if (!Number.isInteger(parsed) || parsed <= 0 || parsed > MAX_ESTIMATED_MINUTES) {
        errors.estimatedMinutes = `Enter a number between 1 and ${MAX_ESTIMATED_MINUTES} minutes.`;
      } else {
        estimatedMinutes = parsed;
      }
    }

    if (form.notes.trim().length > MAX_NOTES_LENGTH) {
      errors.notes = `Notes must be ${MAX_NOTES_LENGTH} characters or fewer.`;
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload = {
      title: trimmedTitle,
      subjectId: form.subjectId || null,
      taskType: form.taskType,
      dueDate: form.dueDate,
      dueTime: form.dueTime || null,
      difficulty: form.difficulty || null,
      estimatedMinutes,
      notes: form.notes.trim() || null,
    };

    setIsSubmitting(true);
    try {
      const result =
        mode === "edit" && initialTask
          ? await updateTask({ ...payload, taskId: initialTask.id })
          : await createTask(payload);

      if (result.error || !result.task) {
        setFormError(result.error ?? "Something went wrong. Please try again.");
        return;
      }

      if (mode === "create") {
        setForm(EMPTY_FORM);
        setSuccessMessage(`"${result.task.title}" was added.`);
      }
      onSaved(result.task);
    } catch {
      setFormError("Something went wrong. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      {formError && (
        <p
          role="alert"
          className="rounded-sm border-l-4 border-error bg-surface-muted px-3 py-2 text-sm text-error"
        >
          {formError}
        </p>
      )}
      {successMessage && (
        <p
          role="status"
          className="rounded-sm border-l-4 border-success bg-surface-muted px-3 py-2 text-sm text-foreground"
        >
          {successMessage}
        </p>
      )}

      <FormField label="Title" required error={fieldErrors.title}>
        <Input
          value={form.title}
          onChange={(e) => updateField("title", e.target.value)}
          disabled={isSubmitting}
          placeholder="e.g. Chapter 5 reading"
        />
      </FormField>

      <FormField
        label="Subject"
        hint={initialSubjects.length === 0 ? "You haven't added any subjects yet." : "Optional"}
      >
        <Select
          value={form.subjectId}
          onChange={(e) => updateField("subjectId", e.target.value)}
          disabled={isSubmitting || initialSubjects.length === 0}
        >
          <option value="">No subject</option>
          {initialSubjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.name}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Task Type" required error={fieldErrors.taskType}>
        <Select
          value={form.taskType}
          onChange={(e) => updateField("taskType", e.target.value)}
          disabled={isSubmitting}
        >
          <option value="" disabled>
            Select a task type
          </option>
          {TASK_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>
      </FormField>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <FormField label="Due Date" required error={fieldErrors.dueDate}>
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) => updateField("dueDate", e.target.value)}
              disabled={isSubmitting}
            />
          </FormField>
        </div>
        <div className="flex-1">
          <FormField label="Due Time" hint="Optional">
            <Input
              type="time"
              value={form.dueTime}
              onChange={(e) => updateField("dueTime", e.target.value)}
              disabled={isSubmitting}
            />
          </FormField>
        </div>
      </div>

      <FormField label="Difficulty" hint="Optional">
        <Select
          value={form.difficulty}
          onChange={(e) => updateField("difficulty", e.target.value)}
          disabled={isSubmitting}
        >
          <option value="">Not set</option>
          {DIFFICULTY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField
        label="Estimated Study Time (minutes)"
        hint="Optional"
        error={fieldErrors.estimatedMinutes}
      >
        <Input
          type="number"
          min={1}
          max={MAX_ESTIMATED_MINUTES}
          value={form.estimatedMinutes}
          onChange={(e) => updateField("estimatedMinutes", e.target.value)}
          disabled={isSubmitting}
        />
      </FormField>

      <FormField label="Notes" hint="Optional" error={fieldErrors.notes}>
        <Textarea
          value={form.notes}
          onChange={(e) => updateField("notes", e.target.value)}
          disabled={isSubmitting}
          rows={3}
        />
      </FormField>

      <div className="flex gap-3">
        {mode === "edit" && onCancel && (
          <Button
            type="button"
            variant="secondary"
            className="flex-1 sm:flex-none"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          isLoading={isSubmitting}
          className={mode === "edit" ? "flex-1 sm:flex-none" : "w-full sm:w-auto"}
        >
          {mode === "edit" ? "Save Changes" : "Add Task"}
        </Button>
      </div>
    </form>
  );
}
