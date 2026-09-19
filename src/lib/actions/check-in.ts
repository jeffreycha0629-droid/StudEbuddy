"use server";

import { createClient } from "@/lib/supabase/server";
import {
  CHALLENGE_OPTIONS,
  MAX_CHALLENGE_OTHER_LENGTH,
  MOOD_OPTIONS,
} from "@/lib/checkin-constants";
import type { DailyCheckIn } from "@/types/database";

/**
 * Deliberately has no userId/user_id field. The user is always derived
 * from the server-verified session inside this action - there is no
 * parameter here a client could manipulate to check in as someone else.
 */
export interface SaveCheckInInput {
  checkinDate: string;
  mood: string;
  energy: number;
  focus: number;
  motivation: number;
  challenge: string;
  challengeOther: string | null;
}

export interface SaveCheckInResult {
  error: string | null;
  checkIn: DailyCheckIn | null;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function saveCheckIn(input: SaveCheckInInput): Promise<SaveCheckInResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to be logged in to check in.", checkIn: null };
  }

  if (!DATE_PATTERN.test(input.checkinDate)) {
    return { error: "Something went wrong. Please try again.", checkIn: null };
  }

  const validMoods = new Set(MOOD_OPTIONS.map((option) => option.value));
  if (!validMoods.has(input.mood as (typeof MOOD_OPTIONS)[number]["value"])) {
    return { error: "Please select a valid mood.", checkIn: null };
  }

  const scaleChecks: Array<[string, number]> = [
    ["energy", input.energy],
    ["focus", input.focus],
    ["motivation", input.motivation],
  ];
  for (const [label, value] of scaleChecks) {
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      return {
        error: `Please select a valid ${label} level between 1 and 5.`,
        checkIn: null,
      };
    }
  }

  const validChallenges = new Set(CHALLENGE_OPTIONS.map((option) => option.value));
  if (!validChallenges.has(input.challenge as (typeof CHALLENGE_OPTIONS)[number]["value"])) {
    return { error: "Please select a valid challenge.", checkIn: null };
  }

  const trimmedOther = input.challengeOther?.trim() || null;
  if (input.challenge === "other" && !trimmedOther) {
    return { error: "Please describe your challenge.", checkIn: null };
  }
  if (trimmedOther && trimmedOther.length > MAX_CHALLENGE_OTHER_LENGTH) {
    return {
      error: `Please keep your description under ${MAX_CHALLENGE_OTHER_LENGTH} characters.`,
      checkIn: null,
    };
  }

  // Upsert on the same (user_id, checkin_date) unique key every time -
  // this is what makes "one check-in per day" and "intentional editing"
  // structurally impossible to violate: there is no code path that ever
  // creates a second row for the same user and day.
  const { data, error } = await supabase
    .from("daily_checkins")
    .upsert(
      {
        user_id: user.id,
        checkin_date: input.checkinDate,
        mood: input.mood,
        energy: input.energy,
        focus: input.focus,
        motivation: input.motivation,
        challenge: input.challenge,
        challenge_other: input.challenge === "other" ? trimmedOther : null,
      },
      { onConflict: "user_id,checkin_date" },
    )
    .select()
    .single();

  if (error || !data) {
    return {
      error: "Something went wrong saving your check-in. Please try again.",
      checkIn: null,
    };
  }

  return { error: null, checkIn: data as DailyCheckIn };
}
