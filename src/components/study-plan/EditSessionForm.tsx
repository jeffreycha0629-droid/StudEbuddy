"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { updateStudySession } from "@/lib/actions/study-plans";
import { MAX_SESSION_DURATION_MINUTES, MAX_TOPIC_LENGTH } from "@/lib/session-constants";
import type { StudySession } from "@/types/database";

export interface EditSessionFormProps {
  session: StudySession;
  onSaved: (session: StudySession) => void;
  onCancel: () => void;
}

interface FieldErrors {
  scheduledDate?: string;
  plannedDurationMinutes?: string;
  topic?: string;
}

export function EditSessionForm({ session, onSaved, onCancel }: EditSessionFormProps) {
  const [scheduledDate, setScheduledDate] = useState(session.scheduled_date);
  const [topic, setTopic] = useState(session.topic ?? "");
  const [duration, setDuration] = useState(String(session.planned_duration_minutes));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setFormError(null);

    const errors: FieldErrors = {};
    if (!scheduledDate) errors.scheduledDate = "Please select a date.";

    let parsedDuration = 0;
    if (!duration.trim()) {
      errors.plannedDurationMinutes = "Please enter a duration.";
    } else {
      parsedDuration = Number(duration);
      if (
        !Number.isInteger(parsedDuration) ||
        parsedDuration <= 0 ||
        parsedDuration > MAX_SESSION_DURATION_MINUTES
      ) {
        errors.plannedDurationMinutes = `Enter a number between 1 and ${MAX_SESSION_DURATION_MINUTES} minutes.`;
      }
    }

    if (topic.trim().length > MAX_TOPIC_LENGTH) {
      errors.topic = `Topic must be ${MAX_TOPIC_LENGTH} characters or fewer.`;
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const result = await updateStudySession({
        sessionId: session.id,
        scheduledDate,
        topic: topic.trim() || null,
        plannedDurationMinutes: parsedDuration,
      });

      if (result.error || !result.session) {
        setFormError(result.error ?? "Something went wrong. Please try again.");
        return;
      }

      onSaved(result.session);
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

      <FormField label="Date" required error={fieldErrors.scheduledDate}>
        <Input
          type="date"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
          disabled={isSubmitting}
        />
      </FormField>

      <FormField label="Topic" hint="Optional" error={fieldErrors.topic}>
        <Input value={topic} onChange={(e) => setTopic(e.target.value)} disabled={isSubmitting} />
      </FormField>

      <FormField
        label="Duration (minutes)"
        required
        error={fieldErrors.plannedDurationMinutes}
      >
        <Input
          type="number"
          min={1}
          max={MAX_SESSION_DURATION_MINUTES}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          disabled={isSubmitting}
        />
      </FormField>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="secondary"
          className="flex-1 sm:flex-none"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting} className="flex-1 sm:flex-none">
          Save Changes
        </Button>
      </div>
    </form>
  );
}
