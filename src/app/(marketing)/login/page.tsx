import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { createClient } from "@/lib/supabase/server";

/**
 * If a valid session already exists, send the user straight to the
 * dashboard instead of showing the login form again. Uses getUser()
 * (server-verified) rather than getSession() (locally-decoded and not
 * safe to trust for a real decision) per SECURITY.md's rule against
 * trusting unverified data.
 */
export default async function LoginPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Log In</h1>

      <LoginForm />

      <p className="text-sm text-text-muted">
        Forgot your password?{" "}
        <Link href="/forgot-password" className="font-medium text-primary hover:underline">
          Reset it
        </Link>
      </p>
      <p className="text-sm text-text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}
