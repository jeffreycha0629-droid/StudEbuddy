"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { NAV_ITEMS, isNavItemActive } from "@/lib/nav-items";
import { cn } from "@/lib/utils/cn";

/**
 * Desktop navigation, per DESIGN_SYSTEM.md section 11 ("Desktop: use a
 * clear sidebar or equivalent navigation. Always indicate the active page.").
 * Hidden on small screens — MobileNav takes over there.
 */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="mb-4 px-2 text-lg font-semibold tracking-tight text-foreground">
          StudEbuddy
        </span>

        <nav aria-label="Primary" className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = isNavItemActive(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  isActive
                    ? "bg-secondary text-foreground"
                    : "text-text-muted hover:bg-surface-muted hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Account actions are deliberately outside the "Primary" nav
          landmark above — logout is an action, not a page to navigate to. */}
      <div className="border-t border-border p-4">
        <LogoutButton className="w-full" />
      </div>
    </div>
  );
}
