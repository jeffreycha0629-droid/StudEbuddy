import { describe, expect, it } from "vitest";
import { getLocalDateString } from "@/lib/utils/date";

describe("getLocalDateString", () => {
  it("formats a date as YYYY-MM-DD using local components", () => {
    const date = new Date(2026, 0, 5); // Jan 5, 2026, local time
    expect(getLocalDateString(date)).toBe("2026-01-05");
  });

  it("pads single-digit months and days", () => {
    const date = new Date(2026, 8, 9); // Sep 9, 2026
    expect(getLocalDateString(date)).toBe("2026-09-09");
  });

  it("does not shift the date the way toISOString() (UTC) can", () => {
    // 11:30 PM local time on Dec 31 - toISOString() would push this into
    // Jan 1 for any timezone behind UTC, which is exactly the bug this
    // function exists to avoid.
    const date = new Date(2026, 11, 31, 23, 30);
    expect(getLocalDateString(date)).toBe("2026-12-31");
  });

  it("defaults to the current date when called with no argument", () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(getLocalDateString()).toBe(expected);
  });
});
