import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for use on the server (Server Components, Server
 * Actions, Route Handlers). This is where trusted, authoritative checks
 * belong per SECURITY.md section 2 ("Authorization must be enforced at
 * trusted server/database layers, not by hiding UI").
 *
 * Still only uses the public URL and anon key — this file does not use
 * the service-role key. If a future feature genuinely needs to bypass
 * RLS from trusted server code, that key would be read here via
 * `process.env.SUPABASE_SERVICE_ROLE_KEY` (server-only, never
 * NEXT_PUBLIC_-prefixed) and never returned to the browser.
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

  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // `set` is called from a Server Component during rendering,
          // which Next.js doesn't allow. This is safe to ignore as long
          // as session refreshing happens elsewhere (e.g. middleware),
          // which will be added when authentication is implemented.
        }
      },
    },
  });
}
