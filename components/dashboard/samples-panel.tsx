"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { SampleCase } from "@/lib/rmi/samples";

export function SamplesPanel({
  cases,
  loaded,
  hidden: initialHidden,
}: {
  cases: SampleCase[];
  loaded: { assessments: number; responses: number };
  /** Loaded but kept out of every view. */
  hidden: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "load" | "remove" | "hide">(null);
  const [hidden, setHidden] = useState(initialHidden);
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

  /**
   * Hiding is not removing. It keeps the rows where they are and takes them out
   * of every view, which is how the dashboard can be seen as it will look with
   * only real work in it without throwing away something useful for testing.
   */
  async function toggleHidden(next: boolean) {
    setBusy("hide");
    setError(null);
    try {
      const res = await fetch("/api/dashboard/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ samplesHidden: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "That did not work.");
      }
      setHidden(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="rounded-card border border-forest-900/10 bg-bone-50 p-6 sm:p-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h2 className="display text-[1.375rem]">Sample submissions</h2>
          <p className="mt-2 max-w-[62ch] text-[0.875rem] leading-relaxed text-forest-900/60">
            {cases.length} invented organisations for trying the dashboard and the report flow. They
            appear in Analytics, Responses and the delivery alerts, each carrying a Sample status badge.{" "}
            <strong>Turning this off removes every sample submission</strong> from the database. To
            keep them but take them out of sight, use the switch below instead.
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

      {on && (
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-forest-900/10 bg-bone-100 p-4">
          <div>
            <p className="text-[0.875rem] font-medium text-forest-900">
              Hide them from every view
            </p>
            <p className="mt-1 max-w-[52ch] text-[0.8125rem] leading-relaxed text-forest-900/60">
              {hidden
                ? "Hidden. Analytics, Responses and the delivery alerts show only real work. The samples are still loaded and nothing has been deleted."
                : "Showing. Turn this on to see the dashboard as it will look with only real work in it, without removing anything."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={hidden}
            aria-label="Hide sample submissions"
            disabled={busy !== null}
            onClick={() => void toggleHidden(!hidden)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
              hidden ? "bg-forest-900" : "bg-forest-900/25"
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-bone-50 transition-all ${
                hidden ? "left-6" : "left-1"
              }`}
            />
          </button>
        </div>
      )}

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
