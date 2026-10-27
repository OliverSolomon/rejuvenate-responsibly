"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ActivityEvent, AttentionItem } from "@/lib/rmi/activity";
import { cn } from "@/lib/utils";

/**
 * The bell in the header: what needs doing, then what is new.
 *
 * The number is the things that need a person (anything marked as a problem)
 * plus what has happened since they last looked. Times are left to the activity
 * card, which renders on the server, so this never disagrees with the page
 * about what time it is in the viewer's zone.
 */
export function Notifications({
  attention,
  fresh,
}: {
  attention: AttentionItem[];
  fresh: ActivityEvent[];
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const count = attention.filter((a) => a.tone === "warn").length + fresh.length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={count ? `Notifications, ${count} to look at` : "Notifications"}
        className="relative grid h-9 w-9 place-items-center rounded-full border border-forest-900/15 text-forest-900/65 transition-colors hover:border-forest-900/40 hover:text-forest-900"
      >
        <svg viewBox="0 0 16 16" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3.5 11.5h9l-1.2-1.7V7a3.3 3.3 0 0 0-6.6 0v2.8L3.5 11.5Z" strokeLinejoin="round" />
          <path d="M6.6 13.4a1.5 1.5 0 0 0 2.8 0" strokeLinecap="round" />
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-clay-500 px-1 text-[0.625rem] leading-none font-medium text-bone-50">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2.5rem))] rounded-2xl border border-forest-900/10 bg-bone-50 p-2 shadow-lg">
          {attention.length === 0 && fresh.length === 0 && (
            <p className="px-3 py-4 text-[0.875rem] text-forest-900/55">
              You are up to date. Nothing needs you right now.
            </p>
          )}

          {attention.length > 0 && (
            <>
              <p className="px-3 pt-2 pb-1 text-[0.6875rem] tracking-wide text-forest-900/45 uppercase">
                Needs you
              </p>
              <ul>
                {attention.map((item) => (
                  <li key={item.id}>
                    <Row
                      href={item.href}
                      onNavigate={() => setOpen(false)}
                      tone={item.tone}
                      title={item.title}
                      detail={item.detail}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}

          {fresh.length > 0 && (
            <>
              <p className="px-3 pt-3 pb-1 text-[0.6875rem] tracking-wide text-forest-900/45 uppercase">
                New
              </p>
              <ul>
                {fresh.slice(0, 6).map((event) => (
                  <li key={event.id}>
                    <Row
                      href={event.href}
                      onNavigate={() => setOpen(false)}
                      tone={event.tone === "warn" ? "warn" : "info"}
                      title={event.title}
                      detail={event.detail}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}

          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="mt-1 block rounded-xl px-3 py-2 text-[0.8125rem] font-medium text-forest-900 underline-offset-4 hover:underline"
          >
            See all recent activity
          </Link>
        </div>
      )}
    </div>
  );
}

function Row({
  href,
  onNavigate,
  tone,
  title,
  detail,
}: {
  href?: string;
  onNavigate: () => void;
  tone: "warn" | "info";
  title: string;
  detail?: string;
}) {
  const body = (
    <span className="flex items-start gap-3">
      <span
        aria-hidden
        className={cn(
          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
          tone === "warn" ? "bg-clay-500" : "bg-forest-900/30",
        )}
      />
      <span className="min-w-0">
        <span className="block text-[0.8125rem] leading-snug font-medium text-forest-900">
          {title}
        </span>
        {detail && (
          <span className="mt-0.5 block text-[0.75rem] leading-snug text-forest-900/55">
            {detail}
          </span>
        )}
      </span>
    </span>
  );
  const cls = "block rounded-xl px-3 py-2";
  return href ? (
    <Link href={href} onClick={onNavigate} className={cn(cls, "hover:bg-forest-900/[0.05]")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
