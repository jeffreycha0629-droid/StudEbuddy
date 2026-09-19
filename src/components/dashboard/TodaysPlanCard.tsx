"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { StudyTimer } from "@/components/dashboard/StudyTimer";
import { sessionMethodLabel } from "@/lib/session-format";
import { subjectName } from "@/lib/task-format";
import { createClient } from "@/lib/supabase/client";
import { getLocalDateString } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import type { StudySession, Subject } from "@/types/database";

export interface TodaysPlanCardProps {
  subjects: Subject[];
}

type LoadState = "loading" | "loaded" | "error";

/**
 * Self-fetches (same pattern as DailyCheckInCard) rather than receiving
 * a server-fetched list as a prop, because "today" has to mean the
 * student's own local calendar day - a server-computed date could be
 * wrong near midnight for anyone not in the server's timezone.
 */
export function TodaysPlanCard({ subjects }: TodaysPlanCardProps) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [sessions, setSessions] = useState<StudySession[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadState("loading");
      try {
        const supabase = createClient();
        const today = getLocalDateString();
        const { data, error } = await supabase
          .from("study_sessions")
          .select("*")
          .eq("scheduled_date", today)
          .order("scheduled_start", { ascending: true, nullsFirst: false });

        if (cancelled) return;

        if (error) {
          setLoadState("error");
          return;
        }

        setSessions((data ?? []) as StudySession[]);
        setLoadState("loaded");
      } catch {
        if (!cancelled) setLoadState("error");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleSessionUpdated(updated: StudySession) {
    setSessions((current) => current.map((session) => (session.id === updated.id ? updated : session)));
  }

  if (loadState === "loading") {
    return (
      <Card title="Today's Plan">
        <p className="text-sm text-text-muted">Loading today&apos;s plan...</p>
      </Card>
    );
  }

  if (loadState === "error") {
    return (
      <Card title="Today's Plan">
        <p
          role="alert"
          className="rounded-sm border-l-4 border-error bg-surface-muted px-3 py-2 text-sm text-error"
        >
          Couldn&apos;t load today&apos;s plan. Please refresh the page to try again.
        </p>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card title="Today's Plan">
        <p className="text-sm text-text-muted">
          No study sessions scheduled for today. Build a study plan from the
          Study Plan page to see it here.
        </p>
      </Card>
    );
  }

  // Only within what this widget can see (today's sessions) - the
  // server independently enforces the real, global rule regardless.
  const hasVisibleActiveOrPaused = sessions.some(
    (session) => session.status === "in_progress" || session.status === "paused",
  );

  return (
    <Card title="Today's Plan">
      <div className="flex flex-col gap-3">
        {sessions.map((session) => {
          const isActiveHere = session.status === "in_progress" || session.status === "paused";
          const method = sessionMethodLabel(session.study_method);
          const isFinished = session.status === "completed" || session.status === "skipped";

          return (
            <div
              key={session.id}
              className={cn(
                "rounded-md border p-3",
                isActiveHere ? "border-primary bg-surface-muted" : "border-border",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {subjectName(subjects, session.subject_id) ?? "General"}
                  </p>
                  <p className="text-xs text-text-muted">{session.topic ?? session.title}</p>
                </div>
                <p className="whitespace-nowrap text-xs text-text-muted">
                  {session.planned_duration_minutes} min planned
                </p>
              </div>

              {session.objective && (
                <p className="mt-2 text-xs text-text-muted">{session.objective}</p>
              )}

              {method && <p className="mt-1 text-xs text-text-muted">Method: {method}</p>}

              <div className="mt-2">
                {isFinished ? (
                  <span className="text-xs capitalize text-text-muted">{session.status}</span>
                ) : (
                  <StudyTimer
                    session={session}
                    onUpdated={handleSessionUpdated}
                    disabled={hasVisibleActiveOrPaused && !isActiveHere}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
