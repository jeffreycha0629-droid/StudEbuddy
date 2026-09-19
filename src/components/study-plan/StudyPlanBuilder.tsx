"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { SessionForm } from "@/components/study-plan/SessionForm";
import { SessionList } from "@/components/study-plan/SessionList";
import { getOrCreateStudyPlan } from "@/lib/actions/study-plans";
import type { StudyPlan, StudySession, StudyTask } from "@/types/database";

export interface StudyPlanBuilderProps {
  tasks: StudyTask[];
}

export function StudyPlanBuilder({ tasks }: StudyPlanBuilderProps) {
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  async function handleSelectTask(taskId: string) {
    setSelectedTaskId(taskId);
    setPlan(null);
    setSessions([]);
    setPlanError(null);

    if (!taskId) return;

    setIsLoadingPlan(true);
    try {
      const result = await getOrCreateStudyPlan(taskId);
      if (result.error || !result.plan) {
        setPlanError(result.error ?? "Something went wrong. Please try again.");
        return;
      }
      setPlan(result.plan);
      setSessions(result.sessions ?? []);
    } catch {
      setPlanError("Something went wrong. Please check your connection and try again.");
    } finally {
      setIsLoadingPlan(false);
    }
  }

  function handleSessionCreated(session: StudySession) {
    setSessions((current) =>
      [...current, session].sort((a, b) =>
        a.scheduled_date === b.scheduled_date ? 0 : a.scheduled_date < b.scheduled_date ? -1 : 1,
      ),
    );
  }

  function handleSessionUpdated(updated: StudySession) {
    setSessions((current) =>
      current
        .map((session) => (session.id === updated.id ? updated : session))
        .sort((a, b) =>
          a.scheduled_date === b.scheduled_date ? 0 : a.scheduled_date < b.scheduled_date ? -1 : 1,
        ),
    );
  }

  function handleSessionRemoved(sessionId: string) {
    setSessions((current) => current.filter((session) => session.id !== sessionId));
  }

  return (
    <Card title="Study Plan">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-muted">
          Pick a task, then add study sessions to build a plan for it.
        </p>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="plan-task" className="text-sm font-medium text-foreground">
            Task
          </label>
          <Select
            id="plan-task"
            value={selectedTaskId}
            onChange={(e) => handleSelectTask(e.target.value)}
            disabled={tasks.length === 0}
          >
            <option value="">
              {tasks.length === 0 ? "You haven't added any tasks yet" : "Select a task"}
            </option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title} (due {task.due_date})
              </option>
            ))}
          </Select>
        </div>

        {isLoadingPlan && <p className="text-sm text-text-muted">Loading...</p>}

        {planError && (
          <p
            role="alert"
            className="rounded-sm border-l-4 border-error bg-surface-muted px-3 py-2 text-sm text-error"
          >
            {planError}
          </p>
        )}

        {plan && (
          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground">{plan.title}</h3>

            <SessionList
              sessions={sessions}
              onSessionUpdated={handleSessionUpdated}
              onSessionRemoved={handleSessionRemoved}
            />

            <SessionForm planId={plan.id} onCreated={handleSessionCreated} />
          </div>
        )}
      </div>
    </Card>
  );
}
