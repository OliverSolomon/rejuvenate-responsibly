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

  async function run(kind: "load" | "remove") {
    setBusy(kind);
    setError(null);
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

  const present = loaded.assessments > 0;

  return (
    <section className="rounded-card border border-forest-900/10 bg-bone-50 p-6 sm:p-8">
      <h2 className="display text-[1.375rem]">Sample submissions</h2>
      <p className="mt-2 max-w-[62ch] text-[0.875rem] leading-relaxed text-forest-900/60">
        {cases.length} invented organisations that between them cover every payment state, tier,
        stage of stakeholder response and report state, plus the awkward inputs. They are flagged,
        so removing them leaves real records alone. Loading again replaces the set. Every address is
        on example.org and no email is sent.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button variant="primary" size="md" disabled={busy !== null} onClick={() => run("load")}>
          {busy === "load" ? "Loading..." : present ? "Reload samples" : "Load samples"}
        </Button>
        {present && (
          <Button variant="ghost" size="md" disabled={busy !== null} onClick={() => run("remove")}>
            {busy === "remove" ? "Removing..." : "Remove samples"}
          </Button>
        )}
        <span className="text-[0.8125rem] text-forest-900/50">
          {present
            ? `${loaded.assessments} assessments and ${loaded.responses} stakeholder responses loaded`
            : "None loaded"}
        </span>
      </div>
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
