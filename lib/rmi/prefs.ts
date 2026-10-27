import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DashboardPrefs } from "@/utils/supabase/server";

/**
 * How each person last left the dashboard: demo or live, which companies they
 * were looking at, and which notices they closed.
 *
 * It lives on their own account, in the user metadata Supabase already keeps,
 * so it follows them across browsers and sign-ins and needs no table of its own.
 * It is how someone looks, not a fact about the company, so nobody else's view
 * is touched. Writing needs the service role key, as adding a person does.
 */

let client: SupabaseClient | null = null;

function admin(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

/** What a request may change. `dismiss` adds one notice to the closed ones. */
export type PrefsPatch = {
  mode?: "live" | "demo";
  /** A company id, or "all". */
  view?: string;
  dismiss?: string;
};

/** Merge a change into someone's saved preferences. Returns false when it could not be kept. */
export async function savePrefs(userId: string, patch: PrefsPatch): Promise<boolean> {
  const db = admin();
  if (!db) return false;

  const { data, error } = await db.auth.admin.getUserById(userId);
  if (error || !data.user) return false;

  const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
  const current = (meta.rmi_prefs ?? {}) as DashboardPrefs;
  const next: DashboardPrefs = { ...current };

  if (patch.mode) next.mode = patch.mode;
  if (patch.view) next.view = patch.view;
  if (patch.dismiss) {
    // A cap keeps the metadata small however long someone has used the dashboard.
    next.dismissed = [...new Set([...(current.dismissed ?? []), patch.dismiss])].slice(-50);
  }

  const saved = await db.auth.admin.updateUserById(userId, {
    user_metadata: { ...meta, rmi_prefs: next },
  });
  return !saved.error;
}
