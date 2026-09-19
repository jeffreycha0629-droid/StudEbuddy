import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Onboarding intentionally does not use the full app sidebar (AppShellLayout)
 * or the marketing header. It's a focused, linear flow, so navigation is
 * deliberately minimal per DESIGN_SYSTEM.md's "simple navigation" principle.
 *
 * Requires a real, server-verified session (getUser()) - this route now
 * performs real per-user database writes (Feature 8), so it needs the
 * same auth guard used in the (app) route group (Feature 4/6).
 */
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-surface-muted px-4 py-10">
      <span className="mb-8 text-lg font-semibold tracking-tight text-foreground">
        StudEbuddy
      </span>
      <main className="w-full max-w-lg">{children}</main>
    </div>
  );
}
