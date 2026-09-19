"use server";

import { createClient } from "@/lib/supabase/server";
import { callClaude } from "@/lib/ai/claude";

export interface ExplainConceptResult {
  error: string | null;
  explanation: string | null;
}

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 5;
const MAX_CONCEPT_LENGTH = 200;

/**
 * Server-only prompt guidance per style. Values here must exactly match
 * the `value`s in src/lib/explanation-styles.ts (the client-facing
 * {value, label} list) - see that file's comment for why they're split.
 */
const EXPLANATION_STYLE_GUIDANCE: Record<string, string> = {
  simple:
    "Explain this in the simplest terms possible, avoiding jargon, as if to someone with no background in the subject.",
  normal:
    "Give a clear, standard-level explanation suitable for a student studying this topic.",
  detailed:
    "Give a thorough, in-depth explanation covering the key mechanisms and nuances.",
  example:
    "Explain this primarily through one concrete, worked example that illustrates the concept in action.",
  analogy:
    "Explain this primarily through a relatable analogy or comparison to something familiar.",
};

export async function explainConcept(
  concept: string,
  style: string,
): Promise<ExplainConceptResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to be logged in to continue.", explanation: null };
  }

  const trimmedConcept = concept.trim();
  if (!trimmedConcept) {
    return { error: "Please enter a concept to explain.", explanation: null };
  }
  if (trimmedConcept.length > MAX_CONCEPT_LENGTH) {
    return {
      error: `Please keep the concept under ${MAX_CONCEPT_LENGTH} characters.`,
      explanation: null,
    };
  }

  const styleGuidance = EXPLANATION_STYLE_GUIDANCE[style];
  if (!styleGuidance) {
    return { error: "Please select a valid explanation style.", explanation: null };
  }

  // Rate limiting - same append-only ai_requests log and strategy
  // established in Feature 32.
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("ai_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", windowStart);

  if (countError) {
    return { error: "Something went wrong. Please try again.", explanation: null };
  }
  if ((count ?? 0) >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      error: `You're sending requests too quickly. Please wait a bit and try again (limit: ${RATE_LIMIT_MAX_REQUESTS} per minute).`,
      explanation: null,
    };
  }

  const prompt =
    `Explain the following academic concept: "${trimmedConcept}"\n\n` +
    `${styleGuidance}\n\n` +
    "Keep the explanation focused and appropriate for a student studying this topic. " +
    "Do not state specific facts, figures, or details you aren't confident are accurate.";

  const result = await callClaude(prompt);

  // Log the attempt regardless of outcome, for rate-limiting purposes.
  await supabase.from("ai_requests").insert({ user_id: user.id });

  if (result.error) {
    return { error: result.error, explanation: null };
  }

  return { error: null, explanation: result.text };
}
