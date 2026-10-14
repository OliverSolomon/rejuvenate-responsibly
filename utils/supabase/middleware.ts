import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

/**
 * Keeps the Supabase session cookie fresh and turns away anyone without one.
 *
 * Only /dashboard is gated. The rest of the site, including the assessment
 * itself, is deliberately open: clients reach their assessment through an
 * emailed link, not an account.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = SUPABASE_URL;
  const key = SUPABASE_KEY;
  const path = request.nextUrl.pathname;
  const guarded = path === "/dashboard" || path.startsWith("/dashboard/");

  if (!url || !key) {
    // Without Supabase there is no way to tell an admin from a stranger, so
    // the dashboard stays shut rather than falling open.
    if (guarded) {
      const to = request.nextUrl.clone();
      to.pathname = "/signin";
      to.searchParams.set("error", "unconfigured");
      return NextResponse.redirect(to);
    }
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Do not put anything between createServerClient and getUser: it is what
  // refreshes the token, and skipping it logs people out at random.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (guarded && !user) {
    const to = request.nextUrl.clone();
    to.pathname = "/signin";
    to.searchParams.set("next", path);
    return NextResponse.redirect(to);
  }

  return response;
}
