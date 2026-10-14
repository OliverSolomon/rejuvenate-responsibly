import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";

/** Where Supabase returns people after Google, or after a magic link. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  // Only ever redirect inside this site. An open redirect here would be a gift
  // to anyone phishing Carol's team.
  const destination = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/signin?error=missing_code", url.origin));
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
  } catch {
    return NextResponse.redirect(new URL("/signin?error=exchange_failed", url.origin));
  }

  return NextResponse.redirect(new URL(destination, url.origin));
}
