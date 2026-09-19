"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export interface BasicInfoStepProps {
  initialProfile: Profile | null;
}

export function BasicInfoStep({ initialProfile }: BasicInfoStepProps) {
  const router = useRouter();

  const [displayName, setDisplayName] = useState(initialProfile?.display_name ?? "");
  const [gradeLevel, setGradeLevel] = useState(initialProfile?.grade_level ?? "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setFormError(null);

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
      router.push("/onboarding?step=3");
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

        <div className="flex gap-3 pt-2">
          <Link href="/onboarding?step=1" className="flex-1">
            <Button type="button" variant="secondary" className="w-full" disabled={isSubmitting}>
              Back
            </Button>
          </Link>
          <Button type="submit" isLoading={isSubmitting} className="flex-1">
            Continue
          </Button>
        </div>
      </form>
    </Card>
  );
}
