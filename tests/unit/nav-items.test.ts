import { describe, expect, it } from "vitest";
import { isNavItemActive, NAV_ITEMS, type NavItem } from "@/lib/nav-items";

describe("isNavItemActive", () => {
  it("matches when the pathname equals the item's href", () => {
    const item: NavItem = { label: "Dashboard", href: "/dashboard" };
    expect(isNavItemActive(item, "/dashboard")).toBe(true);
  });

  it("does not match a different pathname", () => {
    const item: NavItem = { label: "Dashboard", href: "/dashboard" };
    expect(isNavItemActive(item, "/calendar")).toBe(false);
  });

  it("matches any of an item's activePaths, not just its href", () => {
    const item: NavItem = {
      label: "Profile/Settings",
      href: "/profile",
      activePaths: ["/profile", "/settings"],
    };
    expect(isNavItemActive(item, "/profile")).toBe(true);
    expect(isNavItemActive(item, "/settings")).toBe(true);
    expect(isNavItemActive(item, "/dashboard")).toBe(false);
  });

  it("real Profile/Settings nav item stays highlighted on both of its routes", () => {
    const profileSettings = NAV_ITEMS.find((item) => item.href === "/profile");
    expect(profileSettings).toBeDefined();
    expect(isNavItemActive(profileSettings!, "/settings")).toBe(true);
  });
});
