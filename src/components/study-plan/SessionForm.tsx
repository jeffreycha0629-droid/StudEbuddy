"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createStudySession } from "@/lib/actions/study-plans";
import {
  MAX_OBJECTIVE_LENGTH,
  MAX_SESSION_DURATION_MINUTES,
  MAX_TOPIC_LENGTH,
  SESSION_STUDY_METHODS,
} from "@/lib/session-constants";
import type { StudySession } from "@/types/database";

export interface SessionFormProps {
  planId: string;
  onCreated: (session: StudySession) => void;
}

interface FieldErrors {
  scheduledDate?: string;
  plannedDurationMinutes?: string;
  topic?: string;
  objective?: string;
}

export function SessionForm({ planId, onCreated }: SessionFormProps) {
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [topic, setTopic] = useState("");
  const [objective, setObjective] = useState("");
  const [duration, setDuration] = useState("");
  const [studyMethod, setStudyMethod] = useState("");
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
    if (objective.trim().length > MAX_OBJECTIVE_LENGTH) {
      errors.objective = `Objective must be ${MAX_OBJECTIVE_LENGTH} characters or fewer.`;
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const result = await createStudySession({
        planId,
        scheduledDate,
        scheduledStart: scheduledStart || null,
        topic: topic.trim() || null,
        objective: objective.trim() || null,
        plannedDurationMinutes: parsedDuration,
        studyMethod: studyMethod || null,
      });

      if (result.error || !result.session) {
        setFormError(result.error ?? "Something went wrong. Please try again.");
        return;
      }

      onCreated(result.session);
      setScheduledDate("");
      setScheduledStart("");
      setTopic("");
      setObjective("");
      setDuration("");
      setStudyMethod("");
    } catch {
      setFormError("Something went wrong. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <h4 className="text-sm font-semibold text-foreground">Add a Study Session</h4>

      {formError && (
        <p
          role="alert"
          className="rounded-sm border-l-4 border-error bg-surface-muted px-3 py-2 text-sm text-error"
        >
          {formError}
        </p>
      )}

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <FormField label="Date" required error={fieldErrors.scheduledDate}>
            <Input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              disabled={isSubmitting}
            />
          </FormField>
        </div>
        <div className="flex-1">
          <FormField label="Time" hint="Optional">
            <Input
              type="time"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
              disabled={isSubmitting}
            />
          </FormField>
        </div>
      </div>

      <FormField label="Topic" hint="Optional" error={fieldErrors.topic}>
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={isSubmitting}
          placeholder="e.g. Cell Review"
        />
      </FormField>

      <FormField label="Objective" hint="Optional" error={fieldErrors.objective}>
        <Input
          value={objective}
          onChange={(e) => setObjective(e.target.value)}
          disabled={isSubmitting}
          placeholder="e.g. Be able to label the parts of a cell"
        />
      </FormField>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
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
        </div>
        <div className="flex-1">
          <FormField label="Study Method" hint="Optional">
            <Select
              value={studyMethod}
              onChange={(e) => setStudyMethod(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Not set</option>
              {SESSION_STUDY_METHODS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormField>
        </div>
      </div>

      <Button type="submit" isLoading={isSubmitting} className="w-full sm:w-auto">
        Add Session
      </Button>
    </form>
  );
}
