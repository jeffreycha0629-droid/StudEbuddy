"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EditTaskForm } from "@/components/tasks/EditTaskForm";
import { deleteTask, setTaskCompletion } from "@/lib/actions/tasks";
import { createClient } from "@/lib/supabase/client";
import { subjectName, taskTypeLabel, difficultyLabel } from "@/lib/task-format";
import { getLocalDateString } from "@/lib/utils/date";
import type { StudyTask, Subject } from "@/types/database";

export interface TaskListViewProps {
  subjects: Subject[];
  /** Bump this (e.g. after a task is created) to trigger a refetch. */
  refreshKey: number;
}

type LoadState = "loading" | "loaded" | "error";
type SectionKey = "overdue" | "today" | "upcoming" | "completed";

interface Section {
  key: SectionKey;
  title: string;
  emptyMessage: string;
  tasks: StudyTask[];
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
] as const;

function byDueDateAsc(a: StudyTask, b: StudyTask): number {
  if (a.due_date !== b.due_date) return a.due_date < b.due_date ? -1 : 1;
  const aTime = a.due_time ?? "";
  const bTime = b.due_time ?? "";
  if (aTime === bTime) return 0;
  return aTime < bTime ? -1 : 1;
}

function byCompletedDesc(a: StudyTask, b: StudyTask): number {
  const aDate = a.completed_at ?? a.updated_at;
  const bDate = b.completed_at ?? b.updated_at;
  if (aDate === bDate) return 0;
  return aDate > bDate ? -1 : 1;
}

/**
 * Self-fetches (same pattern as DailyCheckInCard) rather than receiving a
 * server-fetched task list as a prop - this is what gives it a genuine
 * loading state, and lets it refetch on demand via refreshKey when a new
 * task is created elsewhere on the page.
 */
export function TaskListView({ subjects, refreshKey }: TaskListViewProps) {
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [tasks, setTasks] = useState<StudyTask[]>([]);

  const [subjectFilter, setSubjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dueDateFilter, setDueDateFilter] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);
  const [pendingCompletionIds, setPendingCompletionIds] = useState<Set<string>>(new Set());

  function handleTaskUpdated(updated: StudyTask) {
    setTasks((current) => current.map((task) => (task.id === updated.id ? updated : task)));
    setEditingTaskId(null);
  }

  /**
   * Updates the UI immediately (optimistic), then confirms with the
   * server in the background. If the server call fails, the local
   * change is reverted so the UI never shows a state the database
   * doesn't actually have.
   */
  async function handleToggleComplete(task: StudyTask) {
    if (pendingCompletionIds.has(task.id)) return;

    const newCompleted = task.status !== "completed";
    const previous = task;
    const optimistic: StudyTask = {
      ...task,
      status: newCompleted ? "completed" : "pending",
      completed_at: newCompleted ? new Date().toISOString() : null,
    };

    setCompletionError(null);
    setTasks((current) => current.map((t) => (t.id === task.id ? optimistic : t)));
    setPendingCompletionIds((current) => new Set(current).add(task.id));

    try {
      const result = await setTaskCompletion({ taskId: task.id, completed: newCompleted });

      if (result.error || !result.task) {
        setTasks((current) => current.map((t) => (t.id === task.id ? previous : t)));
        setCompletionError(result.error ?? `Couldn't update "${task.title}". Please try again.`);
        return;
      }

      // Replace with the server's authoritative record (e.g. its exact
      // completed_at timestamp) rather than trusting the optimistic guess.
      setTasks((current) => current.map((t) => (t.id === task.id ? result.task! : t)));
    } catch {
      setTasks((current) => current.map((t) => (t.id === task.id ? previous : t)));
      setCompletionError("Something went wrong. Please check your connection and try again.");
    } finally {
      setPendingCompletionIds((current) => {
        const next = new Set(current);
        next.delete(task.id);
        return next;
      });
    }
  }

  function startEditing(taskId: string) {
    setDeletingTaskId(null);
    setDeleteError(null);
    setEditingTaskId(taskId);
  }

  function startDeleteConfirm(taskId: string) {
    setEditingTaskId(null);
    setDeleteError(null);
    setDeletingTaskId(taskId);
  }

  function cancelDelete() {
    setDeletingTaskId(null);
    setDeleteError(null);
  }

  async function confirmDelete(taskId: string) {
    if (isDeleting) return;

    setDeleteError(null);
    setIsDeleting(true);
    try {
      const result = await deleteTask(taskId);
      if (result.error) {
        setDeleteError(result.error);
        return;
      }
      setTasks((current) => current.filter((task) => task.id !== taskId));
      setDeletingTaskId(null);
    } catch {
      setDeleteError("Something went wrong. Please check your connection and try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadState("loading");
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from("study_tasks").select("*");

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
  }, [refreshKey]);

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      if (subjectFilter && task.subject_id !== subjectFilter) return false;
      if (statusFilter && task.status !== statusFilter) return false;
      if (dueDateFilter && task.due_date !== dueDateFilter) return false;
      return true;
    });
  }, [tasks, subjectFilter, statusFilter, dueDateFilter]);

  const sections = useMemo<Section[]>(() => {
    const today = getLocalDateString();
    const overdue: StudyTask[] = [];
    const todayTasks: StudyTask[] = [];
    const upcoming: StudyTask[] = [];
    const completed: StudyTask[] = [];

    for (const task of filtered) {
      if (task.status === "completed") {
        completed.push(task);
      } else if (task.due_date < today) {
        overdue.push(task);
      } else if (task.due_date === today) {
        todayTasks.push(task);
      } else {
        upcoming.push(task);
      }
    }

    overdue.sort(byDueDateAsc);
    todayTasks.sort(byDueDateAsc);
    upcoming.sort(byDueDateAsc);
    completed.sort(byCompletedDesc);

    return [
      {
        key: "overdue",
        title: "Overdue",
        emptyMessage: "No overdue tasks — nice work.",
        tasks: overdue,
      },
      { key: "today", title: "Today", emptyMessage: "Nothing due today.", tasks: todayTasks },
      { key: "upcoming", title: "Upcoming", emptyMessage: "No upcoming tasks.", tasks: upcoming },
      {
        key: "completed",
        title: "Completed",
        emptyMessage: "No completed tasks yet.",
        tasks: completed,
      },
    ];
  }, [filtered]);

  function clearFilters() {
    setSubjectFilter("");
    setStatusFilter("");
    setDueDateFilter("");
  }

  if (loadState === "loading") {
    return (
      <Card title="Your Tasks">
        <p className="text-sm text-text-muted">Loading your tasks...</p>
      </Card>
    );
  }

  if (loadState === "error") {
    return (
      <Card title="Your Tasks">
        <p
          role="alert"
          className="rounded-sm border-l-4 border-error bg-surface-muted px-3 py-2 text-sm text-error"
        >
          Couldn&apos;t load your tasks. Please refresh the page to try again.
        </p>
      </Card>
    );
  }

  const hasAnyTasks = tasks.length > 0;
  const hasFilteredResults = filtered.length > 0;
  const filtersActive = Boolean(subjectFilter || statusFilter || dueDateFilter);

  return (
    <Card title="Your Tasks">
      <div className="flex flex-col gap-4">
        {completionError && (
          <p
            role="alert"
            className="rounded-sm border-l-4 border-error bg-surface-muted px-3 py-2 text-sm text-error"
          >
            {completionError}
          </p>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="filter-subject" className="text-xs text-text-muted">
              Subject
            </label>
            <Select
              id="filter-subject"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-40"
            >
              <option value="">All subjects</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="filter-status" className="text-xs text-text-muted">
              Status
            </label>
            <Select
              id="filter-status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-40"
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="filter-due-date" className="text-xs text-text-muted">
              Due date
            </label>
            <Input
              id="filter-due-date"
              type="date"
              value={dueDateFilter}
              onChange={(e) => setDueDateFilter(e.target.value)}
              className="w-40"
            />
          </div>

          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-md px-2 py-2 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Clear filters
            </button>
          )}
        </div>

        {!hasAnyTasks && (
          <p className="text-sm text-text-muted">
            No tasks yet. Add your first task above to start building your
            study plan.
          </p>
        )}

        {hasAnyTasks && !hasFilteredResults && (
          <p className="text-sm text-text-muted">
            No tasks match your filters.{" "}
            <button
              type="button"
              onClick={clearFilters}
              className="font-medium text-primary hover:underline"
            >
              Clear filters
            </button>
          </p>
        )}

        {hasAnyTasks && hasFilteredResults && (
          <div className="flex flex-col gap-5">
            {sections.map((section) => (
              <div key={section.key} className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {section.title}{" "}
                  <span className="font-normal text-text-muted">({section.tasks.length})</span>
                </h3>
                {section.tasks.length === 0 ? (
                  <p className="text-sm text-text-muted">{section.emptyMessage}</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {section.tasks.map((task) => (
                      <li key={task.id} className="rounded-md border border-border p-3">
                        {editingTaskId === task.id ? (
                          <EditTaskForm
                            task={task}
                            subjects={subjects}
                            onSaved={handleTaskUpdated}
                            onCancel={() => setEditingTaskId(null)}
                          />
                        ) : deletingTaskId === task.id ? (
                          <div className="flex flex-col gap-3">
                            <p className="text-sm text-foreground">
                              Delete &ldquo;{task.title}&rdquo;? This can&apos;t be undone.
                            </p>
                            {deleteError && (
                              <p
                                role="alert"
                                className="rounded-sm border-l-4 border-error bg-surface-muted px-3 py-2 text-sm text-error"
                              >
                                {deleteError}
                              </p>
                            )}
                            <div className="flex gap-3">
                              <Button
                                type="button"
                                variant="secondary"
                                className="flex-1 sm:flex-none"
                                onClick={cancelDelete}
                                disabled={isDeleting}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                className="flex-1 sm:flex-none"
                                isLoading={isDeleting}
                                onClick={() => confirmDelete(task.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2">
                                <input
                                  type="checkbox"
                                  checked={task.status === "completed"}
                                  onChange={() => handleToggleComplete(task)}
                                  disabled={pendingCompletionIds.has(task.id)}
                                  aria-label={
                                    task.status === "completed"
                                      ? `Mark "${task.title}" as not complete`
                                      : `Mark "${task.title}" as complete`
                                  }
                                  className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border-border text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                                />
                                <div>
                                  <p
                                    className={
                                      task.status === "completed"
                                        ? "text-sm font-medium text-text-muted line-through"
                                        : "text-sm font-medium text-foreground"
                                    }
                                  >
                                    {task.title}
                                  </p>
                                  <p className="text-xs text-text-muted">
                                    {taskTypeLabel(task.task_type)}
                                    {subjectName(subjects, task.subject_id)
                                      ? ` • ${subjectName(subjects, task.subject_id)}`
                                      : ""}
                                    {difficultyLabel(task.difficulty)
                                      ? ` • ${difficultyLabel(task.difficulty)}`
                                      : ""}
                                  </p>
                                </div>
                              </div>
                              <div className="whitespace-nowrap text-right text-xs text-text-muted">
                                <p>
                                  {task.due_date}
                                  {task.due_time ? ` at ${task.due_time.slice(0, 5)}` : ""}
                                </p>
                                {task.estimated_study_minutes && (
                                  <p>{task.estimated_study_minutes} min</p>
                                )}
                              </div>
                            </div>
                            {task.notes && (
                              <p className="mt-2 text-xs text-text-muted">{task.notes}</p>
                            )}
                            <div className="mt-2 flex gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => startEditing(task.id)}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={() => startDeleteConfirm(task.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
