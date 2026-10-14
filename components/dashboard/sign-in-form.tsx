"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

const REASONS: Record<string, string> = {
  unconfigured:
    "The dashboard is not connected to Supabase yet, so there is no way to tell who you are. Set the Supabase keys and try again.",
  missing_code: "That sign in link came back without a code. Start again below.",
  exchange_failed: "We could not finish signing you in. Start again below.",
  denied:
    "That account is signed in but is not on the dashboard list. Ask whoever set this up to add you.",
};

export function SignInForm({ reason, next }: { reason?: string; next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<null | "password" | "google">(null);
  const [error, setError] = useState<string | null>(reason ? (REASONS[reason] ?? null) : null);

  const destination = next && next.startsWith("/") ? next : "/dashboard";
  const ready = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && password.length >= 6;

  async function withPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy("password");
    setError(null);
    try {
      const { error: authError } = await createClient().auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;
      router.push(destination);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Those details were not accepted.");
      setBusy(null);
    }
  }

  async function withGoogle() {
    setBusy("google");
    setError(null);
    try {
      const { error: authError } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
        },
      });
      if (authError) throw authError;
      // The browser leaves for Google, so there is nothing to do here.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign in did not start.");
      setBusy(null);
    }
  }

  return (
    <div className="mt-10">
      {error && (
        <p className="mb-6 rounded-2xl border border-clay-400/30 bg-clay-400/8 p-4 text-[0.875rem] leading-relaxed text-clay-500">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={withGoogle}
        disabled={busy !== null}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-forest-900/15 bg-bone-50 text-[0.9375rem] font-medium text-forest-900 transition-colors hover:border-forest-900/40 disabled:opacity-50"
      >
        <svg viewBox="0 0 18 18" aria-hidden className="h-4.5 w-4.5">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
        </svg>
        {busy === "google" ? "Opening Google..." : "Continue with Google"}
      </button>

      <div className="my-7 flex items-center gap-4">
        <span className="h-px flex-1 bg-forest-900/12" />
        <span className="text-[0.75rem] tracking-wide text-forest-900/40 uppercase">or</span>
        <span className="h-px flex-1 bg-forest-900/12" />
      </div>

      <form onSubmit={withPassword} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[0.8125rem] font-medium text-forest-900/70">Email</span>
          <input
            type="email"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 rounded-xl border border-forest-900/15 bg-bone-50 px-4 text-[0.9375rem]"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[0.8125rem] font-medium text-forest-900/70">Password</span>
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl border border-forest-900/15 bg-bone-50 px-4 text-[0.9375rem]"
          />
        </label>
        <div className="mt-2">
          <Button type="submit" variant="primary" size="lg" arrow disabled={!ready || busy !== null}>
            {busy === "password" ? "Signing in..." : "Sign in"}
          </Button>
        </div>
      </form>
    </div>
  );
}
