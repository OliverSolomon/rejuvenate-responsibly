import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/about", "/services", "/why-rejuvenate", "/rmi", "/rmi/glossary", "/contact"];
  const origin = baseUrl();
  const now = new Date();
  return routes.map((route) => ({
    url: `${origin}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "monthly" : "yearly",
    priority: route === "" ? 1 : route === "/rmi" ? 0.9 : 0.7,
  }));
}
