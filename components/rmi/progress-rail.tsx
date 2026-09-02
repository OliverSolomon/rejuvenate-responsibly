"use client";

import { SECTIONS, type SectionId } from "@/lib/rmi/questions";

export function ProgressRail({
  current,
  counts,
}: {
  current: SectionId;
  counts: Record<SectionId, { answered: number; total: number }>;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5">
        {SECTIONS.map((s) => {
          const c = counts[s.id];
          const pct = c.total ? (c.answered / c.total) * 100 : 0;
          const active = s.id === current;
          return (
            <div key={s.id} className="flex-1">
              <div
                className={`relative h-1.5 overflow-hidden rounded-full transition-colors ${
                  active ? "bg-forest-900/18" : "bg-forest-900/10"
                }`}
              >
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-forest-800 transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p
                className={`mt-2 hidden text-[0.6875rem] tracking-wide sm:block ${
                  active ? "text-forest-900" : "text-forest-900/40"
                }`}
              >
                {s.short}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
