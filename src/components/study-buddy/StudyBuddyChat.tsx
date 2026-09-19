"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { sendStudyBuddyMessage, type StudyBuddyMessage } from "@/lib/actions/study-buddy";
import { cn } from "@/lib/utils/cn";
import { getLocalDateString } from "@/lib/utils/date";
import type { StudyTask, Subject } from "@/types/database";

export interface StudyBuddyChatProps {
  tasks: StudyTask[];
  subjects: Subject[];
}

interface DisplayMessage extends StudyBuddyMessage {
  id: string;
}

/**
 * Sent directly - the system prompt already carries the student's real
 * upcoming tasks and today's sessions (Feature 39), so these just need
 * to be worded to invoke that existing context rather than fetching
 * anything new.
 */
const DIRECT_QUICK_ACTIONS = [
  { id: "prioritize", label: "Help me prioritize", message: "Help me prioritize my upcoming tasks." },
  {
    id: "start",
    label: "Help me start studying",
    message: "I'm ready to start studying — what should I focus on first today?",
  },
  {
    id: "adjust",
    label: "Adjust today's plan",
    message: "Can you help me adjust today's study plan?",
  },
] as const;

const MAX_MESSAGE_LENGTH = 1000;

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function StudyBuddyChat({ tasks, subjects }: StudyBuddyChatProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [pendingPicker, setPendingPicker] = useState<"task" | "subject" | null>(null);

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      setError(`Message must be ${MAX_MESSAGE_LENGTH} characters or fewer.`);
      return;
    }

    setError(null);
    setPendingPicker(null);

    const nextMessages: DisplayMessage[] = [
      ...messages,
      { id: makeId(), role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setDraft("");
    setIsSending(true);

    try {
      // Only role/content are sent to the server - the client-only `id`
      // is purely a React rendering key and never leaves the browser.
      const result = await sendStudyBuddyMessage({
        history: nextMessages.map(({ role, content }) => ({ role, content })),
        todayDateString: getLocalDateString(),
      });

      if (result.error || !result.reply) {
        // No fake reply is ever substituted here - on failure, the
        // student's own message stays visible and the error is shown,
        // nothing pretends to be Study Buddy's response.
        setError(result.error ?? "Something went wrong. Please try again.");
        return;
      }

      setMessages((current) => [
        ...current,
        { id: makeId(), role: "assistant", content: result.reply! },
      ]);
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setIsSending(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await sendMessage(draft);
  }

  function handleExplainConcept() {
    // No "concept" data exists anywhere to pick from, unlike tasks or
    // subjects - pre-filling a starter is the honest option here,
    // rather than sending something genuinely vague.
    setPendingPicker(null);
    setError(null);
    setDraft("Can you explain ");
  }

  function handleBreakDownAssignment() {
    setError(null);
    if (tasks.length === 0) {
      setError("You don't have any tasks yet — add one on the Study Plan page first.");
      return;
    }
    setPendingPicker("task");
  }

  function handleMakePracticeQuestions() {
    setError(null);
    if (subjects.length === 0) {
      setError("You don't have any subjects yet — add one during onboarding or Settings first.");
      return;
    }
    setPendingPicker("subject");
  }

  return (
    <Card title="Study Buddy">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-muted">
          Ask about prioritizing work, breaking down assignments, or
          understanding a concept. This conversation isn&apos;t saved —
          refreshing the page starts fresh.
        </p>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {DIRECT_QUICK_ACTIONS.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => sendMessage(action.message)}
                disabled={isSending}
                className={cn(
                  "rounded-md border border-border bg-surface px-3 py-1.5 text-left text-sm text-foreground",
                  "hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                  "disabled:cursor-not-allowed disabled:opacity-60",
                )}
              >
                {action.label}
              </button>
            ))}
            <button
              type="button"
              onClick={handleExplainConcept}
              disabled={isSending}
              className={cn(
                "rounded-md border border-border bg-surface px-3 py-1.5 text-left text-sm text-foreground",
                "hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              Explain a concept
            </button>
            <button
              type="button"
              onClick={handleBreakDownAssignment}
              disabled={isSending}
              className={cn(
                "rounded-md border border-border bg-surface px-3 py-1.5 text-left text-sm text-foreground",
                "hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              Break down this assignment
            </button>
            <button
              type="button"
              onClick={handleMakePracticeQuestions}
              disabled={isSending}
              className={cn(
                "rounded-md border border-border bg-surface px-3 py-1.5 text-left text-sm text-foreground",
                "hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                "disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              Make practice questions
            </button>
          </div>

          {pendingPicker === "task" && (
            <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-muted p-3">
              <p className="text-sm font-medium text-foreground">Which assignment?</p>
              <div className="flex flex-wrap gap-2">
                {tasks.map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() =>
                      sendMessage(`Can you help me break down "${task.title}" into manageable steps?`)
                    }
                    disabled={isSending}
                    className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {task.title}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                variant="secondary"
                className="w-fit"
                onClick={() => setPendingPicker(null)}
                disabled={isSending}
              >
                Cancel
              </Button>
            </div>
          )}

          {pendingPicker === "subject" && (
            <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-muted p-3">
              <p className="text-sm font-medium text-foreground">Practice questions for which subject?</p>
              <div className="flex flex-wrap gap-2">
                {subjects.map((subject) => (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => sendMessage(`Can you create some practice questions for ${subject.name}?`)}
                    disabled={isSending}
                    className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {subject.name}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                variant="secondary"
                className="w-fit"
                onClick={() => setPendingPicker(null)}
                disabled={isSending}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        <div
          className="flex max-h-[400px] min-h-[120px] flex-col gap-3 overflow-y-auto rounded-md border border-border bg-surface-muted p-3"
          aria-live="polite"
        >
          {messages.length === 0 ? (
            <p className="text-sm text-text-muted">
              No messages yet. Ask a question below or try a suggestion above.
            </p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                  message.role === "user"
                    ? "self-end bg-primary text-primary-foreground"
                    : "self-start border border-border bg-surface text-foreground",
                )}
              >
                {message.content}
              </div>
            ))
          )}
          {isSending && (
            <div className="self-start rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-muted">
              Thinking...
            </div>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-sm border-l-4 border-error bg-surface-muted px-3 py-2 text-sm text-error"
          >
            {error}
          </p>
        )}

        <form className="flex gap-2" onSubmit={handleSubmit}>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={isSending}
            rows={2}
            placeholder="Ask Study Buddy something..."
            className="flex-1"
            aria-label="Message"
          />
          <Button type="submit" isLoading={isSending} disabled={!draft.trim()}>
            Send
          </Button>
        </form>
      </div>
    </Card>
  );
}
