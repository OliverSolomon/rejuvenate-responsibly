"use client";

import Link from "next/link";
import { useState } from "react";
import type { AttentionItem } from "@/lib/rmi/activity";

/**
 * What is not set up, said at the top of every live dashboard page.
 *
 * Each notice can be closed. The choice is saved on the person's account
 * against that notice's id, so a closed one stays closed across pages, browsers
 * and sign-ins while the same thing is still wrong, and a different problem, or
 * the same one coming back under a new id, is shown again. Closing is only a way
 * to stop looking at it: the item stays in the notifications until the cause is
 * fixed.
 */
export function SetupBanner({
  items,
  dismissed,
}: {
  items: AttentionItem[];
  /** The ids this person has already closed, as saved. */
  dismissed: string[];
}) {
  // Closed here at once, so the notice goes without waiting for the save.
  const [closed, setClosed] = useState<string[]>([]);

  function close(id: string) {
    setClosed((cur) => [...cur, id]);
    void fetch("/api/dashboard/prefs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dismiss: id }),
    }).catch(() => {
      // Not saved, so it will be back next time. It is still closed for now.
    });
  }

  const shown = items.filter(
    (i) => i.group === "setup" && !dismissed.includes(i.id) && !closed.includes(i.id),
  );

  if (shown.length === 0) return null;

  return (
    <div role="alert" className="border-b border-clay-400/30 bg-clay-400/10">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-3 sm:px-8">
        {shown.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-4">
            <div className="flex flex-1 flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
              <p className="max-w-[78ch] text-[0.875rem] leading-relaxed text-clay-500">
                <span className="font-medium">{item.title}.</span> {item.detail}
              </p>
              {item.href && (
                <Link
                  href={item.href}
                  className="shrink-0 text-[0.8125rem] font-medium text-clay-500 underline underline-offset-4"
                >
                  {item.action ?? "Open"}
                </Link>
              )}
            </div>
            <button
              type="button"
              onClick={() => close(item.id)}
              aria-label={`Dismiss: ${item.title}`}
              className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-clay-500 transition-colors hover:bg-clay-400/20"
            >
              <svg viewBox="0 0 12 12" aria-hidden className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="m2 2 8 8M10 2l-8 8" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
