"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/logo";
import { nav } from "@/lib/site";

export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  // The menu is only open for the route it was opened on, so navigating closes it
  // without an effect having to reach in and reset the flag.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const setOpen = (next: boolean) => setOpenFor(next ? pathname : null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50">
      <div
        className={`pointer-events-auto mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-8 ${
          scrolled ? "py-2.5" : "py-4"
        }`}
      >
        <Link
          href="/"
          aria-label="Rejuvenate Responsibly, home"
          className={`rounded-full border border-forest-900/8 bg-bone-50/90 px-3.5 py-2 backdrop-blur-md transition-all duration-500 ${
            scrolled ? "shadow-[0_8px_30px_-12px_rgba(8,23,15,0.28)]" : ""
          }`}
        >
          <Logo />
        </Link>

        <nav
          aria-label="Primary"
          className={`hidden items-center gap-1 rounded-full border border-forest-900/8 bg-bone-50/90 px-2 py-1.5 backdrop-blur-md transition-all duration-500 lg:flex ${
            scrolled ? "shadow-[0_8px_30px_-12px_rgba(8,23,15,0.28)]" : ""
          }`}
        >
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-[0.875rem] transition-colors ${
                  active
                    ? "bg-forest-900 text-bone-50"
                    : "text-forest-900/75 hover:bg-forest-900/[0.06] hover:text-forest-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/rmi#start"
            className="hidden h-11 items-center gap-2 rounded-full bg-lime-500 pl-5 pr-2 text-[0.875rem] font-medium text-forest-950 transition-all duration-300 hover:-translate-y-0.5 hover:bg-lime-400 sm:inline-flex"
          >
            Start assessment
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-full bg-forest-900 text-lime-400"
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-forest-900/10 bg-bone-50/90 backdrop-blur-md lg:hidden"
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <span className="relative block h-3 w-4.5">
              <span
                className={`absolute left-0 h-px w-full bg-forest-900 transition-all duration-300 ${
                  open ? "top-1.5 rotate-45" : "top-0"
                }`}
              />
              <span
                className={`absolute left-0 h-px w-full bg-forest-900 transition-all duration-300 ${
                  open ? "top-1.5 -rotate-45" : "top-3"
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        hidden={!open}
        className="pointer-events-auto fixed inset-0 top-0 z-40 flex flex-col bg-forest-900 px-5 pb-10 pt-24 text-bone-100 lg:hidden"
      >
        <nav aria-label="Mobile" className="flex flex-col divide-y divide-bone-50/10">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="display py-5 text-3xl text-bone-50"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/rmi#start"
          className="mt-auto inline-flex h-13 items-center justify-center rounded-full bg-lime-500 px-6 font-medium text-forest-950"
        >
          Start your assessment
        </Link>
      </div>
    </header>
  );
}
