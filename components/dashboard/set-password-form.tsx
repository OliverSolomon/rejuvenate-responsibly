"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";

/** Kept the same as the server's check, so the form never promises what it refuses. */
const MIN = 10;

/**
 * Choosing a password.
 *
 * Reached from an invitation link, which signs the person in for long enough to
 * get here, and reachable afterwards by anyone who wants to change theirs. The
 * change goes straight to Supabase as the signed-in person: nothing passes
 * through the application, so no route of ours ever sees a password being set
 * by its owner.
 */
export function SetPasswordForm({ firstTime }: { firstTime: boolean }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const tooShort = password.length > 0 && password.length < MIN;
  const mismatch = again.length > 0 && again !== password;
  const ready = password.length >= MIN && again === password && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { error: authError } = await createClient().auth.updateUser({ password });
      if (authError) throw authError;
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "The password was not accepted. Try again, or ask for a fresh link.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-card border border-forest-900/10 bg-bone-50 p-6 sm:p-8">
        <p className="display text-[1.125rem]">That is set</p>
        <p className="mt-2 max-w-[52ch] text-[0.9375rem] leading-relaxed text-forest-900/65">
          You can sign in with your email address and this password from now on.
        </p>
        <div className="mt-6">
          <Button variant="primary" size="md" arrow onClick={() => router.push("/dashboard")}>
            Open the dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-card border border-forest-900/10 bg-bone-50 p-6 sm:p-8"
    >
      <p className="max-w-[56ch] text-[0.9375rem] leading-relaxed text-forest-900/65">
        {firstTime
          ? "Choose a password and you are in. It needs at least ten characters; a few words strung together beat something short and clever."
          : "Choose a new password. It needs at least ten characters; a few words strung together beat something short and clever."}
      </p>

      <div className="mt-6 flex max-w-md flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[0.8125rem] font-medium text-forest-900/70">New password</span>
          <input
            type="password"
            value={password}
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 rounded-xl border border-forest-900/15 bg-bone-100 px-4 text-[0.9375rem]"
          />
          {tooShort && (
            <span className="text-[0.75rem] text-forest-900/50">
              {MIN - password.length} more {MIN - password.length === 1 ? "character" : "characters"}{" "}
              to go.
            </span>
          )}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[0.8125rem] font-medium text-forest-900/70">Again</span>
          <input
            type="password"
            value={again}
            autoComplete="new-password"
            onChange={(e) => setAgain(e.target.value)}
            className="h-12 rounded-xl border border-forest-900/15 bg-bone-100 px-4 text-[0.9375rem]"
          />
          {mismatch && (
            <span className="text-[0.75rem] text-clay-500">These two do not match.</span>
          )}
        </label>

        {error && <p className="text-[0.875rem] text-clay-500">{error}</p>}

        <div className="mt-1">
          <Button type="submit" variant="primary" size="lg" arrow disabled={!ready}>
            {busy ? "Saving..." : firstTime ? "Set my password" : "Change my password"}
          </Button>
        </div>
      </div>
    </form>
  );
}
