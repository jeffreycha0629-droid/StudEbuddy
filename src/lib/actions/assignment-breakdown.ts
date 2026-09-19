"use server";

import { createClient } from "@/lib/supabase/server";
import { callClaudeWithTool, type ClaudeTool } from "@/lib/ai/claude";

export interface BreakdownStep {
  title: string;
  description: string;
}

export interface GenerateBreakdownResult {
  error: string | null;
  taskTitle: string | null;
  steps: BreakdownStep[] | null;
}

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 5;
const MAX_STEPS = 12;
const MAX_STEP_TITLE_LENGTH = 60;
const MAX_STEP_DESCRIPTION_LENGTH = 300;

const BREAKDOWN_TOOL: ClaudeTool = {
  name: "create_assignment_breakdown",
  description:
    "Breaks an academic assignment down into a structured, ordered list of concrete steps.",
  input_schema: {
    type: "object",
    properties: {
      steps: {
        type: "array",
        description: "Ordered list of steps to complete the assignment, from start to finish.",
        items: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Short name for this step, e.g. 'Choose topic'.",
            },
            description: {
              type: "string",
              description:
                "One or two sentences describing what to do in this step, in general terms.",
            },
          },
          required: ["title", "description"],
        },
      },
    },
    required: ["steps"],
  },
};

const SYSTEM_PROMPT =
  "You help students break academic assignments down into a clear, ordered sequence of " +
  "concrete steps. Only describe the general process appropriate to the type of " +
  "assignment - never invent specific requirements the student didn't provide, such as " +
  "page counts, number of sources, specific due dates, grading criteria, or formatting " +
  "rules. If the assignment type is unclear, give a reasonable general breakdown for " +
  "academic work of that general kind. You only ever respond by calling the " +
  "create_assignment_breakdown tool - never with plain text.";

/**
 * Field-by-field validation of Claude's structured output, same
 * discipline as ai-study-plan.ts's validateAiSessions - schema
 * compliance from the tool-use API is not trusted on its own.
 */
function validateSteps(raw: unknown): {
  error: string | null;
  steps: BreakdownStep[] | null;
} {
  if (
    !raw ||
    typeof raw !== "object" ||
    !("steps" in raw) ||
    !Array.isArray((raw as { steps: unknown }).steps)
  ) {
    return { error: "The AI response wasn't in the expected format.", steps: null };
  }

  const rawSteps = (raw as { steps: unknown[] }).steps;

  if (rawSteps.length === 0) {
    return { error: "The AI didn't generate any steps. Please try again.", steps: null };
  }
  if (rawSteps.length > MAX_STEPS) {
    return { error: "The AI generated too many steps. Please try again.", steps: null };
  }

  const validated: BreakdownStep[] = [];

  for (const item of rawSteps) {
    if (!item || typeof item !== "object") {
      return { error: "The AI response wasn't in the expected format.", steps: null };
    }
    const step = item as { title?: unknown; description?: unknown };

    if (
      typeof step.title !== "string" ||
      !step.title.trim() ||
      step.title.length > MAX_STEP_TITLE_LENGTH
    ) {
      return { error: "The AI returned an invalid step title. Please try again.", steps: null };
    }
    if (
      typeof step.description !== "string" ||
      !step.description.trim() ||
      step.description.length > MAX_STEP_DESCRIPTION_LENGTH
    ) {
      return {
        error: "The AI returned an invalid step description. Please try again.",
        steps: null,
      };
    }

    validated.push({ title: step.title.trim(), description: step.description.trim() });
  }

  return { error: null, steps: validated };
}

export async function generateAssignmentBreakdown(
  taskId: string,
): Promise<GenerateBreakdownResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You need to be logged in to continue.", taskTitle: null, steps: null };
  }
  if (!taskId) {
    return { error: "Please select an assignment.", taskTitle: null, steps: null };
  }

  const { data: task, error: taskError } = await supabase
    .from("study_tasks")
    .select("title, task_type, notes")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (taskError || !task) {
    return { error: "That assignment couldn't be found.", taskTitle: null, steps: null };
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
    return { error: "Something went wrong. Please try again.", taskTitle: null, steps: null };
  }
  if ((count ?? 0) >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      error: `You're sending requests too quickly. Please wait a bit and try again (limit: ${RATE_LIMIT_MAX_REQUESTS} per minute).`,
      taskTitle: null,
      steps: null,
    };
  }

  // Only real, stored data goes into the prompt - nothing about the
  // assignment is fabricated here for Claude to work from.
  const promptLines = [`Assignment: ${task.title}`, `Type: ${task.task_type}`];
  if (task.notes) {
    promptLines.push(`Additional notes the student provided: ${task.notes}`);
  }
  promptLines.push("Break this assignment down into an ordered list of concrete steps.");

  const toolResult = await callClaudeWithTool(
    SYSTEM_PROMPT,
    promptLines.join("\n"),
    BREAKDOWN_TOOL,
  );

  // Log the attempt regardless of outcome, for rate-limiting purposes.
  await supabase.from("ai_requests").insert({ user_id: user.id });

  if (toolResult.error) {
    return { error: toolResult.error, taskTitle: null, steps: null };
  }

  const validation = validateSteps(toolResult.input);
  if (validation.error || !validation.steps) {
    return {
      error: validation.error ?? "The AI response couldn't be validated.",
      taskTitle: null,
      steps: null,
    };
  }

  return { error: null, taskTitle: task.title, steps: validation.steps };
}
