"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { createClient } from "@/lib/supabase/client";
import { getEmailError, getPasswordError } from "@/lib/validation/auth";

interface FieldErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

/**
 * Real Supabase Auth signup form.
 *
 * Security notes:
 * - Calls supabase.auth.signUp() directly from the browser with the anon
 *   key. This is the standard, documented Supabase pattern — the user's
 *   ID is assigned by Supabase's own server, we never supply one.
 * - We never see or store the raw password ourselves; it goes straight
 *   to Supabase Auth over HTTPS (PROJECT_RULES.md rule 6).
 * - Client-side validation below is for fast UX feedback only. Supabase's
 *   server re-validates everything and is the real authority — including
 *   its own password policy, which may be stricter than the check here.
 */
export function SignupForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const errors: FieldErrors = {};

    const emailError = getEmailError(email);
    if (emailError) errors.email = emailError;

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

    // Extra guard beyond the disabled button, in case of a race between
    // Enter-key submit and a click landing at nearly the same time.
    if (isSubmitting) return;

    setFormError(null);
    setSuccessMessage(null);

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        setFormError(mapSignupError(error.message));
        return;
      }

      // Supabase Auth returns a masked user object with an empty
      // `identities` array when the email is already registered, instead
      // of an explicit error. This is deliberate on Supabase's part, to
      // avoid letting an attacker discover which emails have accounts.
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        setFormError("An account with this email already exists. Try logging in instead.");
        return;
      }

      if (data.session) {
        // This Supabase project has "Confirm email" turned off, so the
        // user is signed in immediately.
        router.push("/onboarding");
        return;
      }

      setSuccessMessage(
        `We've sent a confirmation link to ${email.trim()}. Please check your inbox to activate your account.`,
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

        <FormField label="Email" required error={fieldErrors.email}>
          <Input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField label="Password" required hint="At least 8 characters." error={fieldErrors.password}>
          <PasswordInput
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField label="Confirm Password" required error={fieldErrors.confirmPassword}>
          <PasswordInput
            name="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Create Account
        </Button>
      </form>
    </Card>
  );
}

function mapSignupError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("already registered") || normalized.includes("already exists")) {
    return "An account with this email already exists. Try logging in instead.";
  }

  // Supabase Auth's own error messages (e.g. "Password should be at least
  // 6 characters") are already written to be shown to end users, so it's
  // safe to display them directly rather than a generic message.
  return message;
}
