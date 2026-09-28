"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ResumeForm() {
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "working" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setState("working");
    setError(null);
    try {
      const res = await fetch("/api/rmi/resume", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "We could not find that reference.");
      setState("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We could not find that reference.");
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <div className="mt-10 rounded-card border border-forest-900/12 bg-lime-50 p-6">
        <h2 className="display text-xl">Check your inbox</h2>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-forest-900/70">
          If that reference exists, the link is on its way to the email address on the
          assessment. We do not say which address, so nobody can use this form to find out
          who owns a reference.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10 flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-[0.8125rem] font-medium text-forest-900/70">
          Assessment reference
        </span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="RMI-7F3K2Q"
          autoComplete="off"
          spellCheck={false}
          className="h-13 rounded-xl border border-forest-900/15 bg-bone-50 px-4 font-[family-name:var(--font-serif)] text-xl tracking-wide text-forest-900 uppercase"
        />
      </label>

      {error && (
        <p className="rounded-xl border border-clay-400/30 bg-clay-400/8 p-3 text-[0.875rem] text-clay-500">
          {error}
        </p>
      )}

      <div>
        <Button
          variant="primary"
          size="lg"
          arrow
          disabled={code.trim().length < 4 || state === "working"}
          onClick={submit}
        >
          {state === "working" ? "Looking..." : "Email me my link"}
        </Button>
      </div>
    </div>
  );
}
