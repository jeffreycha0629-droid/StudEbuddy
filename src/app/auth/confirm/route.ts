import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Handles Supabase email confirmation links. Currently only used by
 * password recovery (Feature 5), but written generically since Supabase
 * uses this same token_hash + type pattern for signup confirmation,
 * invites, and email changes too.
 *
 * Supabase's own server verifies the link first. If it's still valid, it
 * forwards the browser here with a one-time token_hash + type for us to
 * redeem via verifyOtp() and establish a real session, then we redirect
 * to `next`. If the link already expired or was already used, Supabase
 * redirects here WITHOUT a token_hash (with error details instead) — we
 * treat that the same as a failed verification: no session gets
 * established, and /reset-password's own check (no session = show
 * "invalid or expired") handles telling the user.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  if (tokenHash && type) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      redirect(next);
    }
  }

  redirect("/reset-password");
}
