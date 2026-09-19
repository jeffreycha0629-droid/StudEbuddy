import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";

/**
 * Whether this page shows the "set new password" form or an
 * invalid/expired message is decided entirely by whether a real,
 * server-verified session exists — which only happens if
 * /auth/confirm successfully redeemed a valid reset link. No fragile
 * client-side URL parsing needed.
 */
export default async function ResetPasswordPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="mx-auto flex max-w-sm flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Reset Link Invalid
        </h1>

        <Card>
          <p className="text-sm text-text-muted">
            This password reset link is invalid or has expired. Reset links
            can only be used once and expire after a short time.
          </p>
        </Card>

        <p className="text-sm text-text-muted">
          <Link
            href="/forgot-password"
            className="font-medium text-primary hover:underline"
          >
            Request a new reset link
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Set a New Password
      </h1>
      <ResetPasswordForm />
    </div>
  );
}
