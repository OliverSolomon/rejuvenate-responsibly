"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

const REASONS: Record<string, string> = {
  unconfigured:
    "The dashboard is not connected to Supabase yet, so there is no way to tell who you are. Set the Supabase keys and try again.",
  missing_code: "That link came back without anything to verify. Sign in below, or ask for a fresh invitation.",
  exchange_failed: "That link could not be verified. It may have been used already or expired. Ask for a fresh invitation.",
  link_expired:
    "That invitation has expired. Ask an owner on the team to send you another one.",
  denied:
    "That account is signed in but is not on the dashboard list. Ask an owner on the team to add you.",
};

export function SignInForm({ reason, next }: { reason?: string; next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<null | "password">(null);
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

  return (
    <div className="mt-10">
      {error && (
        <p className="mb-6 rounded-2xl border border-clay-400/30 bg-clay-400/8 p-4 text-[0.875rem] leading-relaxed text-clay-500">
          {error}
        </p>
      )}

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
