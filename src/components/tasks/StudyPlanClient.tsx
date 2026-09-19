"use client";

import { useState } from "react";
import { CreateTaskForm } from "@/components/tasks/CreateTaskForm";
import { TaskListView } from "@/components/tasks/TaskListView";
import type { Subject } from "@/types/database";

export interface StudyPlanClientProps {
  subjects: Subject[];
}

export function StudyPlanClient({ subjects }: StudyPlanClientProps) {
  // Bumped whenever a task is successfully created, so TaskListView
  // knows to refetch instead of showing a stale list until reload.
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <CreateTaskForm initialSubjects={subjects} onCreated={() => setRefreshKey((key) => key + 1)} />
      <TaskListView subjects={subjects} refreshKey={refreshKey} />
    </>
  );
}
