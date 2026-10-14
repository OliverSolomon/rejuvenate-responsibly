"use client";

import { usePathname } from "next/navigation";

/**
 * The public header and footer belong to the website. The dashboard has its own
 * top navigation, so inside it they are left out rather than stacked on top.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return null;
  return <>{children}</>;
}
