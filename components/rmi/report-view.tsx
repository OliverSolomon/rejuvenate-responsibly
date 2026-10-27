"use client";

import { useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/section";

type Report = {
  markdown: string;
  model: string;
  generatedAt: string;
  sentAt?: string;
  /** The whole document, letterhead and all, as the client was sent it. */
  documentHtml: string | null;
  expired: boolean;
  expiresAt: string | null;
  hasPdf: boolean;
};

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export function ReportView({ id, token }: { id?: string; token?: string }) {
  const frame = useRef<HTMLIFrameElement>(null);
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
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 pb-6 print:hidden">
          <div>
            <p className="text-[0.8125rem] text-forest-900/50">
              {report.sentAt
                ? `Issued ${longDate(report.sentAt)}`
                : `Written ${longDate(report.generatedAt)}`}
              {report.expiresAt && !report.expired ? ` · valid until ${longDate(report.expiresAt)}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {report.hasPdf && id && token && (
              <ButtonLink
                href={`/api/rmi/report/pdf?id=${encodeURIComponent(id)}&t=${encodeURIComponent(token)}`}
                variant="ghost"
                size="sm"
              >
                Download the PDF
              </ButtonLink>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => frame.current?.contentWindow?.print() ?? window.print()}
            >
              Print
            </Button>
            <Button variant="ghost" size="sm" onClick={regenerate} disabled={busy}>
              {busy ? "Rebuilding..." : "Rebuild"}
            </Button>
          </div>
        </div>

        {report.expired && (
          <div className="mx-auto mb-6 max-w-4xl rounded-card border border-clay-400/40 bg-clay-400/10 p-5 print:hidden">
            <p className="display text-[1.0625rem] text-clay-500">This report has expired</p>
            <p className="mt-2 max-w-[62ch] text-[0.875rem] leading-relaxed text-forest-900/70">
              It covers the assessment as it stood when it was issued and stopped being current
              {report.expiresAt ? ` on ${longDate(report.expiresAt)}` : " a year later"}. You can
              still read it and download it, and the document is marked expired. A new assessment
              is what gives an up to date position.
            </p>
            <div className="mt-4">
              <ButtonLink href="/rmi" variant="ghost" size="sm">
                Start a new assessment
              </ButtonLink>
            </div>
          </div>
        )}

        {/*
          The document itself, in an iframe. It carries its own letterhead,
          footer and styling from the template an admin published, so it is
          kept away from the site's own CSS and what is on screen is what
          prints and what was attached to the email.
        */}
        {report.documentHtml ? (
          <iframe
            ref={frame}
            title="Your impact report"
            srcDoc={report.documentHtml}
            className="mx-auto block h-[1400px] w-full max-w-4xl rounded-card border border-forest-900/10 bg-white shadow-[0_24px_60px_-40px_rgba(8,23,15,0.4)] print:h-auto print:rounded-none print:border-0 print:shadow-none"
          />
        ) : (
          <p className="mx-auto max-w-3xl text-[0.9375rem] text-forest-900/60">
            This report could not be laid out. Please get in touch and we will send it over.
          </p>
        )}
      </Container>
    </div>
  );
}
