import { describe, expect, it } from "vitest";
import { parseTimeToMinutes } from "@/lib/onboarding-constants";

describe("parseTimeToMinutes", () => {
  it("parses midnight as 0", () => {
    expect(parseTimeToMinutes("00:00")).toBe(0);
  });

  it("parses a normal time correctly", () => {
    expect(parseTimeToMinutes("04:30")).toBe(270);
  });

  it("parses the last minute of the day", () => {
    expect(parseTimeToMinutes("23:59")).toBe(1439);
  });

  it.each(["24:00", "12:60", "-1:00", "1:00", "not-a-time", "", "12:5"])(
    "returns null for invalid input %j",
    (value) => {
      expect(parseTimeToMinutes(value)).toBeNull();
    },
  );
});
