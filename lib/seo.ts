import type { Metadata } from "next";
import { site } from "@/lib/site";

/**
 * The origin that absolute URLs (canonical, og:image) are built on. On Vercel
 * it follows the deployment, so a preview or the client link shows its own
 * image instead of pointing at a domain that may not serve this build yet. A
 * custom domain, once attached, becomes VERCEL_PROJECT_PRODUCTION_URL on its
 * own. Anywhere else (the staging server, local) it is NEXT_PUBLIC_SITE_URL.
 */
export function baseUrl(): string {
  const host =
    process.env.VERCEL_ENV === "production"
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : process.env.VERCEL_URL;
  if (host) return `https://${host}`;
  return (process.env.NEXT_PUBLIC_SITE_URL || site.url).replace(/\/$/, "");
}

type PageMetaInput = {
  title: string;
  description: string;
  /** Path of the page, used for canonical and og:url. */
  path: string;
  /** Keep the page out of search results and link unfurls. */
  private?: boolean;
};

/**
 * Title, description, canonical, Open Graph and Twitter in one place so every
 * route says the same thing in every channel. The image comes from the
 * nearest opengraph-image file, so it is not set here.
 */
export function pageMeta({ title, description, path, private: hidden }: PageMetaInput): Metadata {
  const full = `${title} | ${site.name}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "en_KE",
      siteName: site.name,
      url: path,
      title: full,
      description,
    },
    twitter: { card: "summary_large_image", title: full, description },
    ...(hidden ? { robots: { index: false, follow: false } } : {}),
  };
}
