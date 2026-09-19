"use server";

import { createClient } from "@/lib/supabase/server";
import {
  DAYS_OF_WEEK,
  GOAL_TYPES,
  GRADE_LEVELS,
  MAX_AVAILABLE_MINUTES,
  MAX_CUSTOM_GOAL_LENGTH,
  MAX_DISPLAY_NAME_LENGTH,
  MAX_SUBJECTS,
  MAX_SUBJECT_NAME_LENGTH,
  parseTimeToMinutes,
} from "@/lib/onboarding-constants";

export interface ActionResult {
  error: string | null;
}

export interface DayAvailabilityInput {
  dayOfWeek: number;
  available: boolean;
  startTime: string | null;
  endTime: string | null;
  availableMinutes: number | null;
}

const GENERIC_ERROR = "Something went wrong saving that. Please try again.";

/**
 * Every action below starts here. The user is always derived from the
 * server-verified session (getUser()), never from anything the client
 * passes in - matching the pattern used throughout Features 3-7.
 */
async function getAuthedUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function saveBasicInfo(
  displayName: string,
  gradeLevel: string,
): Promise<ActionResult> {
  const { supabase, user } = await getAuthedUser();
  if (!user) return { error: "You need to be logged in to continue." };

  const trimmedName = displayName.trim();
  if (!trimmedName) return { error: "Please enter your name." };
  if (trimmedName.length > MAX_DISPLAY_NAME_LENGTH) {
    return { error: `Name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer.` };
  }
  if (!(GRADE_LEVELS as readonly string[]).includes(gradeLevel)) {
    return { error: "Please select a valid grade level." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: trimmedName, grade_level: gradeLevel })
    .eq("user_id", user.id);

  if (error) return { error: GENERIC_ERROR };
  return { error: null };
}

export async function saveSubjects(names: string[]): Promise<ActionResult> {
  const { supabase, user } = await getAuthedUser();
  if (!user) return { error: "You need to be logged in to continue." };

  const cleaned = Array.from(
    new Set(names.map((name) => name.trim()).filter((name) => name.length > 0)),
  );

  if (cleaned.length > MAX_SUBJECTS) {
    return { error: `Please add ${MAX_SUBJECTS} subjects or fewer.` };
  }
  if (cleaned.some((name) => name.length > MAX_SUBJECT_NAME_LENGTH)) {
    return { error: `Subject names must be ${MAX_SUBJECT_NAME_LENGTH} characters or fewer.` };
  }

  // Replace this user's subjects with exactly the current list, so
  // removing an item in the UI actually removes it in the database too.
  const { error: deleteError } = await supabase
    .from("subjects")
    .delete()
    .eq("user_id", user.id);
  if (deleteError) return { error: GENERIC_ERROR };

  if (cleaned.length > 0) {
    const { error: insertError } = await supabase
      .from("subjects")
      .insert(cleaned.map((name) => ({ user_id: user.id, name })));
    if (insertError) return { error: GENERIC_ERROR };
  }

  return { error: null };
}

export async function saveGoals(
  goalTypes: string[],
  customGoal: string,
): Promise<ActionResult> {
  const { supabase, user } = await getAuthedUser();
  if (!user) return { error: "You need to be logged in to continue." };

  const validValues = new Set(GOAL_TYPES.map((goal) => goal.value));
  const cleanedTypes = Array.from(new Set(goalTypes)).filter((value) =>
    validValues.has(value as (typeof GOAL_TYPES)[number]["value"]),
  );

  const trimmedCustom = customGoal.trim();
  if (cleanedTypes.includes("other") && !trimmedCustom) {
    return { error: "Please describe your goal." };
  }
  if (trimmedCustom.length > MAX_CUSTOM_GOAL_LENGTH) {
    return { error: `Please keep your goal under ${MAX_CUSTOM_GOAL_LENGTH} characters.` };
  }

  const { error: deleteError } = await supabase
    .from("study_goals")
    .delete()
    .eq("user_id", user.id);
  if (deleteError) return { error: GENERIC_ERROR };

  if (cleanedTypes.length > 0) {
    const rows = cleanedTypes.map((goalType) => ({
      user_id: user.id,
      goal_type: goalType,
      custom_goal: goalType === "other" ? trimmedCustom : null,
    }));
    const { error: insertError } = await supabase.from("study_goals").insert(rows);
    if (insertError) return { error: GENERIC_ERROR };
  }

  return { error: null };
}

export async function savePreferences(methods: string[]): Promise<ActionResult> {
  const { supabase, user } = await getAuthedUser();
  if (!user) return { error: "You need to be logged in to continue." };

  const cleaned = Array.from(new Set(methods.map((method) => method.trim())));

  const { error } = await supabase
    .from("study_preferences")
    .upsert({ user_id: user.id, preferences: cleaned }, { onConflict: "user_id" });

  if (error) return { error: GENERIC_ERROR };
  return { error: null };
}

export async function saveAvailability(days: DayAvailabilityInput[]): Promise<ActionResult> {
  const { supabase, user } = await getAuthedUser();
  if (!user) return { error: "You need to be logged in to continue." };

  const validDayValues = new Set(DAYS_OF_WEEK.map((day) => day.value));

  for (const day of days) {
    if (!validDayValues.has(day.dayOfWeek as (typeof DAYS_OF_WEEK)[number]["value"])) {
      return { error: GENERIC_ERROR };
    }

    if (!day.available) continue;

    if (!day.startTime || !day.endTime) {
      return { error: "Please enter a start and end time for each day you marked available." };
    }

    const startMinutes = parseTimeToMinutes(day.startTime);
    const endMinutes = parseTimeToMinutes(day.endTime);
    if (startMinutes === null || endMinutes === null) {
      return { error: "Please enter valid start and end times." };
    }
    if (startMinutes >= endMinutes) {
      return { error: "Each day's end time must be after its start time." };
    }

    if (
      day.availableMinutes === null ||
      day.availableMinutes <= 0 ||
      day.availableMinutes > MAX_AVAILABLE_MINUTES
    ) {
      return {
        error: `Please enter a number of minutes between 1 and ${MAX_AVAILABLE_MINUTES} for each day you marked available.`,
      };
    }
    if (day.availableMinutes > endMinutes - startMinutes) {
      return {
        error: "Study minutes can't be more than the time window you selected for that day.",
      };
    }
  }

  const rows = days.map((day) => ({
    user_id: user.id,
    day_of_week: day.dayOfWeek,
    available: day.available,
    start_time: day.available ? day.startTime : null,
    end_time: day.available ? day.endTime : null,
    available_minutes: day.available ? day.availableMinutes : null,
  }));

  const { error } = await supabase
    .from("study_availability")
    .upsert(rows, { onConflict: "user_id,day_of_week" });

  if (error) return { error: GENERIC_ERROR };
  return { error: null };
}

export async function completeOnboarding(): Promise<ActionResult> {
  const { supabase, user } = await getAuthedUser();
  if (!user) return { error: "You need to be logged in to continue." };

  const { data: profile, error: fetchError } = await supabase
    .from("profiles")
    .select("display_name, grade_level")
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) return { error: GENERIC_ERROR };

  if (!profile?.display_name || !profile?.grade_level) {
    return {
      error:
        "Please finish your name and grade level before completing onboarding.",
    };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("user_id", user.id);

  if (error) return { error: GENERIC_ERROR };
  return { error: null };
}
