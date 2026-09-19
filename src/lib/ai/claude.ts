import Anthropic from "@anthropic-ai/sdk";

/**
 * This is the ONLY place in the codebase that imports the Anthropic SDK
 * or reads ANTHROPIC_API_KEY. It must never be imported by anything that
 * runs in the browser (no "use client" file should import this).
 *
 * Architecture (matches the feature spec exactly):
 *   Browser -> Server Action -> this module -> Claude API
 * Never: Browser -> Claude API directly with an exposed key.
 *
 * SECURITY.md section 5/6 and PROJECT_RULES.md rule 18 both apply here -
 * this key is a server secret, and the AI itself is never an
 * authorization boundary; callers of callClaude() are responsible for
 * authenticating the user and deciding what context is safe to send
 * before this function is ever reached.
 */

const DEFAULT_MODEL = "claude-sonnet-5";
const MAX_OUTPUT_TOKENS = 512;
const MAX_PROMPT_LENGTH = 2000;

export interface CallClaudeResult {
  error: string | null;
  text: string | null;
}

let cachedClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (cachedClient) return cachedClient;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing ANTHROPIC_API_KEY. Add it to .env.local (server-only, never NEXT_PUBLIC_) and restart the dev server.",
    );
  }

  cachedClient = new Anthropic({ apiKey });
  return cachedClient;
}

export function getPromptValidationError(prompt: string): string | null {
  const trimmed = prompt.trim();
  if (!trimmed) return "Please provide a message.";
  if (trimmed.length > MAX_PROMPT_LENGTH) {
    return `Message must be ${MAX_PROMPT_LENGTH} characters or fewer.`;
  }
  return null;
}

/**
 * Sends a single user-turn prompt to Claude and returns its text reply.
 *
 * - Response limits: max_tokens is hard-capped here (MAX_OUTPUT_TOKENS) -
 *   callers cannot request unlimited output.
 * - Error handling: raw SDK/API errors are logged server-side only and
 *   never returned to the caller verbatim (SECURITY.md section 14 - no
 *   internal technical details in user-facing errors).
 * - Validation: prompt length/emptiness checked before any network call.
 *
 * This function does not authenticate the caller or apply rate limiting
 * itself - callers (Server Actions) are responsible for both before
 * reaching this function, so this module stays a plain, reusable
 * "talk to Claude" primitive rather than owning unrelated concerns.
 */
export async function callClaude(prompt: string): Promise<CallClaudeResult> {
  const validationError = getPromptValidationError(prompt);
  if (validationError) {
    return { error: validationError, text: null };
  }

  try {
    const client = getClient();

    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      messages: [{ role: "user", content: prompt.trim() }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { error: "Received an unexpected response. Please try again.", text: null };
    }

    return { error: null, text: textBlock.text };
  } catch (err) {
    console.error("Claude API call failed:", err);

    if (err instanceof Error && err.message.includes("ANTHROPIC_API_KEY")) {
      return {
        error:
          "AI isn't configured yet. Add ANTHROPIC_API_KEY to .env.local and restart the dev server.",
        text: null,
      };
    }

    return {
      error: "Something went wrong contacting the AI service. Please try again.",
      text: null,
    };
  }
}

const MAX_STRUCTURED_OUTPUT_TOKENS = 2048;

export interface ClaudeTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties?: unknown;
    [key: string]: unknown;
  };
}

export interface CallClaudeToolResult {
  error: string | null;
  input: unknown;
}

/**
 * Sends a prompt to Claude with a forced tool call, so the response is
 * guaranteed to be structured JSON matching `tool.input_schema` rather
 * than free-form text - this is what "Do NOT accept free-form text as
 * the database structure" actually means in practice. Callers must
 * still run their own field-by-field validation on the returned `input`
 * before using it for anything (schema compliance from the API is not a
 * substitute for that - see validateAiSessions in ai-study-plan.ts).
 *
 * Uses a separate, higher token cap than callClaude() since structured
 * multi-item output (e.g. a week's worth of study sessions) is larger
 * than a single text reply - still a hard cap, not unlimited.
 */
export async function callClaudeWithTool(
  systemPrompt: string,
  userPrompt: string,
  tool: ClaudeTool,
): Promise<CallClaudeToolResult> {
  const validationError = getPromptValidationError(userPrompt);
  if (validationError) {
    return { error: validationError, input: null };
  }

  try {
    const client = getClient();

    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: MAX_STRUCTURED_OUTPUT_TOKENS,
      system: systemPrompt,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content: userPrompt }],
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return { error: "Received an unexpected response. Please try again.", input: null };
    }

    return { error: null, input: toolUse.input };
  } catch (err) {
    console.error("Claude API tool call failed:", err);

    if (err instanceof Error && err.message.includes("ANTHROPIC_API_KEY")) {
      return {
        error:
          "AI isn't configured yet. Add ANTHROPIC_API_KEY to .env.local and restart the dev server.",
        input: null,
      };
    }

    return {
      error: "Something went wrong contacting the AI service. Please try again.",
      input: null,
    };
  }
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_CONVERSATION_MESSAGES = 20;

/**
 * Sends a full conversation history to Claude and returns its next
 * reply - unlike callClaude() (single isolated prompt), this gives
 * Claude the prior turns so it can hold an actual conversation. Purely
 * additive alongside callClaude()/callClaudeWithTool() - neither is
 * modified by this.
 *
 * Same response-limits and error-handling posture as the rest of this
 * module: max_tokens is hard-capped, raw errors are never returned to
 * the caller verbatim, and the message count itself is capped so a
 * runaway conversation can't grow unbounded context/cost.
 */
export async function callClaudeConversation(
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<CallClaudeResult> {
  if (messages.length === 0) {
    return { error: "Please provide a message.", text: null };
  }
  if (messages.length > MAX_CONVERSATION_MESSAGES) {
    return { error: "This conversation has gotten too long. Please start a new one.", text: null };
  }

  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== "user") {
    return { error: "Something went wrong. Please try again.", text: null };
  }

  for (const message of messages) {
    const validationError = getPromptValidationError(message.content);
    if (validationError) {
      return { error: validationError, text: null };
    }
  }

  try {
    const client = getClient();

    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: systemPrompt,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content.trim(),
      })),
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { error: "Received an unexpected response. Please try again.", text: null };
    }

    return { error: null, text: textBlock.text };
  } catch (err) {
    console.error("Claude API conversation call failed:", err);

    if (err instanceof Error && err.message.includes("ANTHROPIC_API_KEY")) {
      return {
        error:
          "AI isn't configured yet. Add ANTHROPIC_API_KEY to .env.local and restart the dev server.",
        text: null,
      };
    }

    return {
      error: "Something went wrong contacting the AI service. Please try again.",
      text: null,
    };
  }
}
