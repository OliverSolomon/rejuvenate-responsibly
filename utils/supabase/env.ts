/**
 * Where the Supabase settings come from.
 *
 * Supabase now calls the browser key a publishable key (`sb_publishable_...`)
 * and older projects still call it the anon key. Both names are read, the new
 * one first, so a project set up either way works without edits.
 *
 * Each reference is written out in full because Next replaces NEXT_PUBLIC_
 * variables by matching the literal text; a lookup built at runtime would come
 * back empty in the browser.
 *
 * Server code reads these when a request arrives, so having them in the
 * server's environment is enough for the dashboard gate. The browser is the
 * awkward half: Next compiles the values into its bundle while the site is
 * being built, so a build that did not have them ships a bundle with nothing
 * to connect to, however well the server is configured. That is what
 * `SupabaseRuntimeConfig` is for.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const SUPABASE_ENV_HINT =
  "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.";

/** The id of the script tag the server writes the browser's copy into. */
export const SUPABASE_CONFIG_ID = "supabase-config";

export function supabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}
