"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { Session, SyncState } from "./use-assessment";

const LABEL: Record<SyncState, string> = {
  idle: "Saved on this device",
  saving: "Saving...",
  saved: "Saved",
  offline: "Saved on this device only",
};

export function ReferenceCard({
  session,
  sync,
  onClear,
}: {
  session: Session | null;
  sync: SyncState;
  onClear: () => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(session?.resumeUrl ?? session?.id ?? "");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked. The link is on screen to copy by hand.
    }
  }

  return (
    <div className="mt-8 rounded-card border border-forest-900/12 bg-bone-50 p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow text-forest-900/45">Your reference</p>
          {session ? (
            <>
              <p className="mt-2 font-[family-name:var(--font-serif)] text-3xl tracking-wide text-forest-900">
                {session.id}
              </p>
              <p className="mt-2 max-w-[52ch] text-[0.875rem] leading-relaxed text-forest-900/60">
                {session.emailed ? (
                  <>
                    We have emailed this to you with a link back in. Keep the link
                    somewhere safe: anyone holding it can open your answers.
                  </>
                ) : (
                  <>
                    Copy your link now and keep it somewhere safe. We could not email it,
                    and without it there is no way back to these answers. Anyone holding
                    it can open them, so treat it like a password.
                  </>
                )}
              </p>
            </>
          ) : (
            <p className="mt-2 max-w-[52ch] text-[0.9375rem] leading-relaxed text-forest-900/60">
              Fill in your organisation, name and email below and we will create your
              reference, then email it to you so you can come back to this later.
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-[0.75rem] ${
              sync === "offline"
                ? "bg-clay-400/12 text-clay-500"
                : "bg-forest-900/6 text-forest-900/55"
            }`}
          >
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full ${
                sync === "saving"
                  ? "bg-forest-500"
                  : sync === "offline"
                    ? "bg-clay-400"
                    : "bg-lime-500"
              }`}
            />
            {LABEL[sync]}
          </span>
        </div>
      </div>

      {session && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button
            variant={session.emailed ? "ghost" : "primary"}
            size="sm"
            onClick={copy}
          >
            {copied ? "Link copied" : "Copy my link"}
          </Button>
          {confirming ? (
            <>
              <Button
                variant="primary"
                size="sm"
                disabled={clearing}
                onClick={async () => {
                  setClearing(true);
                  await onClear();
                  setClearing(false);
                  setConfirming(false);
                }}
              >
                {clearing ? "Clearing..." : "Yes, clear everything"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                Keep my answers
              </Button>
              <span className="text-[0.8125rem] text-clay-500">
                This wipes every answer. Your reference stays the same.
              </span>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
              Clear all responses
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
