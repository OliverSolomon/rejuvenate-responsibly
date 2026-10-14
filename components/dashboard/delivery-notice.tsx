"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export type FailedInvite = {
  email: string;
  name: string;
  error: string | null;
  reason: "failed" | "not_sent";
  notifiedAt: string | null;
};

const inputClass =
  "w-full rounded-xl border border-forest-900/15 bg-bone-50 px-3.5 py-2.5 text-[0.875rem] text-forest-900";

/**
 * Lists invitations that never arrived and lets an admin tell the submitter.
 * The message is prefilled, shown in full and editable before anything is sent.
 */
export function DeliveryNotice({
  assessmentId,
  submitterName,
  submitterEmail,
  failed,
  defaultSubject,
  defaultText,
}: {
  assessmentId: string;
  submitterName: string;
  submitterEmail: string;
  failed: FailedInvite[];
  defaultSubject: string;
  defaultText: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState(defaultSubject);
  const [text, setText] = useState(defaultText);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allNotified = failed.every((f) => f.notifiedAt);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/notify/${assessmentId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject, text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "The message could not be sent.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "The message could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-clay-400/30 bg-clay-400/8 p-5">
      <p className="text-[0.9375rem] font-medium text-clay-500">
        {failed.length} {failed.length === 1 ? "invitation was" : "invitations were"} not delivered
      </p>
      <p className="mt-1 text-[0.8125rem] leading-relaxed text-forest-900/65">
        Each invitation is sent once and not retried, so these people have not received the survey,
        and the report waits for them. {submitterName || "The submitter"} ({submitterEmail}) can
        correct the address or pass the link on.
      </p>

      <ul className="mt-4 flex flex-col gap-2">
        {failed.map((f) => (
          <li
            key={f.email}
            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[0.875rem]"
          >
            <span className="text-forest-900">
              {f.email}
              {f.name ? <span className="text-forest-900/50"> · {f.name}</span> : null}
            </span>
            <span className="text-[0.75rem] text-forest-900/55">
              {f.reason === "not_sent"
                ? "Email was not configured when this was sent"
                : (f.error ?? "The mail provider refused it")}
              {f.notifiedAt
                ? ` · submitter told ${new Date(f.notifiedAt).toLocaleDateString("en-GB")}`
                : ""}
            </span>
          </li>
        ))}
      </ul>

      {!open ? (
        <div className="mt-5">
          <Button variant="primary" size="md" onClick={() => setOpen(true)}>
            {allNotified ? "Inform the submitter again" : "Inform the submitter"}
          </Button>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          <p className="text-[0.8125rem] text-forest-900/60">
            This goes to <strong>{submitterEmail}</strong>. Edit it as you like; it is sent exactly
            as written below.
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.75rem] font-medium text-forest-900/60">Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={200}
              className={`${inputClass} h-11`}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[0.75rem] font-medium text-forest-900/60">Message</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={16}
              maxLength={5000}
              className={`${inputClass} font-mono leading-relaxed`}
            />
          </label>
          {error && <p className="text-[0.875rem] text-clay-500">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              size="md"
              arrow
              disabled={busy || !subject.trim() || !text.trim()}
              onClick={send}
            >
              {busy ? "Sending..." : "Send to submitter"}
            </Button>
            <Button
              variant="ghost"
              size="md"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                setSubject(defaultSubject);
                setText(defaultText);
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
