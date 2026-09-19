import { CalendarView } from "@/components/calendar/CalendarView";
import { createClient } from "@/lib/supabase/server";
import type { StudySession, StudyTask, Subject } from "@/types/database";

export default async function CalendarPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let subjects: Subject[] = [];
  let tasks: StudyTask[] = [];
  let sessions: StudySession[] = [];

  if (user) {
    const [{ data: subjectsData }, { data: tasksData }, { data: sessionsData }] = await Promise.all([
      supabase.from("subjects").select("*").eq("user_id", user.id).order("name"),
      supabase.from("study_tasks").select("*").eq("user_id", user.id),
      supabase.from("study_sessions").select("*").eq("user_id", user.id),
    ]);
    subjects = (subjectsData ?? []) as Subject[];
    tasks = (tasksData ?? []) as StudyTask[];
    sessions = (sessionsData ?? []) as StudySession[];
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Calendar</h1>
      <p className="text-sm text-text-muted">
        Your academic deadlines and scheduled study sessions, laid out by date.
      </p>
      <CalendarView tasks={tasks} sessions={sessions} subjects={subjects} />
    </div>
  );
}
