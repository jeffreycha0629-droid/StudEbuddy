"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CheckInForm } from "@/components/dashboard/CheckInForm";
import { createClient } from "@/lib/supabase/client";
import { CHALLENGE_OPTIONS, MOOD_OPTIONS, getLocalDateString } from "@/lib/checkin-constants";
import type { DailyCheckIn } from "@/types/database";

type ViewState = "loading" | "form" | "summary" | "editing";

function formatMood(mood: string): string {
  return MOOD_OPTIONS.find((option) => option.value === mood)?.label ?? mood;
}

function formatChallenge(checkIn: DailyCheckIn): string {
  const label = CHALLENGE_OPTIONS.find((option) => option.value === checkIn.challenge)?.label
    ?? checkIn.challenge;
  if (checkIn.challenge === "other" && checkIn.challenge_other) {
    return `${label} — ${checkIn.challenge_other}`;
  }
  return label;
}

/**
 * Self-contained: fetches today's check-in itself on mount rather than
 * receiving it as a server-fetched prop, because "today" has to mean the
 * student's own local calendar day (getLocalDateString(), computed from
 * the browser's clock) - a server-computed date could be wrong near
 * midnight for anyone not in the server's timezone. RLS still protects
 * this query the same way regardless of which Supabase client runs it.
 */
export function DailyCheckInCard() {
  const [view, setView] = useState<ViewState>("loading");
  const [checkIn, setCheckIn] = useState<DailyCheckIn | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const todayLocal = getLocalDateString();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("daily_checkins")
          .select("*")
          .eq("checkin_date", todayLocal)
          .maybeSingle();

        if (cancelled) return;

        if (error) {
          setLoadError("Couldn't load today's check-in.");
          setView("form");
          return;
        }

        if (data) {
          setCheckIn(data as DailyCheckIn);
          setView("summary");
        } else {
          setView("form");
        }
      } catch {
        if (!cancelled) {
          setLoadError("Couldn't load today's check-in.");
          setView("form");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [todayLocal]);

  function handleSaved(saved: DailyCheckIn) {
    setCheckIn(saved);
    setLoadError(null);
    setView("summary");
  }

  if (view === "loading") {
    return (
      <Card title="Daily Check-In">
        <p className="text-sm text-text-muted">Loading...</p>
      </Card>
    );
  }

  if (view === "form" || view === "editing") {
    return (
      <Card title="Daily Check-In">
        {loadError && (
          <p
            role="alert"
            className="mb-3 rounded-sm border-l-4 border-error bg-surface-muted px-3 py-2 text-sm text-error"
          >
            {loadError}
          </p>
        )}
        <CheckInForm
          checkinDate={todayLocal}
          initialCheckIn={view === "editing" ? checkIn : null}
          onSaved={handleSaved}
          onCancel={view === "editing" ? () => setView("summary") : undefined}
        />
      </Card>
    );
  }

  // summary
  return (
    <Card title="Daily Check-In">
      <div className="flex flex-col gap-2 text-sm">
        <p className="text-success">You&apos;ve checked in today. Nice work.</p>
        {checkIn && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-text-muted">
            <dt>Mood</dt>
            <dd>{formatMood(checkIn.mood)}</dd>
            <dt>Energy</dt>
            <dd>{checkIn.energy}/5</dd>
            <dt>Focus</dt>
            <dd>{checkIn.focus}/5</dd>
            <dt>Motivation</dt>
            <dd>{checkIn.motivation}/5</dd>
            <dt>Biggest challenge</dt>
            <dd>{formatChallenge(checkIn)}</dd>
          </dl>
        )}
      </div>
      <Button
        type="button"
        variant="secondary"
        className="mt-3"
        onClick={() => setView("editing")}
      >
        Edit Check-In
      </Button>
    </Card>
  );
}
