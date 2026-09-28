"use client";

import { useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { LogoMark } from "@/components/ui/logo";
import { Container } from "@/components/ui/section";
import { renderMarkdown } from "@/lib/rmi/markdown";
import { site } from "@/lib/site";

type Report = { markdown: string; model: string; generatedAt: string };

export function ReportView({ id, token }: { id?: string; token?: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const missingLink = !id || !token;

  useEffect(() => {
    if (!id || !token) return;
    (async () => {
      const res = await fetch(
        `/api/rmi/report?id=${encodeURIComponent(id)}&t=${encodeURIComponent(token)}`,
      );
      if (res.ok) setReport(await res.json());
      else setError((await res.json())?.error ?? "No report has been generated yet.");
    })();
  }, [id, token]);

  async function regenerate() {
    if (!id || !token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/rmi/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, token, force: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "The report could not be rebuilt.");
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The report could not be rebuilt.");
    }
    setBusy(false);
  }

  if ((error || missingLink) && !report) {
    const message = missingLink ? "This link is missing its reference." : error;
    return (
      <div className="bg-bone-100 pt-32 pb-28">
        <Container size="default">
          <div className="mx-auto max-w-xl">
            <h1 className="display text-[clamp(2rem,4.6vw,3rem)]">No report yet</h1>
            <p className="mt-4 text-[1.0625rem] leading-relaxed text-forest-900/65">{message}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/rmi/resume" size="lg">
                Open my assessment
              </ButtonLink>
              {id && token && (
                <Button variant="ghost" size="lg" onClick={regenerate} disabled={busy}>
                  {busy ? "Writing..." : "Generate it now"}
                </Button>
              )}
            </div>
          </div>
        </Container>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-bone-100 text-forest-900/45">
        <p className="text-sm">Opening your report...</p>
      </div>
    );
  }

  return (
    <div className="bg-bone-100 pt-28 pb-24 print:bg-white print:pt-0">
      <Container size="default">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 pb-6 print:hidden">
          <p className="text-[0.8125rem] text-forest-900/50">
            Generated {new Date(report.generatedAt).toLocaleDateString(undefined, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => window.print()}>
              Print or save as PDF
            </Button>
            <Button variant="ghost" size="sm" onClick={regenerate} disabled={busy}>
              {busy ? "Rebuilding..." : "Rebuild"}
            </Button>
          </div>
        </div>

        {/* Letterhead */}
        <article className="mx-auto max-w-3xl rounded-card border border-forest-900/10 bg-bone-50 px-6 py-10 shadow-[0_24px_60px_-40px_rgba(8,23,15,0.4)] sm:px-14 sm:py-14 print:rounded-none print:border-0 print:px-0 print:shadow-none">
          <header className="flex items-start justify-between gap-6 border-b border-forest-900/12 pb-8">
            <div className="flex items-center gap-3">
              <LogoMark className="h-11 w-11" />
              <span className="flex flex-col leading-[1.05] text-forest-900">
                <span className="font-display text-[0.9rem] font-semibold uppercase tracking-[0.01em]">
                  Rejuvenate
                </span>
                <span className="font-display text-[0.9rem] font-semibold uppercase tracking-[0.01em]">
                  Responsibly
                </span>
              </span>
            </div>
            <div className="text-right text-[0.75rem] leading-relaxed text-forest-900/50">
              <p>{site.location}</p>
              <p>{site.email}</p>
            </div>
          </header>

          <div
            className="report-body mt-10"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(report.markdown) }}
          />

          {/* Issued by seal */}
          <footer className="mt-14 flex items-center justify-between gap-6 border-t border-forest-900/12 pt-8">
            <div className="text-[0.75rem] leading-relaxed text-forest-900/50">
              <p>Framework: NSE Kenya ESG Disclosure Manual and GRI Standards</p>
              <p className="mt-1">
                This report is issued on the basis of self-declared responses and the
                stakeholder survey. It is not an audit.
              </p>
            </div>
            <div className="grid h-24 w-24 shrink-0 place-items-center rounded-full border-2 border-forest-700 text-center">
              <div>
                <p className="text-[0.5rem] uppercase tracking-[0.18em] text-forest-700">
                  Issued by
                </p>
                <LogoMark className="mx-auto mt-1 h-7 w-7" />
                <p className="mt-1 text-[0.5rem] uppercase tracking-[0.14em] text-forest-700">
                  Rejuvenate
                </p>
              </div>
            </div>
          </footer>
        </article>
      </Container>
    </div>
  );
}
