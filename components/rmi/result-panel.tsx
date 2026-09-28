"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScoreDial } from "./score-dial";
import { ShareStep } from "./share-step";
import { Button } from "@/components/ui/button";
import type { ScoreResult } from "@/lib/rmi/scoring";
import type { Profile, Session } from "./use-assessment";

export function ResultPanel({
  result,
  profile,
  audience,
  session,
  error,
  onRetry,
}: {
  result: ScoreResult;
  profile: Profile;
  audience: "client" | "stakeholder";
  session: Session | null;
  error: string | null;
  onRetry: () => void;
}) {
  const router = useRouter();
  const [report, setReport] = useState<{ state: "idle" | "working" | "done" | "failed"; message?: string }>({
    state: "idle",
  });

  async function generate() {
    if (!session) return;
    setReport({ state: "working" });
    try {
      const res = await fetch("/api/rmi/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: session.id, token: session.token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "The report could not be generated.");
      setReport({ state: "done" });
      router.push(`/rmi/report?id=${session.id}&t=${session.token}`);
    } catch (err) {
      setReport({
        state: "failed",
        message: err instanceof Error ? err.message : "The report could not be generated.",
      });
    }
  }

  if (!result) return null;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <p className="eyebrow text-forest-900/45">
        {audience === "client" ? "Step 1 complete" : "Thank you"}
      </p>
      <h1 className="display mt-4 text-[clamp(2rem,4.6vw,3rem)]">
        {audience === "client"
          ? `${profile.organisation || "Your organisation"} scores ${Math.round(result.overall)} out of 100`
          : "Your responses are in"}
      </h1>

      {audience === "stakeholder" ? (
        <p className="mt-5 max-w-[54ch] text-[1.0625rem] leading-relaxed text-forest-900/65">
          Thanks for taking the time. Your answers go into the consolidated report
          alongside the other stakeholders, and nothing is attributed to you by name.
          You can close this tab.
        </p>
      ) : (
        <>
          <p className="mt-5 max-w-[54ch] text-[1.0625rem] leading-relaxed text-forest-900/65">
            This is your provisional self-assessment score. It moves once your
            stakeholders answer their survey, and our team reviews the evidence behind
            each answer before the final report is issued.
          </p>

          {error && (
            <div className="mt-8 rounded-2xl border border-clay-400/30 bg-clay-400/8 p-4">
              <p className="text-[0.875rem] text-clay-500">{error}</p>
              <Button variant="ghost" size="sm" className="mt-3" onClick={onRetry}>
                Try submitting again
              </Button>
            </div>
          )}

          <div className="mt-12 grid gap-10 rounded-card border border-forest-900/10 bg-bone-50 p-6 sm:p-9 lg:grid-cols-[auto_1fr] lg:items-center">
            <div className="flex flex-col items-center gap-4">
              <ScoreDial value={result.overall} size={200} />
              <span className="rounded-full bg-lime-100 px-4 py-1.5 text-[0.8125rem] font-medium text-forest-700">
                {result.tier.name} tier · {result.tier.level}
              </span>
            </div>
            <div className="flex flex-col gap-6">
              <p className="text-[0.9375rem] leading-relaxed text-forest-900/65">
                {result.tier.blurb}
              </p>
              <dl className="grid grid-cols-2 gap-6 border-t border-forest-900/10 pt-6">
                <div>
                  <dt className="text-[0.75rem] text-forest-900/45">Coverage</dt>
                  <dd className="font-[family-name:var(--font-serif)] text-3xl">
                    {Math.round(result.coverage)}
                  </dd>
                  <p className="text-[0.75rem] text-forest-900/45">
                    Practices you have in place
                  </p>
                </div>
                <div>
                  <dt className="text-[0.75rem] text-forest-900/45">Depth</dt>
                  <dd className="font-[family-name:var(--font-serif)] text-3xl">
                    {Math.round(result.depth)}
                  </dd>
                  <p className="text-[0.75rem] text-forest-900/45">
                    Practices with evidence behind them
                  </p>
                </div>
              </dl>
            </div>
          </div>

          <h2 className="display mt-16 text-2xl">Pillar by pillar</h2>
          <ul className="mt-6 flex flex-col divide-y divide-forest-900/8 border-y border-forest-900/8">
            {result.sections.map((s) => (
              <li key={s.id} className="flex items-center gap-4 py-4">
                <span className="w-32 shrink-0 text-[0.9375rem] text-forest-900/75">
                  {s.short}
                </span>
                <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-forest-900/8">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-forest-700 transition-[width] duration-700"
                    style={{ width: `${s.score}%` }}
                  />
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-lime-500/60"
                    style={{ width: `${s.coverage}%`, mixBlendMode: "multiply" }}
                  />
                </span>
                <span className="w-16 shrink-0 text-right font-[family-name:var(--font-serif)] text-xl tabular-nums">
                  {Math.round(s.score)}
                </span>
                <span className="hidden w-24 shrink-0 text-right text-[0.8125rem] text-forest-900/45 sm:block">
                  {s.level}
                </span>
              </li>
            ))}
          </ul>

          {result.gaps.length > 0 && (
            <>
              <h2 className="display mt-16 text-2xl">Your heaviest gaps</h2>
              <p className="mt-3 max-w-[54ch] text-[0.9375rem] text-forest-900/60">
                Ranked by the weight each indicator carries in the score. These are where
                the consulting conversation usually starts.
              </p>
              <ol className="mt-6 flex flex-col gap-3">
                {result.gaps.slice(0, 5).map((g, i) => (
                  <li
                    key={g.topic + i}
                    className="flex gap-4 rounded-2xl border border-forest-900/10 bg-bone-50 p-4"
                  >
                    <span className="font-[family-name:var(--font-serif)] text-xl text-forest-900/35">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <p className="font-medium text-forest-900">{g.topic}</p>
                      <p className="mt-1 text-[0.875rem] leading-snug text-forest-900/55">
                        {g.question}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}

          <div className="mt-16 rounded-card bg-forest-900 p-7 text-bone-100 sm:p-10 dark-panel">
            <p className="eyebrow text-bone-100/45">Next</p>
            <h2 className="display mt-3 text-[clamp(1.5rem,3vw,2.2rem)] text-bone-50">
              Share it with the other parties
            </h2>
            <div className="mt-6">
              <ShareStep session={session} />
            </div>
          </div>

          <div className="mt-6 rounded-card border border-forest-900/12 bg-bone-50 p-7 sm:p-9">
            <h2 className="display text-[clamp(1.4rem,2.6vw,1.9rem)]">Your report</h2>
            <p className="mt-3 max-w-[54ch] text-[0.9375rem] leading-relaxed text-forest-900/65">
              We consolidate your answers and the stakeholder responses into a written
              report on letterhead, carrying the Issued by seal. Generate it now to see a
              draft, or wait until your stakeholders have answered so the gap analysis has
              something to compare against.
            </p>

            {report.state === "failed" && (
              <p className="mt-5 rounded-2xl border border-clay-400/30 bg-clay-400/8 p-4 text-[0.875rem] text-clay-500">
                {report.message}
              </p>
            )}

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                size="lg"
                arrow
                onClick={generate}
                disabled={!session || report.state === "working"}
              >
                {report.state === "working" ? "Writing your report..." : "Generate my report"}
              </Button>
              <Link
                href="/contact"
                className="text-[0.875rem] text-forest-900/60 underline-offset-4 hover:underline"
              >
                Talk to a consultant first
              </Link>
            </div>
            {report.state === "working" && (
              <p className="mt-4 text-[0.8125rem] text-forest-900/45">
                This takes up to a minute. Leave the tab open.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
