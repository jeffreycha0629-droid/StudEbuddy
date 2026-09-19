"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  acceptAiStudyPlan,
  previewAiStudyPlan,
  type ProposedSession,
} from "@/lib/actions/ai-study-plan";
import { REGENERATION_REASONS } from "@/lib/regeneration-reasons";
import { createClient } from "@/lib/supabase/client";
import { getLocalDateString } from "@/lib/utils/date";
import type { StudySession, StudyTask } from "@/types/database";

export interface GenerateAiPlanFormProps {
  tasks: StudyTask[];
}

type ViewMode = "form" | "preview" | "saved";

interface ProposedSessionEditFormProps {
  session: ProposedSession;
  onSaved: (session: ProposedSession) => void;
  onCancel: () => void;
}

/** Local-only edit form for a not-yet-saved proposed session - no server
 * call here, just updates the in-memory preview. The real, authoritative
 * validation happens server-side in acceptAiStudyPlan regardless. */
function ProposedSessionEditForm({ session, onSaved, onCancel }: ProposedSessionEditFormProps) {
  const [scheduledDate, setScheduledDate] = useState(session.scheduledDate);
  const [topic, setTopic] = useState(session.topic);
  const [duration, setDuration] = useState(String(session.durationMinutes));
  const [method, setMethod] = useState(session.method);
  const [objective, setObjective] = useState(session.objective);
  const [fieldError, setFieldError] = useState<string | null>(null);

  function handleSave() {
    const trimmedTopic = topic.trim();
    const trimmedMethod = method.trim();
    const trimmedObjective = objective.trim();
    const parsedDuration = Number(duration);

    if (!scheduledDate) {
      setFieldError("Please select a date.");
      return;
    }
    if (!trimmedTopic) {
      setFieldError("Please enter a topic.");
      return;
    }
    if (!Number.isInteger(parsedDuration) || parsedDuration <= 0) {
      setFieldError("Please enter a valid duration.");
      return;
    }
    if (!trimmedMethod) {
      setFieldError("Please enter a study method.");
      return;
    }
    if (!trimmedObjective) {
      setFieldError("Please enter an objective.");
      return;
    }

    setFieldError(null);
    onSaved({
      clientId: session.clientId,
      scheduledDate,
      topic: trimmedTopic,
      durationMinutes: parsedDuration,
      method: trimmedMethod,
      objective: trimmedObjective,
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {fieldError && (
        <p
          role="alert"
          className="rounded-sm border-l-4 border-error bg-surface-muted px-3 py-2 text-sm text-error"
        >
          {fieldError}
        </p>
      )}
      <FormField label="Date" required>
        <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
      </FormField>
      <FormField label="Topic" required>
        <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
      </FormField>
      <FormField label="Duration (minutes)" required>
        <Input type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} />
      </FormField>
      <FormField label="Method">
        <Input value={method} onChange={(e) => setMethod(e.target.value)} />
      </FormField>
      <FormField label="Objective">
        <Input value={objective} onChange={(e) => setObjective(e.target.value)} />
      </FormField>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" variant="primary" onClick={handleSave}>
          Save
        </Button>
      </div>
    </div>
  );
}

export function GenerateAiPlanForm({ tasks }: GenerateAiPlanFormProps) {
  const [taskId, setTaskId] = useState("");
  const [topicsText, setTopicsText] = useState("");
  const [existingSessionCount, setExistingSessionCount] = useState<number | null>(null);
  const [regenerationReason, setRegenerationReason] = useState("");
  const [activeRegeneration, setActiveRegeneration] = useState(false);
  const [mode, setMode] = useState<ViewMode>("form");
  const [proposedSessions, setProposedSessions] = useState<ProposedSession[]>([]);
  const [savedSessions, setSavedSessions] = useState<StudySession[]>([]);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  /**
   * Checks whether the selected task already has an AI-generated plan
   * with real sessions - a read-only, RLS-protected query, same pattern
   * as DailyCheckInCard/TaskListView. Drives whether the form shows the
   * fresh-generation flow (topics required) or the regeneration flow
   * (reason required, topics optional).
   */
  useEffect(() => {
    let cancelled = false;

    async function checkExistingPlan() {
      if (!taskId) {
        setExistingSessionCount(null);
        return;
      }
      try {
        const supabase = createClient();
        const { data: plan } = await supabase
          .from("study_plans")
          .select("id")
          .eq("task_id", taskId)
          .eq("source", "ai")
          .maybeSingle();

        if (cancelled) return;

        if (!plan) {
          setExistingSessionCount(0);
          return;
        }

        const { count } = await supabase
          .from("study_sessions")
          .select("id", { count: "exact", head: true })
          .eq("study_plan_id", plan.id);

        if (!cancelled) setExistingSessionCount(count ?? 0);
      } catch {
        if (!cancelled) setExistingSessionCount(0);
      }
    }

    checkExistingPlan();
    return () => {
      cancelled = true;
    };
  }, [taskId]);

  function getTopicsList(): string[] {
    return topicsText
      .split("\n")
      .map((topic) => topic.trim())
      .filter(Boolean);
  }

  const isRegenerationMode = (existingSessionCount ?? 0) > 0;

  async function requestPreview(reasonForThisRequest: string | null) {
    setError(null);
    setIsGenerating(true);
    try {
      const result = await previewAiStudyPlan({
        taskId,
        topics: getTopicsList(),
        todayDateString: getLocalDateString(),
        regenerationReason: reasonForThisRequest,
      });

      if (result.error || !result.sessions) {
        setError(result.error ?? "Something went wrong. Please try again.");
        return;
      }

      setProposedSessions(result.sessions);
      setActiveRegeneration(Boolean(reasonForThisRequest));
      setMode("preview");
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isGenerating) return;

    setError(null);

    if (!taskId) {
      setError("Please select a task.");
      return;
    }

    if (isRegenerationMode) {
      if (!regenerationReason) {
        setError("Please select a reason for regenerating.");
        return;
      }
      await requestPreview(regenerationReason);
      return;
    }

    if (getTopicsList().length === 0) {
      setError("Please list at least one topic, one per line.");
      return;
    }

    await requestPreview(null);
  }

  async function handleRegenerate() {
    if (isGenerating) return;
    setEditingClientId(null);
    // Regenerating from the preview reuses whatever reason (if any)
    // produced the current preview - a fresh proposal for the same
    // request, not a new kind of request.
    await requestPreview(activeRegeneration ? regenerationReason || null : null);
  }

  function handleStartOver() {
    setMode("form");
    setProposedSessions([]);
    setEditingClientId(null);
    setError(null);
    setActiveRegeneration(false);
    setRegenerationReason("");
  }

  function handleSessionEdited(updated: ProposedSession) {
    setProposedSessions((current) =>
      current.map((session) => (session.clientId === updated.clientId ? updated : session)),
    );
    setEditingClientId(null);
  }

  async function handleAccept() {
    if (isAccepting) return;

    setError(null);
    setIsAccepting(true);
    try {
      const result = await acceptAiStudyPlan({
        taskId,
        sessions: proposedSessions.map((session) => ({
          scheduledDate: session.scheduledDate,
          topic: session.topic,
          durationMinutes: session.durationMinutes,
          method: session.method,
          objective: session.objective,
        })),
        replaceExisting: activeRegeneration,
      });

      if (result.error || !result.sessions) {
        setError(result.error ?? "Something went wrong. Please try again.");
        return;
      }

      setSavedSessions(result.sessions);
      setMode("saved");
      setProposedSessions([]);
      setTaskId("");
      setTopicsText("");
      setRegenerationReason("");
      setActiveRegeneration(false);
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setIsAccepting(false);
    }
  }

  if (mode === "form") {
    return (
      <Card title={isRegenerationMode ? "Regenerate This Task's Study Plan" : "Generate a Study Plan with AI"}>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <p className="text-sm text-text-muted">
            {isRegenerationMode
              ? `This task already has an AI-generated plan with ${existingSessionCount} session${existingSessionCount === 1 ? "" : "s"}. Tell us why you're regenerating and Claude will propose a fresh plan for you to review.`
              : "Pick a task and list the topics to cover. Claude will propose a plan for you to review — nothing is saved until you accept it."}
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
            <label htmlFor="ai-plan-task" className="text-sm font-medium text-foreground">
              Task
            </label>
            <Select
              id="ai-plan-task"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              disabled={isGenerating || tasks.length === 0}
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

          {isRegenerationMode && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="ai-plan-reason" className="text-sm font-medium text-foreground">
                Why are you regenerating?
              </label>
              <Select
                id="ai-plan-reason"
                value={regenerationReason}
                onChange={(e) => setRegenerationReason(e.target.value)}
                disabled={isGenerating}
              >
                <option value="" disabled>
                  Select a reason
                </option>
                {REGENERATION_REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="ai-plan-topics" className="text-sm font-medium text-foreground">
              {isRegenerationMode ? "Additional topics (optional)" : "Topics (one per line)"}
            </label>
            <Textarea
              id="ai-plan-topics"
              value={topicsText}
              onChange={(e) => setTopicsText(e.target.value)}
              disabled={isGenerating}
              rows={4}
              placeholder={"Cell structure\nDNA replication\nMitosis"}
            />
          </div>

          <Button type="submit" isLoading={isGenerating} className="w-full sm:w-auto">
            {isRegenerationMode ? "Regenerate Plan" : "Generate Plan"}
          </Button>
        </form>
      </Card>
    );
  }

  if (mode === "preview") {
    return (
      <Card title="Here's Your Proposed Plan">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-muted">
            Review the sessions below. Edit any of them, regenerate for a
            different proposal, or accept to save this plan.
          </p>

          {error && (
            <p
              role="alert"
              className="rounded-sm border-l-4 border-error bg-surface-muted px-3 py-2 text-sm text-error"
            >
              {error}
            </p>
          )}

          <ul className="flex flex-col gap-2">
            {proposedSessions.map((session) =>
              editingClientId === session.clientId ? (
                <li key={session.clientId} className="rounded-md border border-border p-3">
                  <ProposedSessionEditForm
                    session={session}
                    onSaved={handleSessionEdited}
                    onCancel={() => setEditingClientId(null)}
                  />
                </li>
              ) : (
                <li key={session.clientId} className="rounded-md border border-border p-3">
                  <p className="text-sm font-medium text-foreground">{session.topic}</p>
                  <p className="text-xs text-text-muted">
                    {session.scheduledDate} • {session.durationMinutes} min • {session.method}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">{session.objective}</p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-2"
                    onClick={() => setEditingClientId(session.clientId)}
                    disabled={isAccepting || isGenerating}
                  >
                    Edit
                  </Button>
                </li>
              ),
            )}
          </ul>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              isLoading={isAccepting}
              onClick={handleAccept}
              disabled={isGenerating}
            >
              Accept
            </Button>
            <Button
              type="button"
              variant="secondary"
              isLoading={isGenerating}
              onClick={handleRegenerate}
              disabled={isAccepting}
            >
              Regenerate
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleStartOver}
              disabled={isAccepting || isGenerating}
            >
              Start Over
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // mode === "saved"
  return (
    <Card title="Study Plan Saved">
      <div className="flex flex-col gap-3">
        <p role="status" className="text-sm text-foreground">
          Your study plan has been saved.
        </p>
        <ul className="flex flex-col gap-2">
          {savedSessions.map((session) => (
            <li key={session.id} className="rounded-md border border-border p-3">
              <p className="text-sm font-medium text-foreground">{session.title}</p>
              <p className="text-xs text-text-muted">
                {session.scheduled_date} • {session.planned_duration_minutes} min
                {session.study_method ? ` • ${session.study_method}` : ""}
              </p>
            </li>
          ))}
        </ul>
        <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={handleStartOver}>
          Generate Another Plan
        </Button>
      </div>
    </Card>
  );
}
