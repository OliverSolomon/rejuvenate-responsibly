"use client";

import Link from "next/link";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import type { ActivityEvent, AttentionItem, Feed } from "@/lib/rmi/activity";
import { cn } from "@/lib/utils";

type Tab = "needs" | "new" | "all";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** "5 min ago". Worked out against a time the server supplies, so it reads the same on both sides. */
function ago(iso: string, now: number): string {
  const d = Math.max(0, now - Date.parse(iso));
  if (d < MIN) return "just now";
  if (d < HOUR) return `${Math.floor(d / MIN)} min ago`;
  if (d < DAY) return `${Math.floor(d / HOUR)} h ago`;
  return `${Math.floor(d / DAY)} d ago`;
}

function dayLabel(iso: string, now: number): string {
  const days = Math.floor((now - Date.parse(iso)) / DAY);
  if (days < 1) return "Today";
  if (days < 2) return "Yesterday";
  return `${days} days ago`;
}

const DOT: Record<ActivityEvent["tone"], string> = {
  warn: "bg-clay-500",
  good: "bg-forest-700",
  info: "bg-forest-900/30",
};

/**
 * Recent activity, and what is left to do.
 *
 * One list at a time, behind tabs, in the order a person coming back wants them:
 * what needs doing, what is new since they arrived, then everything. New is the
 * events since sign-in together with the ones missed since the visit before, and
 * each carries its own mark so the two are still told apart. When every company
 * is in view a row of company chips narrows the lists to one.
 */
export function ActivityCard({
  feed,
  now,
  companies,
}: {
  feed: Feed;
  /** Milliseconds since the epoch, taken on the server for this render. */
  now: number;
  /** Company names by id, only when more than one company is in view. */
  companies: Record<string, string> | null;
}) {
  const [tab, setTab] = useState<Tab>("needs");

  const freshIds = new Set(feed.sinceSignIn.map((e) => e.id));
  const missedIds = new Set(feed.catchUp.map((e) => e.id));

  const needs: AttentionItem[] = feed.attention;
  const fresh = feed.events.filter((e) => (freshIds.has(e.id) || missedIds.has(e.id)));
  const all = feed.events;

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "needs", label: "Needs you", count: needs.length },
    { id: "new", label: "New", count: fresh.length },
    { id: "all", label: "All activity", count: all.length },
  ];

  return (
    <Card className="p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="display text-[1.25rem]">Notifications and recent activity</h2>
        <div
          role="tablist"
          aria-label="Notifications and activity"
          className="flex rounded-full border border-forest-900/12 bg-bone-50 p-0.5"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`activity-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls="activity-panel"
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-[0.8125rem] font-medium",
                "transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97]",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700",
                tab === t.id
                  ? "bg-forest-900 text-bone-50"
                  : "text-forest-900/60 hover:text-forest-900",
              )}
            >
              {t.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-[0.6875rem] tabular-nums",
                  tab === t.id
                    ? "bg-bone-50/20"
                    : t.id === "needs" && t.count > 0
                      ? "bg-clay-400/20 text-clay-500"
                      : "bg-forest-900/8",
                )}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div id="activity-panel" role="tabpanel" aria-labelledby={`activity-tab-${tab}`} className="mt-5">
        {tab === "needs" &&
          (needs.length === 0 ? (
            <Empty title="You are all caught up" text="Nothing is waiting on you." />
          ) : (
            <ul className="flex flex-col divide-y divide-forest-900/8">
              {needs.map((item) => (
                <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <span
                    aria-hidden
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      item.tone === "warn" ? "bg-clay-500" : "bg-forest-900/30",
                    )}
                  />
                  <div className="min-w-0 flex-1 text-[0.875rem]">
                    <p className="font-medium text-forest-900">
                      {item.title}
                      <span className="sr-only">{item.tone === "warn" ? " (needs you)" : " (to do)"}</span>
                    </p>
                    <p className="mt-0.5 leading-snug text-forest-900/60">{item.detail}</p>
                  </div>
                  {item.href && (
                    <Link
                      href={item.href}
                      className="inline-flex min-h-9 shrink-0 cursor-pointer items-center rounded-full border border-forest-900/15 px-3.5 text-[0.8125rem] font-medium text-forest-900 transition-colors duration-150 ease-out hover:border-forest-900/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
                    >
                      {item.action ?? "Open"}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          ))}

        {tab === "new" &&
          (fresh.length === 0 ? (
            <Empty
              title="Nothing new"
              text="Nothing has happened since you signed in or while you were away."
            />
          ) : (
            <Events
              events={fresh}
              now={now}
              companies={companies}
              mark={(e) => (missedIds.has(e.id) && !freshIds.has(e.id) ? "While you were away" : null)}
            />
          ))}

        {tab === "all" &&
          (all.length === 0 ? (
            <Empty
              title="No activity in the last 30 days"
              text="New assessments, payments and responses will show up here."
            />
          ) : (
            <Events events={all.slice(0, 40)} now={now} companies={companies} />
          ))}
      </div>
    </Card>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl bg-forest-900/[0.03] px-5 py-8 text-center">
      <p className="text-[0.9375rem] font-medium text-forest-900">{title}</p>
      <p className="mt-1 text-[0.8125rem] text-forest-900/55">{text}</p>
    </div>
  );
}

/** Events under a heading per day, newest first. */
function Events({
  events,
  now,
  companies,
  mark,
}: {
  events: ActivityEvent[];
  now: number;
  companies: Record<string, string> | null;
  mark?: (e: ActivityEvent) => string | null;
}) {
  const groups: { label: string; items: ActivityEvent[] }[] = [];
  for (const e of events) {
    const label = dayLabel(e.at, now);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.items.push(e);
    else groups.push({ label, items: [e] });
  }

  return (
    <div className="flex flex-col gap-5">
      {groups.map((g) => (
        <section key={g.label}>
          <h3 className="text-[0.6875rem] font-medium tracking-wide text-forest-900/45 uppercase">
            {g.label}
          </h3>
          <ul className="mt-2 flex flex-col">
            {g.items.map((e) => {
              const note = mark?.(e);
              const body = (
                <>
                  <span aria-hidden className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", DOT[e.tone])} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.875rem] text-forest-900">{e.title}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.75rem] text-forest-900/50">
                      <span>{ago(e.at, now)}</span>
                      {companies && e.companyId && companies[e.companyId] && (
                        <span className="rounded-full bg-forest-900/6 px-2 py-px">
                          {companies[e.companyId]}
                        </span>
                      )}
                      {note && <span className="text-clay-500">{note}</span>}
                      {e.detail && <span className="break-words">{e.detail}</span>}
                    </span>
                  </span>
                </>
              );
              return (
                <li key={e.id}>
                  {e.href ? (
                    <Link
                      href={e.href}
                      className="-mx-2 flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 transition-colors duration-150 ease-out hover:bg-forest-900/[0.04] focus-visible:outline-2 focus-visible:outline-forest-700"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="-mx-2 flex items-start gap-3 px-2 py-2">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
