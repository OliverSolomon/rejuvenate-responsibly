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
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const SUPABASE_ENV_HINT =
  "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.";

export function supabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}
