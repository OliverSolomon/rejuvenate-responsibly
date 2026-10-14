import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SiteHeader } from "@/components/site/site-header";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteChrome } from "@/components/site/site-chrome";
import { AdminBanner } from "@/components/site/admin-banner";
import { site } from "@/lib/site";
import { baseUrl } from "@/lib/seo";

/* Self-hosted so the site has no runtime dependency on Google Fonts. */
const body = localFont({
  src: "./fonts/inter-tight-latin-wght-normal.woff2",
  variable: "--font-body",
  weight: "100 900",
  display: "swap",
});

const display = localFont({
  src: "./fonts/schibsted-grotesk-latin-wght-normal.woff2",
  variable: "--font-display",
  weight: "400 900",
  display: "swap",
});

const serif = localFont({
  src: "./fonts/instrument-serif-latin-400-normal.woff2",
  variable: "--font-serif",
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl()),
  applicationName: site.name,
  authors: [{ name: site.name }],
  creator: site.name,
  alternates: { canonical: "/" },
  title: {
    default: `${site.name}. ${site.tagline}`,
    template: `%s | ${site.name}`,
  },
  description: site.description,
  keywords: [
    "ESG advisory Kenya",
    "sustainability consulting Nairobi",
    "CSR strategy",
    "GRI reporting",
    "NSE ESG disclosure",
    "Rate My Impact",
  ],
  openGraph: {
    type: "website",
    locale: "en_KE",
    url: "/",
    siteName: site.name,
    title: `${site.name}. ${site.tagline}`,
    description: site.description,
  },
  twitter: {
    card: "summary_large_image",
    site: "@ReRejuvenate",
    creator: "@ReRejuvenate",
    title: `${site.name}. ${site.tagline}`,
    description: site.description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0d2418",
};

const organisationJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: site.name,
  description: site.description,
  url: baseUrl(),
  email: site.email,
  telephone: site.phones[0],
  address: { "@type": "PostalAddress", addressLocality: "Nairobi", addressCountry: "KE" },
  areaServed: "East Africa",
  sameAs: site.socials.map((s) => s.href),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${body.variable} ${display.variable} ${serif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bone-100 text-forest-900">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organisationJsonLd) }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-full focus:bg-forest-900 focus:px-5 focus:py-2.5 focus:text-sm focus:text-bone-50"
        >
          Skip to content
        </a>
        <SiteChrome>
          <SiteHeader />
        </SiteChrome>
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteChrome>
          <SiteFooter />
        </SiteChrome>
        <AdminBanner />
      </body>
    </html>
  );
}
