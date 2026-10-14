"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export type OutstandingParty = {
  name: string;
  email: string;
  relationship: string;
  /** The invitation itself never arrived, as opposed to simply not answered. */
  undelivered: boolean;
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/**
 * The report actions for one organisation.
 *
 * With no report yet it offers to write one from what has come in. With a
 * report it offers to send it, behind a confirmation that says plainly the
 * report is final and, when stakeholders are still out, who they are.
 */
export function SendReport({
  assessmentId,
  organisation,
  submitterName,
  submitterEmail,
  hasReport,
  canGenerate,
  invited,
  responded,
  outstanding,
  sentAt,
  sentBy,
  sentOutstanding,
  editedAfterSent,
}: {
  assessmentId: string;
  organisation: string;
  submitterName: string;
  submitterEmail: string;
  hasReport: boolean;
  canGenerate: boolean;
  invited: number;
  responded: number;
  outstanding: OutstandingParty[];
  sentAt: string | null;
  sentBy: string | null;
  sentOutstanding: number | null;
  editedAfterSent: boolean;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState<null | "send" | "generate">(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const incomplete = outstanding.length > 0;
  const sentBefore = Boolean(sentAt);

  // A fresh dialog each time: nothing ticked, no stale error.
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const reset = () => {
      setAcknowledged(false);
      setError(null);
    };
    el.addEventListener("close", reset);
    return () => el.removeEventListener("close", reset);
  }, []);

  async function post(kind: "send" | "generate") {
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/report/${assessmentId}/${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(kind === "send" ? { acknowledged } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "That did not work.");
      dialog.current?.close();
      setNotice(
        kind === "send"
          ? `Report sent to ${submitterEmail}.`
          : "Report written. Review it, then send it.",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work.");
    } finally {
      setBusy(null);
    }
  }

  if (!hasReport) {
    return (
      <div className="flex flex-col items-end gap-2">
        <Button
          variant="primary"
          size="md"
          disabled={!canGenerate || busy !== null}
          onClick={() => post("generate")}
        >
          {busy === "generate" ? "Writing the report..." : "Write report now"}
        </Button>
        {!canGenerate && (
          <p className="max-w-[28ch] text-right text-[0.75rem] text-forest-900/50">
            Available once the organisation has submitted.
          </p>
        )}
        {error && <p className="max-w-[36ch] text-right text-[0.8125rem] text-clay-500">{error}</p>}
        {notice && <p className="text-[0.8125rem] text-forest-700">{notice}</p>}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-end gap-2">
        <Button variant="primary" size="md" onClick={() => dialog.current?.showModal()}>
          {sentBefore ? "Send report again" : "Send report"}
        </Button>
        {notice && <p className="text-[0.8125rem] text-forest-700">{notice}</p>}
      </div>

      <dialog
        ref={dialog}
        aria-labelledby="send-report-title"
        className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-card border border-forest-900/15 bg-bone-50 p-0 text-forest-900 shadow-xl backdrop:bg-forest-950/50"
      >
        <div className="p-6 sm:p-8">
          <h2 id="send-report-title" className="display text-[1.375rem]">
            Send the final report?
          </h2>

          <p className="mt-3 text-[0.9375rem] leading-relaxed text-forest-900/75">
            You are sending the <strong>finalised report</strong> for {organisation} to{" "}
            {submitterName || "the submitter"} ({submitterEmail}). They get a link to it, and it is
            the version shown on this page, including any edits you have made.
          </p>

          {sentBefore && (
            <p className="mt-3 text-[0.8125rem] leading-relaxed text-forest-900/60">
              It was already sent on {fmt(sentAt!)}
              {sentBy ? ` by ${sentBy}` : ""}
              {sentOutstanding ? `, with ${sentOutstanding} answers outstanding` : ""}.
              {editedAfterSent ? " It has been edited since, so this sends the newer wording." : ""}
            </p>
          )}

          {incomplete ? (
            <div className="mt-5 rounded-2xl border border-clay-400/40 bg-clay-400/10 p-4">
              <p className="text-[0.9375rem] font-medium text-clay-500">
                {outstanding.length} of {invited}{" "}
                {invited === 1 ? "stakeholder has" : "stakeholders have"} not answered
              </p>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-forest-900/70">
                The report goes out without their answers,
                so it rests on {responded} of {invited} {responded === 1 ? "response" : "responses"}
                {responded === 0 ? " and has no outside view at all" : ""}. The email says so.
              </p>
              <ul className="mt-3 flex flex-col gap-1.5">
                {outstanding.map((p) => (
                  <li key={p.email} className="text-[0.8125rem] text-forest-900">
                    {p.name || p.email}
                    {p.name ? <span className="text-forest-900/55"> · {p.email}</span> : null}
                    {p.relationship ? (
                      <span className="text-forest-900/55"> · {p.relationship}</span>
                    ) : null}
                    {p.undelivered && (
                      <span className="text-clay-500"> · invitation never arrived</span>
                    )}
                  </li>
                ))}
              </ul>
              <label className="mt-4 flex items-start gap-2.5 text-[0.8125rem] leading-snug text-forest-900">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                I understand this report is being sent without{" "}
                {outstanding.length === 1 ? "this stakeholder's" : "these stakeholders'"} answers.
              </label>
            </div>
          ) : invited === 0 ? (
            <p className="mt-5 rounded-2xl border border-forest-900/10 bg-forest-900/[0.04] p-4 text-[0.8125rem] leading-relaxed text-forest-900/70">
              No stakeholders were invited, so this report has no outside view to compare against.
            </p>
          ) : (
            <p className="mt-5 text-[0.8125rem] text-forest-900/60">
              All {invited} invited {invited === 1 ? "stakeholder has" : "stakeholders have"}{" "}
              answered.
            </p>
          )}

          {error && <p className="mt-4 text-[0.875rem] text-clay-500">{error}</p>}

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button
              variant="ghost"
              size="md"
              disabled={busy !== null}
              onClick={() => dialog.current?.close()}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              arrow
              disabled={busy !== null || (incomplete && !acknowledged)}
              onClick={() => post("send")}
            >
              {busy === "send" ? "Sending..." : "Send final report"}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
