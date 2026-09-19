"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { savePreferences } from "@/lib/actions/onboarding";
import { STUDY_METHODS } from "@/lib/onboarding-constants";
import type { StudyPreferences } from "@/types/database";

export interface PreferencesStepProps {
  initialPreferences: StudyPreferences | null;
}

export function PreferencesStep({ initialPreferences }: PreferencesStepProps) {
  const router = useRouter();

  const [selected, setSelected] = useState<string[]>(
    Array.isArray(initialPreferences?.preferences) ? initialPreferences!.preferences : [],
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleMethod(value: string) {
    setSelected((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const result = await savePreferences(selected);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/onboarding?step=6");
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card title="Study Preferences">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <p className="text-sm text-text-muted">
          How do you like to study? This is just self-reported and helps
          shape suggestions later — it&apos;s not a scientific assessment or
          diagnosis of any kind, and you can change your answers anytime.
        </p>

        {error && (
          <p
            role="alert"
            className="rounded-sm border-l-4 border-error bg-surface-muted px-3 py-2 text-sm text-error"
          >
            {error}
          </p>
        )}

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-foreground">Study methods</legend>
          {STUDY_METHODS.map((method) => (
            <label key={method.value} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={selected.includes(method.value)}
                onChange={() => toggleMethod(method.value)}
                disabled={isSubmitting}
                className="h-4 w-4 rounded-sm border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              />
              {method.label}
            </label>
          ))}
        </fieldset>

        <div className="flex gap-3 pt-2">
          <Link href="/onboarding?step=4" className="flex-1">
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
