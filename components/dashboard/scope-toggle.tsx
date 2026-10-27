"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * All companies, or just your own: the super admin's one-click switch.
 *
 * Stepping into a different firm still happens from the Companies tab, which is
 * where the list of them is. When that is what the person has done, neither
 * side is lit and the company's name sits beside this instead.
 */
export function ScopeToggle({
  state,
  ownId,
}: {
  /** "other" is a firm that is neither the whole installation nor the person's own. */
  state: "all" | "own" | "other";
  ownId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"all" | "own" | null>(null);

  async function choose(next: "all" | "own") {
    if (pending || state === next) return;
    setPending(next);
    try {
      const res = await fetch("/api/dashboard/companies/view", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: next === "all" ? "all" : ownId }),
      });
      if (res.ok) router.refresh();
    } finally {
      setPending(null);
    }
  }

  const shown = pending ?? (state === "other" ? null : state);

  return (
    <div
      role="radiogroup"
      aria-label="Which companies to show"
      className="flex items-center rounded-full border border-forest-900/15 bg-bone-50 p-0.5 text-[0.75rem]"
    >
      {(["all", "own"] as const).map((value) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={shown === value}
          onClick={() => void choose(value)}
          className={cn(
            "rounded-full px-3 py-1.5 font-medium transition-colors",
            shown === value
              ? "bg-forest-900 text-bone-50"
              : "text-forest-900/55 hover:text-forest-900",
          )}
        >
          {value === "all" ? "All" : "Own"}
        </button>
      ))}
    </div>
  );
}
