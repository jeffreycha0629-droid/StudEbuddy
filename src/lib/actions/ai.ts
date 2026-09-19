"use server";

import { createClient } from "@/lib/supabase/server";
import { callClaude } from "@/lib/ai/claude";

export interface TestClaudeResult {
  error: string | null;
  reply: string | null;
}

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 5;

// Deliberately fixed and harmless - this action exists to verify the
// Claude Server Integration foundation itself, not to accept arbitrary
// user input. Features that need real user-supplied prompts (Study
// Buddy, AI Study Planner) are separate, not-yet-built work that will
// call callClaude() with their own validated input.
const TEST_PROMPT = "Reply with exactly this sentence and nothing else: StudEbuddy AI connection is working.";

/**
 * Authenticates the caller, enforces a simple per-user rate limit using
 * the ai_requests log, then calls Claude through the one secure server
 * module (src/lib/ai/claude.ts). The browser never sees an API key and
 * never talks to Claude directly - this action is the full
 * Browser -> StudEbuddy server -> Claude API path.
 */
export async function sendTestPrompt(): Promise<TestClaudeResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to be logged in to continue.", reply: null };
  }

  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("ai_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", windowStart);

  if (countError) {
    return { error: "Something went wrong. Please try again.", reply: null };
  }
  if ((count ?? 0) >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      error: `You're sending requests too quickly. Please wait a bit and try again (limit: ${RATE_LIMIT_MAX_REQUESTS} per minute).`,
      reply: null,
    };
  }

  const result = await callClaude(TEST_PROMPT);

  // Log this attempt regardless of outcome - it still consumed a real
  // call to the AI provider (or at least an attempt to), and the rate
  // limit above exists to bound that cost.
  await supabase.from("ai_requests").insert({ user_id: user.id });

  if (result.error) {
    return { error: result.error, reply: null };
  }

  return { error: null, reply: result.text };
}
