import { describe, expect, it } from "vitest";
import { getEmailError, getPasswordError, isValidEmail, MIN_PASSWORD_LENGTH } from "@/lib/validation/auth";

describe("isValidEmail", () => {
  it("accepts a normal email address", () => {
    expect(isValidEmail("student@example.com")).toBe(true);
  });

  it("trims surrounding whitespace before validating", () => {
    expect(isValidEmail("  student@example.com  ")).toBe(true);
  });

  it.each(["not-an-email", "missing-domain@", "@missing-local.com", "no spaces@example.com", ""])(
    "rejects %j",
    (value) => {
      expect(isValidEmail(value)).toBe(false);
    },
  );
});

describe("getEmailError", () => {
  it("returns an error for an empty email", () => {
    expect(getEmailError("")).toBe("Email is required.");
  });

  it("returns an error for an email that is only whitespace", () => {
    expect(getEmailError("   ")).toBe("Email is required.");
  });

  it("returns an error for a malformed email", () => {
    expect(getEmailError("not-an-email")).toBe("Enter a valid email address.");
  });

  it("returns null for a valid email", () => {
    expect(getEmailError("student@example.com")).toBeNull();
  });
});

describe("getPasswordError", () => {
  it("returns an error for an empty password", () => {
    expect(getPasswordError("")).toBe("Password is required.");
  });

  it("returns an error for a password shorter than the minimum length", () => {
    const shortPassword = "a".repeat(MIN_PASSWORD_LENGTH - 1);
    expect(getPasswordError(shortPassword)).toBe(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    );
  });

  it("returns null for a password at exactly the minimum length", () => {
    const password = "a".repeat(MIN_PASSWORD_LENGTH);
    expect(getPasswordError(password)).toBeNull();
  });

  it("returns null for a password longer than the minimum length", () => {
    expect(getPasswordError("a-perfectly-long-password")).toBeNull();
  });
});
