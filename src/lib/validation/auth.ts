const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD_LENGTH = 8;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

/**
 * Returns a user-facing error message, or null if the email is valid.
 * This is a fast client-side check for UX only — Supabase's own server
 * re-validates every signup regardless of what happens here.
 */
export function getEmailError(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "Email is required.";
  if (!isValidEmail(trimmed)) return "Enter a valid email address.";
  return null;
}

/**
 * Returns a user-facing error message, or null if the password is valid.
 * Supabase's project-level password policy (set in the Supabase Dashboard)
 * is the actual source of truth — if it's stricter than this check, the
 * server's own error message will be shown to the user instead.
 */
export function getPasswordError(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}
