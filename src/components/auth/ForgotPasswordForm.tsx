"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { createClient } from "@/lib/supabase/client";
import { getEmailError } from "@/lib/validation/auth";

/**
 * Requests a Supabase Auth password reset email.
 *
 * Security note: like signup, this deliberately shows the same "check
 * your inbox" message regardless of whether the email actually has an
 * account — Supabase's resetPasswordForEmail doesn't reveal account
 * existence either, and we preserve that here rather than leaking it.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    setFormError(null);
    setSuccessMessage(null);

    const validationError = getEmailError(email);
    setEmailError(validationError ?? undefined);
    if (validationError) return;

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const trimmedEmail = email.trim();

      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
      });

      if (error) {
        setFormError("Something went wrong. Please check your connection and try again.");
        return;
      }

      setSuccessMessage(
        `If an account exists for ${trimmedEmail}, we've sent a password reset link. Check your inbox.`,
      );
    } catch (err) {
      if (err instanceof Error && err.message.includes("NEXT_PUBLIC_SUPABASE")) {
        setFormError(
          "Supabase isn't configured yet. Copy .env.local.example to .env.local, add your Supabase project URL and anon key, then restart the dev server.",
        );
      } else {
        setFormError("Something went wrong. Please check your connection and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (successMessage) {
    return (
      <Card>
        <p role="status" className="text-sm text-foreground">
          {successMessage}
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        {formError && (
          <p
            role="alert"
            className="rounded-sm border-l-4 border-error bg-surface-muted px-3 py-2 text-sm text-error"
          >
            {formError}
          </p>
        )}

        <FormField
          label="Email"
          required
          hint="We'll send a password reset link to this address."
          error={emailError}
        >
          <Input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Send Reset Link
        </Button>
      </form>
    </Card>
  );
}
