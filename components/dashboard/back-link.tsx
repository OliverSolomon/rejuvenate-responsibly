"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const EDITOR = /^\/dashboard\/responses\/([^/]+)\/edit\/?$/;
const UNDER_SETTINGS = /^\/dashboard\/settings\/.+/;

/**
 * The button at the far left of the dashboard's top bar. Almost everywhere it
 * leads back to the public website. On a page someone drilled into it goes back
 * one step instead, since that is where they came from: the report editor
 * returns to its organisation, and anything under settings returns to settings.
 */
export function BackLink() {
  const pathname = usePathname();
  const editing = pathname.match(EDITOR);
  const href = editing
    ? `/dashboard/responses/${editing[1]}`
    : UNDER_SETTINGS.test(pathname)
      ? "/dashboard/settings"
      : "/";

  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 rounded-full border border-forest-900/15 px-3.5 py-2 text-[0.8125rem] text-forest-900/65 transition-colors hover:border-forest-900/40 hover:text-forest-900"
    >
      <span aria-hidden>←</span>
      {editing ? (
        <span>Back</span>
      ) : (
        <>
          <span className="hidden sm:inline">Back to website</span>
          <span className="sm:hidden">Website</span>
        </>
      )}
    </Link>
  );
}
