"use client";

import { useState } from "react";
import { Media } from "@/components/ui/media";
import { services } from "@/lib/site";

const art = [
  "/images/data-dashboard.jpg",
  "/images/boardroom.jpg",
  "/images/community.jpg",
  "/images/report-seal.jpg",
  "/images/supply-chain.jpg",
];

export function ServicesAccordion() {
  const [open, setOpen] = useState<string | null>(services[1].slug);

  return (
    <ul className="mt-14 divide-y divide-bone-50/12 border-y border-bone-50/12">
      {services.map((service, i) => {
        const isOpen = open === service.slug;
        return (
          <li key={service.slug} id={service.slug}>
            <h3>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : service.slug)}
                aria-expanded={isOpen}
                aria-controls={`panel-${service.slug}`}
                className="flex w-full items-center gap-5 py-6 text-left transition-colors hover:text-lime-300 sm:gap-8"
              >
                <span className="font-[family-name:var(--font-serif)] text-[1.25rem] text-bone-50/40 tabular-nums">
                  {service.number}
                </span>
                <span className="display flex-1 text-[clamp(1.25rem,2.6vw,1.9rem)] text-bone-50">
                  {service.title}
                </span>
                <span
                  aria-hidden
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border border-bone-50/20 transition-transform duration-400 ${
                    isOpen ? "rotate-45 border-lime-500 bg-lime-500 text-forest-950" : "text-bone-50"
                  }`}
                >
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="1.6">
                    <path d="M8 3v10M3 8h10" strokeLinecap="round" />
                  </svg>
                </span>
              </button>
            </h3>

            <div
              id={`panel-${service.slug}`}
              hidden={!isOpen}
              className="grid gap-8 pb-10 sm:grid-cols-[0.8fr_1.2fr] sm:pl-14"
            >
              <Media
                src={art[i]}
                alt=""
                swap="service photo"
                width={800}
                height={600}
                className="aspect-4/3 h-full"
              />
              <div className="flex flex-col gap-5">
                <p className="text-[1.0625rem] leading-relaxed text-bone-100/80">
                  {service.summary}
                </p>
                <ul className="flex flex-col gap-3">
                  {service.points.map((p) => (
                    <li key={p} className="flex gap-3 text-[0.9375rem] leading-relaxed text-bone-100/60">
                      <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-lime-500" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
