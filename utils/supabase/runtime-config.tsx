import { SUPABASE_CONFIG_ID, SUPABASE_KEY, SUPABASE_URL } from "./env";

/**
 * Hands the browser its Supabase settings when the page is served.
 *
 * Next compiles NEXT_PUBLIC_ variables into the browser bundle while the site
 * is being built, so a self-hosted deployment that only has them in the
 * server's environment ships a browser bundle with nothing to connect to, and
 * sign-in fails with the Supabase client's own complaint about a missing URL
 * and key. Server code reads the same variables at request time, which is why
 * the dashboard gate works on a deployment where sign-in does not.
 *
 * Writing them into the page closes that gap. The build no longer has to know
 * anything, and setting them on the server is enough. Both values are public
 * by design: the key is in every signed-in visitor's browser already, and what
 * protects the data is row level security, not secrecy.
 */
export function SupabaseRuntimeConfig() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  // Escaped so the JSON can never close the script tag early.
  const json = JSON.stringify({ url: SUPABASE_URL, key: SUPABASE_KEY }).replace(
    /</g,
    "\\u003c",
  );

  return (
    <script
      id={SUPABASE_CONFIG_ID}
      type="application/json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
