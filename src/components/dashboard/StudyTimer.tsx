"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  endStudySession,
  pauseStudySession,
  resumeStudySession,
  startStudySession,
} from "@/lib/actions/study-plans";
import { cn } from "@/lib/utils/cn";
import type { StudySession } from "@/types/database";

export interface StudyTimerProps {
  session: StudySession;
  onUpdated: (session: StudySession) => void;
  /** True when another session is already in_progress/paused elsewhere. */
  disabled: boolean;
}

const CONFIDENCE_VALUES = [1, 2, 3, 4, 5] as const;

function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Elapsed time is always derived from accumulated_seconds (banked time
 * from previous running segments) plus now - last_resumed_at (only
 * while actually running) - never from a counter that increments on its
 * own. This is what makes it correct across a page refresh: refreshing
 * just re-fetches the session and recomputes from the same absolute
 * timestamps, so it reflects real elapsed wall-clock time rather than
 * resetting or freezing.
 */
function computeElapsedSeconds(session: StudySession, nowMs: number): number {
  let seconds = session.accumulated_seconds;
  if (session.status === "in_progress" && session.last_resumed_at) {
    const lastResumedMs = new Date(session.last_resumed_at).getTime();
    seconds += Math.max(0, Math.floor((nowMs - lastResumedMs) / 1000));
  }
  return seconds;
}

type ActionResult = { error: string | null; session: StudySession | null };

export function StudyTimer({ session, onUpdated, disabled }: StudyTimerProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [confidenceRating, setConfidenceRating] = useState<number | null>(null);

  // Only ticks while actually running and not in the completion prompt -
  // clicking "End" visually freezes the displayed time to match what
  // will actually be recorded.
  useEffect(() => {
    if (session.status !== "in_progress" || isCompleting) return;
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [session.status, isCompleting]);

  const elapsedSeconds = computeElapsedSeconds(session, nowMs);

  async function runAction(action: () => Promise<ActionResult>) {
    if (isBusy) return;

    setError(null);
    setIsBusy(true);
    try {
      const result = await action();
      if (result.error || !result.session) {
        setError(result.error ?? "Something went wrong. Please try again.");
        return;
      }
      setNowMs(Date.now());
      setIsCompleting(false);
      setConfidenceRating(null);
      onUpdated(result.session);
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setIsBusy(false);
    }
  }

  function handleEndClick() {
    setError(null);
    setIsCompleting(true);
  }

  function handleBack() {
    setError(null);
    setIsCompleting(false);
    setConfidenceRating(null);
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p
          role="alert"
          className="rounded-sm border-l-4 border-error bg-surface-muted px-3 py-2 text-sm text-error"
        >
          {error}
        </p>
      )}

      {(session.status === "in_progress" || session.status === "paused") && (
        <p
          className="text-lg font-semibold tabular-nums text-foreground"
          aria-live="polite"
        >
          {formatElapsed(elapsedSeconds)}
          {session.status === "paused" && !isCompleting && (
            <span className="ml-2 text-xs font-normal text-text-muted">Paused</span>
          )}
        </p>
      )}

      {isCompleting ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">
            How confident do you feel now?{" "}
            <span className="font-normal text-text-muted">(optional)</span>
          </p>
          <div className="flex gap-2">
            {CONFIDENCE_VALUES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setConfidenceRating(n)}
                disabled={isBusy}
                aria-pressed={confidenceRating === n}
                aria-label={`Confidence ${n} out of 5`}
                className={cn(
                  "h-9 w-9 rounded-md border text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                  confidenceRating === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface text-foreground hover:bg-surface-muted",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={handleBack} disabled={isBusy}>
              Back
            </Button>
            <Button
              type="button"
              variant="primary"
              isLoading={isBusy}
              onClick={() =>
                runAction(() => endStudySession({ sessionId: session.id, confidenceRating }))
              }
            >
              Finish Session
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          {session.status === "scheduled" &&
            (disabled ? (
              <p className="text-xs text-text-muted">Finish your current session first</p>
            ) : (
              <Button
                type="button"
                variant="primary"
                isLoading={isBusy}
                onClick={() => runAction(() => startStudySession(session.id))}
              >
                Start
              </Button>
            ))}

          {session.status === "in_progress" && (
            <>
              <Button
                type="button"
                variant="secondary"
                isLoading={isBusy}
                onClick={() => runAction(() => pauseStudySession(session.id))}
              >
                Pause
              </Button>
              <Button type="button" variant="secondary" onClick={handleEndClick}>
                End
              </Button>
            </>
          )}

          {session.status === "paused" && (
            <>
              <Button
                type="button"
                variant="primary"
                isLoading={isBusy}
                onClick={() => runAction(() => resumeStudySession(session.id))}
              >
                Resume
              </Button>
              <Button type="button" variant="secondary" onClick={handleEndClick}>
                End
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
