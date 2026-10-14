"use client";

import { usePathname } from "next/navigation";

const EDITOR = /^\/dashboard\/responses\/[^/]+\/edit\/?$/;

/**
 * The page body under the dashboard's top bar. Pages sit in a centred column,
 * except the report editor, which takes the whole width and height so the
 * document has room.
 */
export function DashboardMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (EDITOR.test(pathname)) return <main className="w-full">{children}</main>;
  return <main className="mx-auto max-w-7xl px-5 py-10 sm:px-8">{children}</main>;
}
