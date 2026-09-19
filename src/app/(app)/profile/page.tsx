import { BasicInfoEditor } from "@/components/profile/BasicInfoEditor";
import { GoalsEditor } from "@/components/profile/GoalsEditor";
import { SubjectsEditor } from "@/components/profile/SubjectsEditor";
import { createClient } from "@/lib/supabase/server";
import type { Profile, StudyGoal, Subject } from "@/types/database";

/**
 * (app)/layout.tsx already guards this route, but this page fetches its
 * own data independently, consistent with the rest of this codebase (e.g.
 * /dashboard, /onboarding).
 *
 * Reuses the exact same Server Actions as onboarding (saveBasicInfo,
 * saveSubjects, saveGoals) - this page just gives the student a way back
 * into that same, already-validated logic after onboarding is done,
 * rather than duplicating it.
 */
export default async function ProfilePage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  let subjects: Subject[] = [];
  let goals: StudyGoal[] = [];

  if (user) {
    const [{ data: profileData }, { data: subjectsData }, { data: goalsData }] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("subjects").select("*").eq("user_id", user.id).order("created_at"),
        supabase.from("study_goals").select("*").eq("user_id", user.id),
      ]);
    profile = profileData as Profile | null;
    subjects = (subjectsData ?? []) as Subject[];
    goals = (goalsData ?? []) as StudyGoal[];
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Profile</h1>
      <div className="flex flex-col gap-4">
        <BasicInfoEditor initialProfile={profile} />
        <SubjectsEditor initialSubjects={subjects} />
        <GoalsEditor initialGoals={goals} />
      </div>
    </div>
  );
}
