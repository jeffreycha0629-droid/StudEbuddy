import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for use in the browser (Client Components).
 *
 * Security note (SECURITY.md sections 5-6): only the public URL and anon
 * key are used here — both are safe to ship to the browser. Real data
 * access is enforced by Row Level Security policies in the database, not
 * by keeping these values secret. The service-role key must never appear
 * in this file or any file that runs in the browser.
 *
 * Not called from anywhere yet in this foundation feature — authentication
 * is a separate, later feature slice.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Copy .env.local.example to .env.local and fill in your Supabase project values.",
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
