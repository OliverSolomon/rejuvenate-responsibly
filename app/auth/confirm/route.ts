import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

/**
 * Where an invitation link lands.
 *
 * The token is verified here rather than by Supabase's own hosted page, which
 * is why the invitation can be sent through Mailtrap like every other message
 * the site sends, with the same switch governing it. Verifying signs the person
 * in once, which is enough to let them choose a password.
 */

const TYPES: EmailOtpType[] = ["invite", "recovery", "email", "email_change"];

function isType(value: string | null): value is EmailOtpType {
  return Boolean(value && (TYPES as string[]).includes(value));
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = url.searchParams.get("next") ?? "/dashboard/set-password";

  // Only ever redirect inside this site. An open redirect here would be a gift
  // to anyone phishing the team.
  const destination = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (!tokenHash || !isType(type)) {
    return NextResponse.redirect(new URL("/signin?error=missing_code", url.origin));
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) throw error;
  } catch {
    // Used already, expired, or tampered with. All the same to the person
    // holding it: they need a new one.
    return NextResponse.redirect(new URL("/signin?error=link_expired", url.origin));
  }

  return NextResponse.redirect(new URL(destination, url.origin));
}
