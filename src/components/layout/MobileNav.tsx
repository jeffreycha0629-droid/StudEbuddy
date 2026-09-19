"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isNavItemActive } from "@/lib/nav-items";
import { cn } from "@/lib/utils/cn";

/**
 * Compact mobile navigation, per DESIGN_SYSTEM.md section 11 ("Mobile: use
 * a compact navigation pattern that preserves easy access to core areas.").
 * A fixed bottom bar that scrolls horizontally if it doesn't fit — simple
 * and predictable rather than a hidden hamburger menu, so core areas stay
 * one tap away.
 */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-10 flex gap-1 overflow-x-auto border-t border-border bg-surface p-2 md:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = isNavItemActive(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "min-h-[44px] flex-shrink-0 rounded-md px-3 py-2 text-center text-xs font-medium transition-colors",
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
  );
}
