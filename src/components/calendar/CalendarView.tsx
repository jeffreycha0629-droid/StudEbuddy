"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { difficultyLabel, subjectName, taskTypeLabel } from "@/lib/task-format";
import { sessionMethodLabel } from "@/lib/session-format";
import { getLocalDateString } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import type { StudySession, StudyTask, Subject } from "@/types/database";

export interface CalendarViewProps {
  tasks: StudyTask[];
  sessions: StudySession[];
  subjects: Subject[];
}

interface MonthCell {
  date: string;
  dayNumber: number;
  inCurrentMonth: boolean;
}

interface ViewMonth {
  year: number;
  month: number; // 0-indexed, matches JS Date convention
}

type SelectedItem = { type: "task"; id: string } | { type: "session"; id: string } | null;

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function buildMonthGrid({ year, month }: ViewMonth): MonthCell[] {
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: MonthCell[] = [];

  for (let i = startWeekday - 1; i >= 0; i--) {
    const dayNumber = daysInPrevMonth - i;
    cells.push({
      date: getLocalDateString(new Date(year, month - 1, dayNumber)),
      dayNumber,
      inCurrentMonth: false,
    });
  }

  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber++) {
    cells.push({
      date: getLocalDateString(new Date(year, month, dayNumber)),
      dayNumber,
      inCurrentMonth: true,
    });
  }

  let nextMonthDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({
      date: getLocalDateString(new Date(year, month + 1, nextMonthDay)),
      dayNumber: nextMonthDay,
      inCurrentMonth: false,
    });
    nextMonthDay += 1;
  }

  return cells;
}

/**
 * "Today" and the initial displayed month both need to reflect the
 * browser's local date, not the server's - computing that directly in
 * useState risks a hydration mismatch if server and client disagree
 * (same issue solved in Greeting.tsx and DailyCheckInCard.tsx). Starting
 * with null and resolving in useEffect keeps the first render identical
 * on both sides.
 */
export function CalendarView({ tasks, sessions, subjects }: CalendarViewProps) {
  const [view, setView] = useState<ViewMonth | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<SelectedItem>(null);

  useEffect(() => {
    const now = new Date();
    setView({ year: now.getFullYear(), month: now.getMonth() });
    setToday(getLocalDateString(now));
  }, []);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, StudyTask[]>();
    for (const task of tasks) {
      const existing = map.get(task.due_date) ?? [];
      existing.push(task);
      map.set(task.due_date, existing);
    }
    return map;
  }, [tasks]);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, StudySession[]>();
    for (const session of sessions) {
      const existing = map.get(session.scheduled_date) ?? [];
      existing.push(session);
      map.set(session.scheduled_date, existing);
    }
    return map;
  }, [sessions]);

  const selectedTask = useMemo(
    () =>
      selectedItem?.type === "task"
        ? (tasks.find((task) => task.id === selectedItem.id) ?? null)
        : null,
    [tasks, selectedItem],
  );

  const selectedSession = useMemo(
    () =>
      selectedItem?.type === "session"
        ? (sessions.find((session) => session.id === selectedItem.id) ?? null)
        : null,
    [sessions, selectedItem],
  );

  if (!view || !today) {
    return (
      <Card title="Calendar">
        <p className="text-sm text-text-muted">Loading calendar...</p>
      </Card>
    );
  }

  const cells = buildMonthGrid(view);

  function goToPreviousMonth() {
    setView((current) => {
      if (!current) return current;
      const month = current.month === 0 ? 11 : current.month - 1;
      const year = current.month === 0 ? current.year - 1 : current.year;
      return { year, month };
    });
  }

  function goToNextMonth() {
    setView((current) => {
      if (!current) return current;
      const month = current.month === 11 ? 0 : current.month + 1;
      const year = current.month === 11 ? current.year + 1 : current.year;
      return { year, month };
    });
  }

  function goToToday() {
    const now = new Date();
    setView({ year: now.getFullYear(), month: now.getMonth() });
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">
            {MONTH_NAMES[view.month]} {view.year}
          </h2>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={goToPreviousMonth}>
              ← Prev
            </Button>
            <Button type="button" variant="secondary" onClick={goToToday}>
              Today
            </Button>
            <Button type="button" variant="secondary" onClick={goToNextMonth}>
              Next →
            </Button>
          </div>
        </div>

        {/* Distinguishing deadlines from sessions doesn't rely on color
            alone - each chip also has an explicit aria-label below. */}
        <div className="mb-3 flex gap-4 text-xs text-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-secondary" aria-hidden="true" />
            Deadlines
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full border border-accent"
              aria-hidden="true"
            />
            Study sessions
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-text-muted">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="py-1">
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const cellTasks = tasksByDate.get(cell.date) ?? [];
            const cellSessions = sessionsByDate.get(cell.date) ?? [];
            const isToday = cell.date === today;

            return (
              <div
                key={cell.date}
                className={cn(
                  "flex min-h-[72px] flex-col gap-1 rounded-md border p-1 sm:min-h-[96px] sm:p-2",
                  cell.inCurrentMonth ? "border-border bg-surface" : "border-border bg-surface-muted",
                  isToday && "border-primary",
                )}
              >
                <span
                  className={cn(
                    "text-xs",
                    cell.inCurrentMonth ? "text-foreground" : "text-text-muted",
                    isToday && "font-semibold text-primary",
                  )}
                >
                  {cell.dayNumber}
                </span>

                {(cellTasks.length > 0 || cellSessions.length > 0) && (
                  <div className="flex max-h-[60px] flex-col gap-1 overflow-y-auto sm:max-h-[80px]">
                    {cellTasks.map((task) => (
                      <button
                        key={`task-${task.id}`}
                        type="button"
                        onClick={() => setSelectedItem({ type: "task", id: task.id })}
                        aria-label={`Deadline: ${task.title}`}
                        className={cn(
                          "truncate rounded-sm px-1 py-0.5 text-left text-[10px] leading-tight sm:text-xs",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                          task.status === "completed"
                            ? "bg-surface-muted text-text-muted line-through"
                            : "bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground",
                        )}
                        title={task.title}
                      >
                        {task.title}
                      </button>
                    ))}
                    {cellSessions.map((session) => (
                      <button
                        key={`session-${session.id}`}
                        type="button"
                        onClick={() => setSelectedItem({ type: "session", id: session.id })}
                        aria-label={`Study session: ${session.title}`}
                        className={cn(
                          "truncate rounded-sm border px-1 py-0.5 text-left text-[10px] leading-tight sm:text-xs",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                          session.status === "completed"
                            ? "border-border bg-surface-muted text-text-muted line-through"
                            : "border-accent bg-surface text-accent hover:bg-accent hover:text-white",
                        )}
                        title={session.title}
                      >
                        {session.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {selectedTask && (
        <Card title="Task Detail">
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-foreground">{selectedTask.title}</p>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                aria-label="Close task detail"
                className="rounded-sm px-2 py-1 text-xs text-text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
              >
                Close ✕
              </button>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-text-muted">
              <dt>Type</dt>
              <dd>{taskTypeLabel(selectedTask.task_type)}</dd>

              {subjectName(subjects, selectedTask.subject_id) && (
                <>
                  <dt>Subject</dt>
                  <dd>{subjectName(subjects, selectedTask.subject_id)}</dd>
                </>
              )}

              <dt>Due</dt>
              <dd>
                {selectedTask.due_date}
                {selectedTask.due_time ? ` at ${selectedTask.due_time.slice(0, 5)}` : ""}
              </dd>

              {difficultyLabel(selectedTask.difficulty) && (
                <>
                  <dt>Difficulty</dt>
                  <dd>{difficultyLabel(selectedTask.difficulty)}</dd>
                </>
              )}

              {selectedTask.estimated_study_minutes && (
                <>
                  <dt>Estimated time</dt>
                  <dd>{selectedTask.estimated_study_minutes} min</dd>
                </>
              )}

              <dt>Status</dt>
              <dd className="capitalize">{selectedTask.status.replace("_", " ")}</dd>
            </dl>

            {selectedTask.notes && (
              <p className="mt-1 text-text-muted">{selectedTask.notes}</p>
            )}

            <Link
              href="/study-plan"
              className="mt-2 text-sm font-medium text-primary hover:underline"
            >
              Manage this task in Study Plan →
            </Link>
          </div>
        </Card>
      )}

      {selectedSession && (
        <Card title="Study Session Detail">
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-foreground">{selectedSession.title}</p>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                aria-label="Close session detail"
                className="rounded-sm px-2 py-1 text-xs text-text-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
              >
                Close ✕
              </button>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-text-muted">
              {selectedSession.topic && (
                <>
                  <dt>Topic</dt>
                  <dd>{selectedSession.topic}</dd>
                </>
              )}

              {subjectName(subjects, selectedSession.subject_id) && (
                <>
                  <dt>Subject</dt>
                  <dd>{subjectName(subjects, selectedSession.subject_id)}</dd>
                </>
              )}

              <dt>Scheduled</dt>
              <dd>
                {selectedSession.scheduled_date}
                {selectedSession.scheduled_start
                  ? ` at ${selectedSession.scheduled_start.slice(0, 5)}`
                  : ""}
              </dd>

              <dt>Duration</dt>
              <dd>{selectedSession.planned_duration_minutes} min</dd>

              {sessionMethodLabel(selectedSession.study_method) && (
                <>
                  <dt>Study method</dt>
                  <dd>{sessionMethodLabel(selectedSession.study_method)}</dd>
                </>
              )}

              <dt>Status</dt>
              <dd className="capitalize">{selectedSession.status.replace("_", " ")}</dd>
            </dl>

            {selectedSession.objective && (
              <p className="mt-1 text-text-muted">{selectedSession.objective}</p>
            )}

            <Link
              href="/study-plan"
              className="mt-2 text-sm font-medium text-primary hover:underline"
            >
              Manage this session in Study Plan →
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
