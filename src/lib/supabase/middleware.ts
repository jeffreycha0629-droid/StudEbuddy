import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Keeps the Supabase session alive across requests.
 *
 * Why this exists: Supabase access tokens are short-lived (about an hour).
 * Without something refreshing them on the server, a signed-in user could
 * come back after their token expires and appear logged out even though
 * their refresh token is still valid — breaking exactly the "refresh
 * after login" / "close and reopen browser" behavior Feature 3 needs.
 * Calling supabase.auth.getUser() here triggers that refresh and writes
 * the updated cookies onto the response.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If Supabase isn't configured yet, let the request through unchanged
  // instead of crashing every single page load.
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  // IMPORTANT: this call is what actually performs the refresh. Do not
  // remove it or add other logic between creating the client and this
  // line — per Supabase's docs, that can cause hard-to-debug session bugs.
  await supabase.auth.getUser();

  return supabaseResponse;
}
