"use client";

import { FormEvent, KeyboardEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { saveSubjects } from "@/lib/actions/onboarding";
import { MAX_SUBJECTS, SUGGESTED_SUBJECTS } from "@/lib/onboarding-constants";
import { cn } from "@/lib/utils/cn";
import type { Subject } from "@/types/database";

export interface SubjectsEditorProps {
  initialSubjects: Subject[];
}

/**
 * Reuses the same saveSubjects Server Action as onboarding's SubjectsStep
 * (which replaces this user's full subject list with exactly what's
 * submitted) - only the surrounding UI differs, per BasicInfoEditor's
 * comment.
 */
export function SubjectsEditor({ initialSubjects }: SubjectsEditorProps) {
  const [subjects, setSubjects] = useState<string[]>(initialSubjects.map((s) => s.name));
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function isAlreadyAdded(name: string): boolean {
    return subjects.some((s) => s.toLowerCase() === name.toLowerCase());
  }

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
    setSuccessMessage(null);
    setSubjects((current) => [...current, trimmed]);
    return true;
  }

  function removeSubject(name: string) {
    setSuccessMessage(null);
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
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      const result = await saveSubjects(subjects);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSuccessMessage("Saved.");
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
          add your own below.
        </p>

        {error && (
          <p
            role="alert"
            className="rounded-sm border-l-4 border-error bg-surface-muted px-3 py-2 text-sm text-error"
          >
            {error}
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

        <div className="flex flex-col gap-1.5">
          <label htmlFor="profile-subject-draft" className="text-sm font-medium text-foreground">
            Add a custom subject
          </label>
          <div className="flex gap-2">
            <Input
              id="profile-subject-draft"
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

        <Button type="submit" isLoading={isSubmitting} className="w-full sm:w-auto">
          Save Changes
        </Button>
      </form>
    </Card>
  );
}
