"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";

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
 * report it leads to the preview, which is where sending happens: the document
 * is laid out there exactly as the client will receive it, and the warning
 * about stakeholders who have not answered is on that page too.
 */
export function SendReport({
  assessmentId,
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
  const [busy, setBusy] = useState<null | "generate">(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const incomplete = outstanding.length > 0;
  const sentBefore = Boolean(sentAt);

  /** Writing the report happens here; sending it happens on the preview page. */
  async function post(kind: "generate") {
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/report/${assessmentId}/${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "That did not work.");
      setNotice("Report written. Read it over, then preview and send.");
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

  const href = `/dashboard/responses/${assessmentId}/preview`;

  return (
    <div className="flex flex-col items-end gap-2">
      <ButtonLink href={href} variant="primary" size="md">
        {sentBefore ? "Preview and send again" : "Preview and send"}
      </ButtonLink>

      <p className="max-w-[34ch] text-right text-[0.75rem] leading-relaxed text-forest-900/50">
        {sentBefore ? (
          <>
            Sent to {submitterEmail} on {fmt(sentAt!)}
            {sentBy ? ` by ${sentBy}` : ""}
            {sentOutstanding ? `, ${sentOutstanding} answers outstanding` : ""}.
            {editedAfterSent ? " Edited since." : ""}
          </>
        ) : incomplete ? (
          <>
            {outstanding.length} of {invited}{" "}
            {invited === 1 ? "stakeholder has" : "stakeholders have"} not answered. You can still
            send, and the preview says so.
          </>
        ) : invited === 0 ? (
          <>No stakeholders were invited, so there is no outside view to compare against.</>
        ) : (
          <>
            All {invited} invited {invited === 1 ? "stakeholder has" : "stakeholders have"} answered,
            resting on {responded} {responded === 1 ? "response" : "responses"}.
          </>
        )}
      </p>

      {notice && <p className="text-[0.8125rem] text-forest-700">{notice}</p>}
      {error && <p className="max-w-[36ch] text-right text-[0.8125rem] text-clay-500">{error}</p>}
    </div>
  );
}
