"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The settings, one subject at a time.
 *
 * The chosen tab lives in the address bar rather than in state, so a link to a
 * particular tab works, the back button does what it looks like it should, and
 * a save that refreshes the page comes back to where the person was.
 *
 * It is written against the history API rather than the router so that changing
 * tab does not re-run the server component: everything on these pages is
 * already loaded, and a round trip per tab would make the whole thing feel
 * slower than it is.
 */

export type Tab = { id: string; label: string; panel: ReactNode };

const subscribe = (onChange: () => void) => {
  window.addEventListener("popstate", onChange);
  window.addEventListener("rmi:tab", onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener("rmi:tab", onChange);
  };
};

const readHash = () => window.location.hash.replace(/^#/, "");

export function SettingsTabs({ tabs }: { tabs: Tab[] }) {
  // The server has no address bar, so it renders the first tab.
  const hash = useSyncExternalStore(subscribe, readHash, () => "");
  const active = tabs.find((t) => t.id === hash) ?? tabs[0];

  function go(id: string) {
    const url = `${window.location.pathname}#${id}`;
    window.history.pushState(null, "", url);
    window.dispatchEvent(new Event("rmi:tab"));
    // A tab taller than the last one would otherwise leave the person halfway
    // down a panel they have not read.
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Settings"
        className="-mx-5 flex gap-1 overflow-x-auto px-5 pb-1 sm:mx-0 sm:px-0"
      >
        {tabs.map((tab) => {
          const current = tab.id === active.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={current}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => go(tab.id)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-[0.8125rem] font-medium whitespace-nowrap transition-colors",
                current
                  ? "bg-forest-900 text-bone-50"
                  : "text-forest-900/60 hover:bg-forest-900/6 hover:text-forest-900",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`panel-${active.id}`}
        aria-labelledby={`tab-${active.id}`}
        className="mt-7"
      >
        {active.panel}
      </div>
    </div>
  );
}
