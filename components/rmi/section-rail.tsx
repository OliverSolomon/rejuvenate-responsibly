"use client";

import { SECTIONS, type SectionId } from "@/lib/rmi/questions";

export type SectionCount = { answered: number; total: number };

export function SectionRail({
  counts,
  active,
  profileComplete,
}: {
  counts: Record<SectionId, SectionCount>;
  active: string;
  profileComplete: boolean;
}) {
  const items = [
    { id: "about-you", label: "About you", answered: profileComplete ? 1 : 0, total: 1 },
    ...SECTIONS.map((s) => ({
      id: s.id,
      label: s.title,
      answered: counts[s.id].answered,
      total: counts[s.id].total,
    })),
  ];

  return (
    <nav aria-label="Assessment sections" className="sticky top-32">
      <p className="eyebrow mb-4 text-forest-900/40">Sections</p>
      <ol className="flex flex-col gap-1">
        {items.map((item) => {
          const done = item.answered === item.total;
          const isActive = active === item.id;
          const pct = item.total ? (item.answered / item.total) * 100 : 0;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={isActive ? "true" : undefined}
                className={`block rounded-xl px-3 py-2.5 transition-colors ${
                  isActive ? "bg-forest-900/6" : "hover:bg-forest-900/[0.035]"
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span
                    className={`text-[0.875rem] leading-snug ${
                      isActive ? "font-medium text-forest-900" : "text-forest-900/65"
                    }`}
                  >
                    {item.label}
                  </span>
                  {done ? (
                    <svg
                      viewBox="0 0 14 14"
                      aria-hidden
                      className="h-3.5 w-3.5 shrink-0 text-lime-600"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                    >
                      <path d="m2.5 7.3 3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <span className="shrink-0 text-[0.75rem] tabular-nums text-forest-900/40">
                      {item.answered}/{item.total}
                    </span>
                  )}
                </span>
                {item.total > 1 && (
                  <span className="mt-2 block h-1 overflow-hidden rounded-full bg-forest-900/8">
                    <span
                      className="block h-full rounded-full bg-forest-700 transition-[width] duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                )}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
