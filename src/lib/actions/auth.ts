"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Ends the current Supabase session and redirects to /login.
 *
 * Runs as a Server Action so the session is ended in a trusted server
 * context (SECURITY.md section 2: "Authorization must be enforced at
 * trusted server/database layers, not by hiding UI") rather than only
 * clearing something in the browser.
 */
export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
