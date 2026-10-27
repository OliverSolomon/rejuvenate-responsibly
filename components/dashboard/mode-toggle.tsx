"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Live or Demo, side by side so the current one is always in view.
 *
 * Demo shows only the sample submissions and drops the setup banners, which is
 * what you want on screen when you are showing the platform to somebody.
 */
export function ModeToggle({ mode }: { mode: "live" | "demo" }) {
  const router = useRouter();
  const [pending, setPending] = useState<"live" | "demo" | null>(null);

  async function choose(next: "live" | "demo") {
    if (next === mode || pending) return;
    setPending(next);
    try {
      const res = await fetch("/api/dashboard/mode", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: next }),
      });
      if (res.ok) router.refresh();
    } finally {
      setPending(null);
    }
  }

  const shown = pending ?? mode;

  return (
    <div
      role="radiogroup"
      aria-label="Platform view"
      className="flex items-center rounded-full border border-forest-900/15 bg-bone-50 p-0.5 text-[0.75rem]"
    >
      {(["demo", "live"] as const).map((value) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={shown === value}
          onClick={() => void choose(value)}
          className={cn(
            "rounded-full px-3 py-1.5 font-medium capitalize transition-colors",
            shown === value
              ? value === "demo"
                ? "bg-clay-500 text-bone-50"
                : "bg-forest-900 text-bone-50"
              : "text-forest-900/55 hover:text-forest-900",
          )}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
