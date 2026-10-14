"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const KEY = "rmi:admin-banner-dismissed";

/** Pages where the banner has no job: the dashboard itself and the sign-in round trip. */
const QUIET = ["/dashboard", "/signin", "/auth"];

/**
 * A small notice for a signed-in admin who is looking at the public website, so
 * it is clear they are an admin and one click gets them back to the dashboard.
 *
 * It asks the server, rather than the page reading the session, so the public
 * pages stay statically rendered. Visitors with no sign-in cookie never make
 * the request at all.
 */
export function AdminBanner() {
  const pathname = usePathname();
  const [admin, setAdmin] = useState<{ name: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Supabase keeps its session in cookies named sb-<project>-auth-token.
    if (!document.cookie.split("; ").some((c) => c.startsWith("sb-"))) return;

    let live = true;
    fetch("/api/admin/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { admin?: boolean; name?: string } | null) => {
        let hidden = false;
        try {
          hidden = window.sessionStorage.getItem(KEY) === "1";
        } catch {
          // Storage blocked: the banner just comes back on each page load.
        }
        if (live && d?.admin && !hidden) setAdmin({ name: d.name ?? "" });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  if (!admin || dismissed) return null;
  if (QUIET.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-fit items-center gap-3 rounded-full border border-forest-900/15 bg-forest-900 py-1.5 pr-1.5 pl-4 text-[0.8125rem] text-bone-50 shadow-lg"
    >
      <span>
        You are signed in as an admin{admin.name ? ` (${admin.name})` : ""} and viewing the public
        website.
      </span>
      <Link
        href="/dashboard"
        className="rounded-full bg-lime-500 px-3 py-1 font-medium whitespace-nowrap text-forest-950"
      >
        Open dashboard
      </Link>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          setDismissed(true);
          try {
            window.sessionStorage.setItem(KEY, "1");
          } catch {
            // Fine: dismissed for this page view only.
          }
        }}
        className="grid h-7 w-7 place-items-center rounded-full text-bone-50/70 hover:bg-bone-50/10 hover:text-bone-50"
      >
        <span aria-hidden>×</span>
      </button>
    </div>
  );
}
