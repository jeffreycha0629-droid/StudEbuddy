"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { saveAvailability } from "@/lib/actions/onboarding";
import {
  DAYS_OF_WEEK,
  MAX_AVAILABLE_MINUTES,
  parseTimeToMinutes,
} from "@/lib/onboarding-constants";
import type { StudyAvailability } from "@/types/database";

export interface AvailabilityStepProps {
  initialAvailability: StudyAvailability[];
}

interface DayState {
  available: boolean;
  startTime: string;
  endTime: string;
  minutes: string;
}

function dayLabel(dayOfWeek: number): string {
  return DAYS_OF_WEEK.find((day) => day.value === dayOfWeek)?.label ?? "that day";
}

function buildInitialState(initial: StudyAvailability[]): Record<number, DayState> {
  const byDay = new Map(initial.map((row) => [row.day_of_week, row]));
  const state: Record<number, DayState> = {};
  for (const day of DAYS_OF_WEEK) {
    const existing = byDay.get(day.value);
    state[day.value] = {
      available: existing?.available ?? false,
      // Postgres returns "time" columns as "HH:MM:SS" - trim to "HH:MM"
      // to match what <input type="time"> expects.
      startTime: existing?.start_time ? existing.start_time.slice(0, 5) : "",
      endTime: existing?.end_time ? existing.end_time.slice(0, 5) : "",
      minutes: existing?.available_minutes != null ? String(existing.available_minutes) : "",
    };
  }
  return state;
}

export function AvailabilityStep({ initialAvailability }: AvailabilityStepProps) {
  const router = useRouter();

  const [days, setDays] = useState<Record<number, DayState>>(() =>
    buildInitialState(initialAvailability),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateDay(value: number, patch: Partial<DayState>) {
    setDays((current) => ({
      ...current,
      [value]: { ...current[value], ...patch },
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);

    const payload = DAYS_OF_WEEK.map((day) => {
      const state = days[day.value];
      const parsedMinutes = state.minutes.trim() === "" ? null : Number(state.minutes);
      return {
        dayOfWeek: day.value,
        available: state.available,
        startTime: state.available && state.startTime ? state.startTime : null,
        endTime: state.available && state.endTime ? state.endTime : null,
        availableMinutes:
          state.available && parsedMinutes !== null && !Number.isNaN(parsedMinutes)
            ? parsedMinutes
            : null,
      };
    });

    for (const day of payload) {
      if (!day.available) continue;

      if (!day.startTime || !day.endTime) {
        setError(`Please enter a start and end time for ${dayLabel(day.dayOfWeek)}.`);
        return;
      }

      const startMinutes = parseTimeToMinutes(day.startTime);
      const endMinutes = parseTimeToMinutes(day.endTime);
      if (startMinutes === null || endMinutes === null) {
        setError("Please enter valid times.");
        return;
      }
      if (startMinutes >= endMinutes) {
        setError(`${dayLabel(day.dayOfWeek)}'s end time must be after its start time.`);
        return;
      }

      if (day.availableMinutes === null || day.availableMinutes <= 0) {
        setError(`Please enter how many minutes you can study on ${dayLabel(day.dayOfWeek)}.`);
        return;
      }
      if (day.availableMinutes > endMinutes - startMinutes) {
        setError(
          `${dayLabel(day.dayOfWeek)}: study minutes can't be more than the time window you selected.`,
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const result = await saveAvailability(payload);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/onboarding?step=7");
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card title="Weekly Availability">
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        <p className="text-sm text-text-muted">
          Which days can you study? For each one, tell us roughly when and
          for how long — for example, Monday 4:00 PM–6:00 PM, 60 minutes
          available.
        </p>

        {error && (
          <p
            role="alert"
            className="rounded-sm border-l-4 border-error bg-surface-muted px-3 py-2 text-sm text-error"
          >
            {error}
          </p>
        )}

        <div className="flex flex-col gap-3">
          {DAYS_OF_WEEK.map((day) => {
            const state = days[day.value];
            return (
              <div
                key={day.value}
                className="flex flex-col gap-3 rounded-md border border-border p-3"
              >
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={state?.available ?? false}
                    onChange={() => updateDay(day.value, { available: !state?.available })}
                    disabled={isSubmitting}
                    className="h-4 w-4 rounded-sm border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  />
                  {day.label}
                </label>

                {state?.available && (
                  <div className="flex flex-wrap gap-3 pl-6">
                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor={`start-${day.value}`}
                        className="text-xs text-text-muted"
                      >
                        Start time
                      </label>
                      <Input
                        id={`start-${day.value}`}
                        type="time"
                        value={state.startTime}
                        onChange={(e) => updateDay(day.value, { startTime: e.target.value })}
                        disabled={isSubmitting}
                        className="w-32"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label htmlFor={`end-${day.value}`} className="text-xs text-text-muted">
                        End time
                      </label>
                      <Input
                        id={`end-${day.value}`}
                        type="time"
                        value={state.endTime}
                        onChange={(e) => updateDay(day.value, { endTime: e.target.value })}
                        disabled={isSubmitting}
                        className="w-32"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label
                        htmlFor={`minutes-${day.value}`}
                        className="text-xs text-text-muted"
                      >
                        Minutes available
                      </label>
                      <Input
                        id={`minutes-${day.value}`}
                        type="number"
                        min={0}
                        max={MAX_AVAILABLE_MINUTES}
                        value={state.minutes}
                        onChange={(e) => updateDay(day.value, { minutes: e.target.value })}
                        disabled={isSubmitting}
                        className="w-28"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 pt-2">
          <Link href="/onboarding?step=5" className="flex-1">
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
