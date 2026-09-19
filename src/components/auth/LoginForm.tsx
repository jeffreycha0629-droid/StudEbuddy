"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { createClient } from "@/lib/supabase/client";
import { getEmailError } from "@/lib/validation/auth";

interface FieldErrors {
  email?: string;
  password?: string;
}

/**
 * Real Supabase Auth login form.
 *
 * Security note: Supabase deliberately returns the same generic error
 * ("Invalid login credentials") whether the password is wrong OR no
 * account exists for that email. We preserve that ambiguity in the UI
 * rather than telling the user which one it was, to avoid letting an
 * attacker discover which emails have accounts.
 */
export function LoginForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): boolean {
    const errors: FieldErrors = {};

    const emailError = getEmailError(email);
    if (emailError) errors.email = emailError;

    if (!password) {
      errors.password = "Password is required.";
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
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setFormError(mapLoginError(error.message));
        return;
      }

      // Refresh so Server Components (like this page's own "already
      // logged in" check) see the new session, then move to the dashboard.
      router.refresh();
      router.push("/dashboard");
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

        <FormField label="Password" required error={fieldErrors.password}>
          <PasswordInput
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
          />
        </FormField>

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Log In
        </Button>
      </form>
    </Card>
  );
}

function mapLoginError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid email or password")
  ) {
    return "Incorrect email or password.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email address before logging in. Check your inbox for the confirmation link.";
  }

  // Supabase Auth's own error messages are already written to be shown
  // to end users, so it's safe to display them directly otherwise.
  return message;
}
