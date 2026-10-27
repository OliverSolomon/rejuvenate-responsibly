import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ENV_HINT, SUPABASE_KEY, SUPABASE_URL, supabaseConfigured } from "./env";

export { supabaseConfigured };

export async function createClient() {
  const cookieStore = await cookies();
  const url = SUPABASE_URL;
  const key = SUPABASE_KEY;

  if (!url || !key) {
    throw new Error(`Supabase is not configured. ${SUPABASE_ENV_HINT}`);
  }

  return createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component. The proxy refreshes the session,
          // so there is nothing to do here.
        }
      },
    },
  });
}

/**
 * `super` is the one account that sees every company and holds the keys the
 * whole installation shares. Other admins cannot see that the role exists.
 */
export type TeamRole = "super" | "owner" | "admin";

export type DashboardUser = {
  id: string;
  email: string;
  name: string | null;
  /** Owners manage the team; admins do everything else. */
  role: TeamRole;
  /** Which company they work for. */
  companyId: string;
  /** When this sign-in began, which is what "since you signed in" is measured from. */
  signedInAt: string | null;
};

/**
 * Who is allowed into the dashboard.
 *
 * Signing in is not the same as being let in. Access needs a row in
 * `rmi_admins`, so an account that exists in Supabase but was never added to
 * the team reads nothing. Anything unexpected returns null: this fails closed,
 * including the role, which falls back to the lesser of the two.
 */
export async function getDashboardUser(): Promise<DashboardUser | null> {
  if (!supabaseConfigured()) return null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return null;

    const { data, error } = await supabase
      .from("rmi_admins")
      .select("id, email, full_name, role, company_id")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      email: data.email,
      name: data.full_name,
      // Anything unrecognised falls to the least privileged of the three.
      role: data.role === "super" ? "super" : data.role === "owner" ? "owner" : "admin",
      companyId: data.company_id || "default",
      signedInAt: user.last_sign_in_at ?? null,
    };
  } catch {
    return null;
  }
}
