"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Analytics" },
  { href: "/dashboard/responses", label: "Responses" },
  { href: "/dashboard/settings", label: "Settings" },
];

export function DashboardNav({ email, name }: { email: string; name: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await createClient().auth.signOut();
    router.push("/signin");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1 sm:gap-3">
      <nav aria-label="Dashboard" className="flex items-center gap-1">
        {links.map((link) => {
          const active =
            link.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-full px-3.5 py-2 text-[0.875rem] transition-colors",
                active
                  ? "bg-forest-900 text-bone-50"
                  : "text-forest-900/65 hover:bg-forest-900/[0.06] hover:text-forest-900",
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <span className="hidden text-[0.8125rem] text-forest-900/45 sm:block" title={email}>
        {name ?? email}
      </span>
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        className="rounded-full border border-forest-900/15 px-3.5 py-2 text-[0.8125rem] text-forest-900/65 transition-colors hover:border-forest-900/40 hover:text-forest-900 disabled:opacity-50"
      >
        {busy ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );
}
