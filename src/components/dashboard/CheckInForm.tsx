"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { saveCheckIn } from "@/lib/actions/check-in";
import { CHALLENGE_OPTIONS, MOOD_OPTIONS, SCALE_VALUES } from "@/lib/checkin-constants";
import { cn } from "@/lib/utils/cn";
import type { DailyCheckIn } from "@/types/database";

export interface CheckInFormProps {
  checkinDate: string;
  initialCheckIn: DailyCheckIn | null;
  onSaved: (checkIn: DailyCheckIn) => void;
  onCancel?: () => void;
}

interface ScaleFieldProps {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  disabled: boolean;
}

function ScaleField({ label, value, onChange, disabled }: ScaleFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">{label} (1–5)</span>
      <div className="flex gap-2">
        {SCALE_VALUES.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            disabled={disabled}
            aria-pressed={value === n}
            aria-label={`${label} ${n} out of 5`}
            className={cn(
              "h-10 w-10 rounded-md border text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-60",
              value === n
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-foreground hover:bg-surface-muted",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CheckInForm({ checkinDate, initialCheckIn, onSaved, onCancel }: CheckInFormProps) {
  const [mood, setMood] = useState(initialCheckIn?.mood ?? "");
  const [energy, setEnergy] = useState<number | null>(initialCheckIn?.energy ?? null);
  const [focus, setFocus] = useState<number | null>(initialCheckIn?.focus ?? null);
  const [motivation, setMotivation] = useState<number | null>(initialCheckIn?.motivation ?? null);
  const [challenge, setChallenge] = useState(initialCheckIn?.challenge ?? "");
  const [challengeOther, setChallengeOther] = useState(initialCheckIn?.challenge_other ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);

    if (!mood) {
      setError("Please select how you're feeling.");
      return;
    }
    if (energy === null) {
      setError("Please select your energy level.");
      return;
    }
    if (focus === null) {
      setError("Please select your focus level.");
      return;
    }
    if (motivation === null) {
      setError("Please select your motivation level.");
      return;
    }
    if (!challenge) {
      setError("Please select your biggest challenge today.");
      return;
    }
    if (challenge === "other" && !challengeOther.trim()) {
      setError("Please describe your challenge.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await saveCheckIn({
        checkinDate,
        mood,
        energy,
        focus,
        motivation,
        challenge,
        challengeOther: challenge === "other" ? challengeOther.trim() : null,
      });

      if (result.error || !result.checkIn) {
        setError(result.error ?? "Something went wrong. Please try again.");
        return;
      }

      onSaved(result.checkIn);
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      <p className="text-sm text-text-muted">
        This is just for you — a quick, private snapshot of how studying
        feels today, not a medical or mental-health assessment.
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
        <span className="text-sm font-medium text-foreground">Mood</span>
        <div className="flex flex-wrap gap-2">
          {MOOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setMood(option.value)}
              disabled={isSubmitting}
              aria-pressed={mood === option.value}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-60",
                mood === option.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-foreground hover:bg-surface-muted",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <ScaleField label="Energy" value={energy} onChange={setEnergy} disabled={isSubmitting} />
      <ScaleField label="Focus" value={focus} onChange={setFocus} disabled={isSubmitting} />
      <ScaleField
        label="Motivation"
        value={motivation}
        onChange={setMotivation}
        disabled={isSubmitting}
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">Biggest challenge today</span>
        <div className="flex flex-wrap gap-2">
          {CHALLENGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setChallenge(option.value)}
              disabled={isSubmitting}
              aria-pressed={challenge === option.value}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                "disabled:cursor-not-allowed disabled:opacity-60",
                challenge === option.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-foreground hover:bg-surface-muted",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {challenge === "other" && (
        <FormField label="Tell us more">
          <Input
            value={challengeOther}
            onChange={(e) => setChallengeOther(e.target.value)}
            disabled={isSubmitting}
            placeholder="What's going on?"
          />
        </FormField>
      )}

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isSubmitting} className="flex-1">
          {initialCheckIn ? "Save Changes" : "Complete Check-In"}
        </Button>
      </div>
    </form>
  );
}
