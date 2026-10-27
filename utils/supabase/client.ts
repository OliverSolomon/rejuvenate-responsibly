"use client";

import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_CONFIG_ID, SUPABASE_KEY, SUPABASE_URL } from "./env";

let client: ReturnType<typeof createBrowserClient> | undefined;

/**
 * The settings the server wrote into the page, for deployments where the build
 * had none to compile in. See `runtime-config.tsx`.
 */
function fromPage(): { url?: string; key?: string } {
  if (typeof document === "undefined") return {};
  const text = document.getElementById(SUPABASE_CONFIG_ID)?.textContent;
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return { url: parsed?.url, key: parsed?.key };
  } catch {
    return {};
  }
}

export function createClient() {
  if (client) return client;

  const page = fromPage();
  const url = SUPABASE_URL || page.url;
  const key = SUPABASE_KEY || page.key;

  if (!url || !key) {
    // Said in plain words, because this surfaces on the sign-in form and the
    // Supabase client's own version of it says nothing about what to do.
    throw new Error(
      "Sign in is not configured on this deployment. The Supabase URL and key are missing.",
    );
  }

  client = createBrowserClient(url, key);
  return client;
}
