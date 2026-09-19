"use client";

import { FormEvent, KeyboardEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { saveSubjects } from "@/lib/actions/onboarding";
import { MAX_SUBJECTS, SUGGESTED_SUBJECTS } from "@/lib/onboarding-constants";
import { cn } from "@/lib/utils/cn";
import type { Subject } from "@/types/database";

export interface SubjectsStepProps {
  initialSubjects: Subject[];
}

export function SubjectsStep({ initialSubjects }: SubjectsStepProps) {
  const router = useRouter();

  const [subjects, setSubjects] = useState<string[]>(initialSubjects.map((s) => s.name));
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function isAlreadyAdded(name: string): boolean {
    return subjects.some((s) => s.toLowerCase() === name.toLowerCase());
  }

  /**
   * Shared by both the suggested chips and the custom text field, so
   * duplicate detection and the max-count limit behave identically no
   * matter which way a subject was added.
   */
  function addSubject(name: string): boolean {
    const trimmed = name.trim();
    if (!trimmed) return false;

    if (isAlreadyAdded(trimmed)) {
      setError("You've already added that subject.");
      return false;
    }
    if (subjects.length >= MAX_SUBJECTS) {
      setError(`You can add up to ${MAX_SUBJECTS} subjects.`);
      return false;
    }

    setError(null);
    setSubjects((current) => [...current, trimmed]);
    return true;
  }

  function removeSubject(name: string) {
    setSubjects((current) => current.filter((s) => s !== name));
  }

  function toggleSuggested(name: string) {
    const existing = subjects.find((s) => s.toLowerCase() === name.toLowerCase());
    if (existing) {
      removeSubject(existing);
    } else {
      addSubject(name);
    }
  }

  function handleAddDraft() {
    if (addSubject(draft)) {
      setDraft("");
    }
  }

  function handleDraftKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleAddDraft();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);
    try {
      const result = await saveSubjects(subjects);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/onboarding?step=4");
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card title="Subjects">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <p className="text-sm text-text-muted">
          What subjects or classes are you studying? Tap any that apply, or
          add your own below — you can change these later.
        </p>

        {error && (
          <p
            role="alert"
            className="rounded-sm border-l-4 border-error bg-surface-muted px-3 py-2 text-sm text-error"
          >
            {error}
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-foreground">Common subjects</span>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_SUBJECTS.map((name) => {
              const selected = isAlreadyAdded(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleSuggested(name)}
                  disabled={isSubmitting}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                    selected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-surface text-foreground hover:bg-surface-muted",
                  )}
                >
                  {selected ? "✓ " : ""}
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Not wrapped in FormField: this is a compound add-row (input +
            button), not a single field, so FormField's prop-cloning isn't
            a fit here - a plain linked label avoids that mismatch. */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="subject-draft" className="text-sm font-medium text-foreground">
            Add a custom subject
          </label>
          <div className="flex gap-2">
            <Input
              id="subject-draft"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleDraftKeyDown}
              placeholder="e.g. AP US History"
              disabled={isSubmitting}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleAddDraft}
              disabled={isSubmitting}
            >
              Add
            </Button>
          </div>
        </div>

        {subjects.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {subjects.map((name) => (
              <li
                key={name}
                className="flex items-center gap-2 rounded-md bg-surface-muted px-3 py-1.5 text-sm text-foreground"
              >
                {name}
                <button
                  type="button"
                  onClick={() => removeSubject(name)}
                  aria-label={`Remove ${name}`}
                  disabled={isSubmitting}
                  className="text-text-muted hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-3 pt-2">
          <Link href="/onboarding?step=2" className="flex-1">
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

