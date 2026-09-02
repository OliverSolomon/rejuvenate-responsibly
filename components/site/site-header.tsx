"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/ui/logo";
import { nav, site } from "@/lib/site";

/**
 * Routes whose first screen is a dark photograph. The header rides on top of
 * those transparently; everywhere else it carries its own bone surface.
 */
const OVERLAY_ROUTES = ["/", "/rmi"];

export function SiteHeader() {
  const pathname = usePathname();
  const [pastHero, setPastHero] = useState(false);

  // The menu is open only for the route it was opened on, so navigating closes
  // it without an effect reaching in to reset the flag.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const setOpen = (next: boolean) => setOpenFor(next ? pathname : null);

  const isOverlayRoute = OVERLAY_ROUTES.includes(pathname);
  const overlay = isOverlayRoute && !pastHero;

  useEffect(() => {
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * 0.72);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const ease = "transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]";

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Outer inset matches the hero card, then collapses into a full width
          bar once the photograph has scrolled away. */}
      <div className={`${ease} ${overlay ? "px-2 pt-2 sm:px-3 sm:pt-3" : "px-0 pt-0"}`}>
        <div
          className={`${ease} ${
            overlay
              ? "bg-transparent"
              : "border-b border-forest-900/10 bg-bone-100"
          }`}
        >
          <div
            className={`${ease} ${
              overlay
                ? "px-5 sm:px-10 lg:px-14"
                : "mx-auto max-w-7xl px-5 sm:px-8"
            }`}
          >
            <div
              className={`${ease} flex items-center justify-between gap-6 ${
                overlay ? "py-6" : "py-3.5"
              }`}
            >
              <Link
                href="/"
                aria-label="Rejuvenate Responsibly, home"
                className="shrink-0"
              >
                <Logo tone={overlay ? "bone" : "forest"} />
              </Link>

              <nav
                aria-label="Primary"
                className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 lg:flex"
              >
                {nav.map((item) => {
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`relative py-1 text-[0.9375rem] transition-colors ${
                        overlay
                          ? active
                            ? "text-bone-50"
                            : "text-bone-50/70 hover:text-bone-50"
                          : active
                            ? "text-forest-900"
                            : "text-forest-900/65 hover:text-forest-900"
                      }`}
                    >
                      {item.label}
                      {active && (
                        <span
                          aria-hidden
                          className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-lime-500"
                        />
                      )}
                    </Link>
                  );
                })}
              </nav>

              <div className="flex shrink-0 items-center gap-3">
                <a
                  href={site.whatsapp}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Message us on WhatsApp"
                  className={`hidden h-10 w-10 items-center justify-center rounded-full border transition-colors sm:flex ${
                    overlay
                      ? "border-bone-50/25 text-bone-50 hover:border-bone-50/60"
                      : "border-forest-900/15 text-forest-900 hover:border-forest-900/40"
                  }`}
                >
                  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor">
                    <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.38a9.86 9.86 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7A9.82 9.82 0 0 0 12.04 2zm0 1.82c2.16 0 4.19.84 5.72 2.37a8.03 8.03 0 0 1 2.37 5.72c0 4.46-3.63 8.08-8.09 8.08a8.05 8.05 0 0 1-4.11-1.13l-.3-.17-3.05.8.81-2.98-.19-.31a8.02 8.02 0 0 1-1.23-4.29c0-4.46 3.63-8.09 8.09-8.09zm-2.4 4.23c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.02s.87 2.34.99 2.5c.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.43-.59 1.63-1.15.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28-.24-.12-1.43-.71-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.53-1.32-.75-1.8-.19-.44-.38-.38-.53-.39l-.45-.01z" />
                  </svg>
                </a>

                <Link
                  href="/rmi#start"
                  className={`hidden h-10 items-center gap-2.5 rounded-full pl-5 pr-4 text-[0.875rem] font-medium transition-all duration-300 hover:-translate-y-0.5 sm:inline-flex ${
                    overlay
                      ? "bg-forest-950 text-bone-50 hover:bg-forest-900"
                      : "bg-forest-900 text-bone-50 hover:bg-forest-800"
                  }`}
                >
                  Start assessment
                  <svg
                    aria-hidden
                    viewBox="0 0 20 16"
                    className="h-3.5 w-4 text-lime-400 transition-transform duration-300 group-hover:translate-x-0.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  >
                    <path d="M1 8h17M12 2l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>

                <button
                  type="button"
                  onClick={() => setOpen(!open)}
                  aria-expanded={open}
                  aria-controls="mobile-nav"
                  className={`flex h-10 w-10 items-center justify-center rounded-full border transition-colors lg:hidden ${
                    overlay ? "border-bone-50/25" : "border-forest-900/15"
                  }`}
                >
                  <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
                  <span className="relative block h-3 w-4.5">
                    <span
                      className={`absolute left-0 h-px w-full transition-all duration-300 ${
                        overlay ? "bg-bone-50" : "bg-forest-900"
                      } ${open ? "top-1.5 rotate-45" : "top-0"}`}
                    />
                    <span
                      className={`absolute left-0 h-px w-full transition-all duration-300 ${
                        overlay ? "bg-bone-50" : "bg-forest-900"
                      } ${open ? "top-1.5 -rotate-45" : "top-3"}`}
                    />
                  </span>
                </button>
              </div>
            </div>

            {/* Hairline under the row, only while the header is on the photograph */}
            <div
              aria-hidden
              className={`${ease} h-px bg-bone-50/20 ${overlay ? "opacity-100" : "opacity-0"}`}
            />
          </div>
        </div>
      </div>

      <div
        id="mobile-nav"
        hidden={!open}
        className="fixed inset-0 top-0 z-40 flex flex-col bg-forest-900 px-5 pb-10 pt-24 text-bone-100 lg:hidden"
      >
        <nav aria-label="Mobile" className="flex flex-col divide-y divide-bone-50/10">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="display py-5 text-3xl text-bone-50">
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
