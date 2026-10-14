import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dashboard", "/api/", "/auth/", "/signin", "/rmi/report", "/rmi/payment", "/rmi/resume", "/rmi/survey", "/rmi/assessment"],
    },
    sitemap: `${baseUrl()}/sitemap.xml`,
  };
}
