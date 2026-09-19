"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { saveBasicInfo } from "@/lib/actions/onboarding";
import { GRADE_LEVELS } from "@/lib/onboarding-constants";
import type { Profile } from "@/types/database";

interface FieldErrors {
  displayName?: string;
  gradeLevel?: string;
}

export interface BasicInfoEditorProps {
  initialProfile: Profile | null;
}

/**
 * Reuses the same saveBasicInfo Server Action as onboarding's BasicInfoStep
 * (same validation, same database write) - only the surrounding UI differs:
 * this stays on the page and shows an inline "Saved" message instead of
 * navigating to the next onboarding step, since there is no "next step"
 * once onboarding is already complete.
 */
export function BasicInfoEditor({ initialProfile }: BasicInfoEditorProps) {
  const [displayName, setDisplayName] = useState(initialProfile?.display_name ?? "");
  const [gradeLevel, setGradeLevel] = useState(initialProfile?.grade_level ?? "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setFormError(null);
    setSuccessMessage(null);

    const errors: FieldErrors = {};
    if (!displayName.trim()) errors.displayName = "Please enter your name.";
    if (!gradeLevel) errors.gradeLevel = "Please select your grade level.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const result = await saveBasicInfo(displayName, gradeLevel);
      if (result.error) {
        setFormError(result.error);
        return;
      }
      setSuccessMessage("Saved.");
    } catch {
      setFormError("Something went wrong. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card title="Basic Information">
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

        <FormField label="What should we call you?" required error={fieldErrors.displayName}>
          <Input
            name="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={isSubmitting}
            autoComplete="name"
          />
        </FormField>

        <FormField label="Grade Level" required error={fieldErrors.gradeLevel}>
          <Select
            name="gradeLevel"
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            disabled={isSubmitting}
          >
            <option value="" disabled>
              Select your grade level
            </option>
            {GRADE_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </Select>
        </FormField>

        <Button type="submit" isLoading={isSubmitting} className="w-full sm:w-auto">
          Save Changes
        </Button>
      </form>
    </Card>
  );
}
