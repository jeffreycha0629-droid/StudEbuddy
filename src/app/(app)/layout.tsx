import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { createClient } from "@/lib/supabase/server";

/**
 * Shared shell for authenticated pages (dashboard, study plan, calendar,
 * study buddy, progress, profile, settings).
 *
 * This now enforces that a real, server-verified session exists before
 * rendering anything in this group. Uses getUser() (server-verified)
 * rather than getSession() (locally-decoded, not safe to trust for a
 * real decision) per SECURITY.md's rule against trusting unverified data.
 * Anyone without a valid session — including someone who just logged
 * out, or typed the URL directly — is redirected to /login.
 */
export default async function AppShellLayout({
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
    <div className="flex min-h-screen">
      {/* First focusable element on every authenticated page, so keyboard
          users don't have to tab through the full nav + logout button
          every time just to reach the page content. Visually hidden
          until focused. */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        Skip to main content
      </a>

      <Sidebar />
      <div className="flex flex-1 flex-col">
        <AppHeader />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-4 pb-20 md:p-8 md:pb-8 focus:outline-none"
        >
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
