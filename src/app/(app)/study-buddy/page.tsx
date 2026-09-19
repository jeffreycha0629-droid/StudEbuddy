import { StudyBuddyChat } from "@/components/study-buddy/StudyBuddyChat";
import { AssignmentBreakdown } from "@/components/study-buddy/AssignmentBreakdown";
import { ConceptExplanation } from "@/components/study-buddy/ConceptExplanation";
import { createClient } from "@/lib/supabase/server";
import type { StudyTask, Subject } from "@/types/database";

export default async function StudyBuddyPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let tasks: StudyTask[] = [];
  let subjects: Subject[] = [];

  if (user) {
    const [{ data: tasksData }, { data: subjectsData }] = await Promise.all([
      supabase
        .from("study_tasks")
        .select("*")
        .eq("user_id", user.id)
        .neq("status", "completed")
        .order("due_date"),
      supabase.from("subjects").select("*").eq("user_id", user.id).order("name"),
    ]);
    tasks = (tasksData ?? []) as StudyTask[];
    subjects = (subjectsData ?? []) as Subject[];
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Study Buddy</h1>
      <StudyBuddyChat tasks={tasks} subjects={subjects} />
      <AssignmentBreakdown tasks={tasks} />
      <ConceptExplanation />
    </div>
  );
}
