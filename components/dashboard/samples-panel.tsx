"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { SampleCase } from "@/lib/rmi/samples";

export function SamplesPanel({
  cases,
  loaded,
}: {
  cases: SampleCase[];
  loaded: { assessments: number; responses: number };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "load" | "remove">(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOff, setConfirmOff] = useState(false);

  async function run(kind: "load" | "remove") {
    setBusy(kind);
    setError(null);
    setConfirmOff(false);
    try {
      const res = await fetch("/api/dashboard/samples", {
        method: kind === "load" ? "POST" : "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "That did not work.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work.");
    } finally {
      setBusy(null);
    }
  }

  const on = loaded.assessments > 0;

  return (
    <section className="rounded-card border border-forest-900/10 bg-bone-50 p-6 sm:p-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="display text-[1.375rem]">Sample submissions</h2>
          <p className="mt-2 max-w-[62ch] text-[0.875rem] leading-relaxed text-forest-900/60">
            {cases.length} invented organisations for trying the dashboard and the report flow. They
            appear in Analytics, Responses and the delivery alerts, each marked [Sample].{" "}
            <strong>Turning this off removes every sample submission</strong> from the database.
            Real submissions are never touched. All their addresses are on example.org and no email
            is sent.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Sample submissions"
          disabled={busy !== null}
          onClick={() => (on ? setConfirmOff(true) : void run("load"))}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
            on ? "bg-forest-900" : "bg-forest-900/25"
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-bone-50 transition-all ${
              on ? "left-6" : "left-1"
            }`}
          />
        </button>
      </div>

      <p className="mt-4 text-[0.8125rem] text-forest-900/55" role="status">
        {busy === "load"
          ? "Loading the samples..."
          : busy === "remove"
            ? "Removing every sample submission..."
            : on
              ? `On. ${loaded.assessments} assessments and ${loaded.responses} stakeholder responses loaded.`
              : "Off. No sample submissions in the database."}
      </p>

      {confirmOff && (
        <div className="mt-4 rounded-2xl border border-clay-400/30 bg-clay-400/8 p-4">
          <p className="text-[0.875rem] text-forest-900">
            Remove all {loaded.assessments} sample submissions and their {loaded.responses}{" "}
            responses, reports and invitations?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" size="md" onClick={() => run("remove")}>
              Remove all samples
            </Button>
            <Button variant="ghost" size="md" onClick={() => setConfirmOff(false)}>
              Keep them
            </Button>
          </div>
        </div>
      )}

      {on && !confirmOff && (
        <div className="mt-4">
          <Button variant="ghost" size="md" disabled={busy !== null} onClick={() => run("load")}>
            Reset the samples
          </Button>
        </div>
      )}
      {error && <p className="mt-3 text-[0.875rem] text-clay-500">{error}</p>}

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left text-[0.8125rem]">
          <thead>
            <tr className="border-b border-forest-900/10 text-forest-900/50">
              <th className="py-2 pr-4 font-medium">Reference</th>
              <th className="py-2 pr-4 font-medium">Case</th>
              <th className="py-2 font-medium">What it exercises</th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id} className="border-b border-forest-900/6 align-top">
                <td className="py-2.5 pr-4 font-mono text-[0.75rem] text-forest-900/60">{c.id}</td>
                <td className="py-2.5 pr-4 font-medium text-forest-900">{c.title}</td>
                <td className="py-2.5 leading-relaxed text-forest-900/65">{c.covers}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
