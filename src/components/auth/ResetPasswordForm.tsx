"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { createClient } from "@/lib/supabase/client";
import { getPasswordError } from "@/lib/validation/auth";

interface FieldErrors {
  password?: string;
  confirmPassword?: string;
}

/**
 * Only ever rendered when /reset-password's server-side check has
 * already confirmed a valid recovery session exists (see that page for
 * the invalid/expired-link handling).
 */
export function ResetPasswordForm() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const errors: FieldErrors = {};

    const passwordError = getPasswordError(password);
    if (passwordError) errors.password = passwordError;

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (password && confirmPassword !== password) {
      errors.confirmPassword = "Passwords do not match.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    setFormError(null);
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setFormError(mapResetError(error.message));
        return;
      }

      // End the recovery session so the flow finishes at a real login,
      // as specified: new password -> login (not an automatic dashboard
      // bypass on the recovery session).
      await supabase.auth.signOut();

      setSuccessMessage("Your password has been updated. You can now log in with your new password.");
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
        <p role="status" className="mb-4 text-sm text-foreground">
          {successMessage}
        </p>
        <Button variant="primary" className="w-full" onClick={() => router.push("/login")}>
          Continue to Log In
        </Button>
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
          label="New Password"
          required
          hint="At least 8 characters."
          error={fieldErrors.password}
        >
          <PasswordInput
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField label="Confirm New Password" required error={fieldErrors.confirmPassword}>
          <PasswordInput
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Update Password
        </Button>
      </form>
    </Card>
  );
}

function mapResetError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("should be different")) {
    return "Your new password must be different from your current password.";
  }

  if (normalized.includes("session")) {
    return "Your reset session has expired. Please request a new reset link.";
  }

  return message;
}
