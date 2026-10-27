"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Analytics" },
  { href: "/dashboard/responses", label: "Responses" },
  { href: "/dashboard/settings", label: "Settings" },
];

/** The three places the dashboard goes. Account and sign-out are in the user menu. */
export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Dashboard" className="flex items-center gap-1">
      {links.map((link) => {
        const active =
          link.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(link.href);
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
  );
}
