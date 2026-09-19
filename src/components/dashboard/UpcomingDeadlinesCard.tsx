"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import { subjectName, taskTypeLabel } from "@/lib/task-format";
import { getLocalDateString } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import type { StudyTask, Subject } from "@/types/database";

export interface UpcomingDeadlinesCardProps {
  subjects: Subject[];
}

type LoadState = "loading" | "loaded" | "error";

const MAX_VISIBLE_TASKS = 5;

/**
 * Self-fetches (same pattern as TodaysPlanCard/DailyCheckInCard) rather
 * than receiving a server-fetched list as a prop, because "today" — the
 * cutoff for what counts as overdue vs. upcoming — has to mean the
 * student's own local calendar day, not the server's.
 */
export function UpcomingDeadlinesCard({ subjects }: UpcomingDeadlinesCardProps) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [tasks, setTasks] = useState<StudyTask[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadState("loading");
      try {
        const supabase = createClient();
        // Includes overdue tasks deliberately (not filtered to due_date >=
        // today) - an overdue assignment is at least as important to
        // surface here as an upcoming one, and the overdue styling below
        // makes the distinction clear.
        const { data, error } = await supabase
          .from("study_tasks")
          .select("*")
          .neq("status", "completed")
          .order("due_date", { ascending: true })
          .order("due_time", { ascending: true, nullsFirst: false })
          .limit(MAX_VISIBLE_TASKS);

        if (cancelled) return;

        if (error) {
          setLoadState("error");
          return;
        }

        setTasks((data ?? []) as StudyTask[]);
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

  if (loadState === "loading") {
    return (
      <Card title="Upcoming Deadlines">
        <p className="text-sm text-text-muted">Loading upcoming deadlines...</p>
      </Card>
    );
  }

  if (loadState === "error") {
    return (
      <Card title="Upcoming Deadlines">
        <p
          role="alert"
          className="rounded-sm border-l-4 border-error bg-surface-muted px-3 py-2 text-sm text-error"
        >
          Couldn&apos;t load your upcoming deadlines. Please refresh the page to try again.
        </p>
      </Card>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card title="Upcoming Deadlines">
        <p className="text-sm text-text-muted">
          No assignments yet. Add your first task to start building your
          study plan.
        </p>
      </Card>
    );
  }

  const today = getLocalDateString();

  return (
    <Card title="Upcoming Deadlines">
      <ul className="flex flex-col gap-2">
        {tasks.map((task) => {
          const isOverdue = task.due_date < today;
          return (
            <li
              key={task.id}
              className={cn(
                "flex items-start justify-between gap-3 rounded-md border p-3",
                isOverdue ? "border-error" : "border-border",
              )}
            >
              <div>
                <p className="text-sm font-medium text-foreground">{task.title}</p>
                <p className="text-xs text-text-muted">
                  {taskTypeLabel(task.task_type)}
                  {subjectName(subjects, task.subject_id)
                    ? ` • ${subjectName(subjects, task.subject_id)}`
                    : ""}
                </p>
              </div>
              <p
                className={cn(
                  "whitespace-nowrap text-xs",
                  isOverdue ? "font-medium text-error" : "text-text-muted",
                )}
              >
                {isOverdue ? "Overdue: " : "Due "}
                {task.due_date}
              </p>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
