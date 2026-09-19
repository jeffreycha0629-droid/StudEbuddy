export interface NavItem {
  label: string;
  href: string;
  /**
   * Additional pathnames that should also count as "active" for this
   * item. Used by Profile/Settings, which is one nav entry but two real
   * routes - without this, visiting /settings directly would show no
   * nav item highlighted at all.
   */
  activePaths?: string[];
}

/**
 * Authenticated navigation, per DESIGN_SYSTEM.md section 11:
 * "Dashboard, Study Plan, Calendar, Study Buddy, Progress, Profile / Settings"
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Study Plan", href: "/study-plan" },
  { label: "Calendar", href: "/calendar" },
  { label: "Study Buddy", href: "/study-buddy" },
  { label: "Progress", href: "/progress" },
  {
    label: "Profile/Settings",
    href: "/profile",
    activePaths: ["/profile", "/settings"],
  },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return item.activePaths ? item.activePaths.includes(pathname) : pathname === item.href;
}
