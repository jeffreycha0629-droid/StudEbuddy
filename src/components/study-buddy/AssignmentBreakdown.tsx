"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import {
  generateAssignmentBreakdown,
  type BreakdownStep,
} from "@/lib/actions/assignment-breakdown";
import type { StudyTask } from "@/types/database";

export interface AssignmentBreakdownProps {
  tasks: StudyTask[];
}

export function AssignmentBreakdown({ tasks }: AssignmentBreakdownProps) {
  const [taskId, setTaskId] = useState("");
  const [taskTitle, setTaskTitle] = useState<string | null>(null);
  const [steps, setSteps] = useState<BreakdownStep[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerate() {
    if (!taskId || isGenerating) return;

    setError(null);
    setSteps(null);
    setIsGenerating(true);
    try {
      const result = await generateAssignmentBreakdown(taskId);

      if (result.error || !result.steps) {
        setError(result.error ?? "Something went wrong. Please try again.");
        return;
      }

      setTaskTitle(result.taskTitle);
      setSteps(result.steps);
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <Card title="Assignment Breakdown">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-muted">
          Pick an assignment and Claude will break it into a clear, ordered
          list of steps — a general process, not specific requirements it
          doesn&apos;t actually know.
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
          <label htmlFor="breakdown-task" className="text-sm font-medium text-foreground">
            Assignment
          </label>
          <Select
            id="breakdown-task"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            disabled={isGenerating || tasks.length === 0}
          >
            <option value="">
              {tasks.length === 0 ? "You haven't added any tasks yet" : "Select an assignment"}
            </option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </Select>
        </div>

        <Button
          type="button"
          isLoading={isGenerating}
          disabled={!taskId}
          onClick={handleGenerate}
          className="w-full sm:w-auto"
        >
          Break Down This Assignment
        </Button>

        {steps && steps.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <h3 className="text-sm font-semibold text-foreground">{taskTitle}</h3>
            <ol className="flex flex-col gap-2">
              {steps.map((step, index) => (
                <li key={`${step.title}-${index}`} className="rounded-md border border-border p-3">
                  <p className="text-sm font-medium text-foreground">
                    {index + 1}. {step.title}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </Card>
  );
}
