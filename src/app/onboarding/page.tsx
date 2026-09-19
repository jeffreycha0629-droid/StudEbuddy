import { redirect } from "next/navigation";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { WelcomeStep } from "@/components/onboarding/steps/WelcomeStep";
import { BasicInfoStep } from "@/components/onboarding/steps/BasicInfoStep";
import { SubjectsStep } from "@/components/onboarding/steps/SubjectsStep";
import { GoalsStep } from "@/components/onboarding/steps/GoalsStep";
import { PreferencesStep } from "@/components/onboarding/steps/PreferencesStep";
import { AvailabilityStep } from "@/components/onboarding/steps/AvailabilityStep";
import { CompleteStep } from "@/components/onboarding/steps/CompleteStep";
import { createClient } from "@/lib/supabase/server";
import type {
  Profile,
  StudyAvailability,
  StudyGoal,
  StudyPreferences,
  Subject,
} from "@/types/database";

const TOTAL_STEPS = 7;

function parseStep(raw: string | undefined): number {
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > TOTAL_STEPS) return 1;
  return parsed;
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: { step?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The layout above already guards this route, but a Server Component
  // re-checks its own data access rather than assuming a parent already
  // handled it - cheap insurance against this page ever being reused
  // somewhere that guard doesn't apply.
  if (!user) {
    redirect("/login");
  }

  const step = parseStep(searchParams.step);

  // Fetch whatever's already saved so returning to a step (or resuming
  // onboarding later) shows existing answers instead of a blank form.
  const [
    { data: profile },
    { data: subjects },
    { data: goals },
    { data: preferences },
    { data: availability },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("subjects").select("*").eq("user_id", user.id).order("created_at"),
    supabase.from("study_goals").select("*").eq("user_id", user.id),
    supabase.from("study_preferences").select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from("study_availability").select("*").eq("user_id", user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <OnboardingProgress currentStep={step} totalSteps={TOTAL_STEPS} />

      {step === 1 && <WelcomeStep />}
      {step === 2 && <BasicInfoStep initialProfile={profile as Profile | null} />}
      {step === 3 && <SubjectsStep initialSubjects={(subjects ?? []) as Subject[]} />}
      {step === 4 && <GoalsStep initialGoals={(goals ?? []) as StudyGoal[]} />}
      {step === 5 && (
        <PreferencesStep initialPreferences={preferences as StudyPreferences | null} />
      )}
      {step === 6 && (
        <AvailabilityStep initialAvailability={(availability ?? []) as StudyAvailability[]} />
      )}
      {step === 7 && <CompleteStep initialProfile={profile as Profile | null} />}
    </div>
  );
}
