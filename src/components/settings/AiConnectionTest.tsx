"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { sendTestPrompt } from "@/lib/actions/ai";

export function AiConnectionTest() {
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleTest() {
    if (isSubmitting) return;

    setError(null);
    setReply(null);
    setIsSubmitting(true);
    try {
      const result = await sendTestPrompt();
      if (result.error) {
        setError(result.error);
        return;
      }
      setReply(result.reply);
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card title="AI Connection (Foundation Test)">
      <p className="mb-3 text-sm text-text-muted">
        Sends one fixed, harmless test message to Claude through
        StudEbuddy&apos;s own server. Your browser never talks to the AI
        provider directly, and no API key is ever sent to it.
      </p>

      {error && (
        <p
          role="alert"
          className="mb-3 rounded-sm border-l-4 border-error bg-surface-muted px-3 py-2 text-sm text-error"
        >
          {error}
        </p>
      )}

      {reply && (
        <p
          role="status"
          className="mb-3 rounded-sm border-l-4 border-success bg-surface-muted px-3 py-2 text-sm text-foreground"
        >
          {reply}
        </p>
      )}

      <Button type="button" variant="secondary" isLoading={isSubmitting} onClick={handleTest}>
        Send Test Message
      </Button>
    </Card>
  );
}
