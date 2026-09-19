"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { saveGoals } from "@/lib/actions/onboarding";
import { GOAL_TYPES } from "@/lib/onboarding-constants";
import type { StudyGoal } from "@/types/database";

export interface GoalsStepProps {
  initialGoals: StudyGoal[];
}

export function GoalsStep({ initialGoals }: GoalsStepProps) {
  const router = useRouter();

  const [selected, setSelected] = useState<string[]>(initialGoals.map((g) => g.goal_type));
  const [customGoal, setCustomGoal] = useState(
    initialGoals.find((g) => g.goal_type === "other")?.custom_goal ?? "",
  );
  const [customGoalError, setCustomGoalError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggleGoal(value: string) {
    setSelected((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setCustomGoalError(undefined);

    if (selected.includes("other") && !customGoal.trim()) {
      setCustomGoalError("Please describe your goal.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await saveGoals(selected, customGoal);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/onboarding?step=5");
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card title="Goals">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <p className="text-sm text-text-muted">
          What are you hoping to get out of StudEbuddy? Pick as many as apply.
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
          <legend className="mb-1 text-sm font-medium text-foreground">Goals</legend>
          {GOAL_TYPES.map((goal) => (
            <label key={goal.value} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={selected.includes(goal.value)}
                onChange={() => toggleGoal(goal.value)}
                disabled={isSubmitting}
                className="h-4 w-4 rounded-sm border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              />
              {goal.label}
            </label>
          ))}
        </fieldset>

        {selected.includes("other") && (
          <FormField label="Tell us more" error={customGoalError}>
            <Input
              value={customGoal}
              onChange={(e) => setCustomGoal(e.target.value)}
              disabled={isSubmitting}
              placeholder="What's your goal?"
            />
          </FormField>
        )}

        <div className="flex gap-3 pt-2">
          <Link href="/onboarding?step=3" className="flex-1">
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
