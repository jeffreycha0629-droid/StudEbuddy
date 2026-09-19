import { DailyCheckInCard } from "@/components/dashboard/DailyCheckInCard";
import { Greeting } from "@/components/dashboard/Greeting";
import { ProgressSummaryCard } from "@/components/dashboard/ProgressSummaryCard";
import { TodaysPlanCard } from "@/components/dashboard/TodaysPlanCard";
import { UpcomingDeadlinesCard } from "@/components/dashboard/UpcomingDeadlinesCard";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Subject } from "@/types/database";

/**
 * (app)/layout.tsx already guards this route, but this page fetches its
 * own data independently rather than assuming a parent already handled
 * it - consistent with the rest of this codebase (e.g. /login, /onboarding).
 */
export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  let subjects: Subject[] = [];
  if (user) {
    const [{ data: profileData }, { data: subjectsData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("subjects").select("*").eq("user_id", user.id).order("name"),
    ]);
    profile = profileData as Profile | null;
    subjects = (subjectsData ?? []) as Subject[];
  }

  return (
    <div className="flex flex-col gap-6">
      <Greeting displayName={profile?.display_name ?? null} />

      {/*
        Vertical stack, not a grid: DESIGN_SYSTEM.md section 12 specifies
        these as a priority order (plan, then check-in, then deadlines,
        then progress), not just a set of sections to arrange for space
        efficiency.
      */}
      <div className="flex flex-col gap-4">
        <TodaysPlanCard subjects={subjects} />
        <DailyCheckInCard />
        <UpcomingDeadlinesCard />
        <ProgressSummaryCard />
      </div>
    </div>
  );
}
