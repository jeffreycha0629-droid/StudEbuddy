import { LogoutButton } from "@/components/auth/LogoutButton";

/**
 * Top header for authenticated pages, shown on mobile only (the desktop
 * Sidebar carries the brand + logout there instead).
 */
export function AppHeader() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-4 md:hidden">
      <span className="text-base font-semibold tracking-tight text-foreground">
        StudEbuddy
      </span>
      <LogoutButton />
    </header>
  );
}
