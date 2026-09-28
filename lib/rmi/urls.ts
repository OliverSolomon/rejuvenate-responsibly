import { site } from "@/lib/site";

/** Absolute base URL for links that travel by email. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? site.url).replace(/\/$/, "");
}
