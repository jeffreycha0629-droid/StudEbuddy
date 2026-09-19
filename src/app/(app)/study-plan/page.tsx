import { StudyPlanClient } from "@/components/tasks/StudyPlanClient";
import { StudyPlanBuilder } from "@/components/study-plan/StudyPlanBuilder";
import { GenerateAiPlanForm } from "@/components/study-plan/GenerateAiPlanForm";
import { createClient } from "@/lib/supabase/server";
import type { StudyTask, Subject } from "@/types/database";

/**
 * This page is being built incrementally. Feature 18 added task
 * creation, Feature 19 the task list, Feature 25 manual study
 * plan/session building, and Feature 33 adds AI-generated plans below
 * that, reusing the same tasks already fetched here.
 */
export default async function StudyPlanPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let subjects: Subject[] = [];
  let tasks: StudyTask[] = [];

  if (user) {
    const [{ data: subjectsData }, { data: tasksData }] = await Promise.all([
      supabase.from("subjects").select("*").eq("user_id", user.id).order("name"),
      supabase.from("study_tasks").select("*").eq("user_id", user.id).order("due_date"),
    ]);
    subjects = (subjectsData ?? []) as Subject[];
    tasks = (tasksData ?? []) as StudyTask[];
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Study Plan</h1>
      <p className="text-sm text-text-muted">
        Add academic work, then build a study plan of sessions around any task
        — manually, or generated with AI.
      </p>
      <StudyPlanClient subjects={subjects} />
      <StudyPlanBuilder tasks={tasks} />
      <GenerateAiPlanForm tasks={tasks} />
    </div>
  );
}
