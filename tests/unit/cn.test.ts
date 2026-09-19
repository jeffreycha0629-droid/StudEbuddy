import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils/cn";

describe("cn", () => {
  it("joins truthy class names with a space", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("skips false, null, and undefined values", () => {
    expect(cn("a", false, "b", null, "c", undefined)).toBe("a b c");
  });

  it("supports conditional classes via short-circuit expressions", () => {
    const isActive = true;
    const isDisabled = false;
    expect(cn("btn", isActive && "btn-active", isDisabled && "btn-disabled")).toBe(
      "btn btn-active",
    );
  });

  it("returns an empty string when given nothing usable", () => {
    expect(cn(false, null, undefined)).toBe("");
  });

  it("returns an empty string when called with no arguments", () => {
    expect(cn()).toBe("");
  });
});
