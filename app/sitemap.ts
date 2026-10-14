import type { MetadataRoute } from "next";
import { baseUrl } from "@/lib/seo";

const routes = ["/", "/about", "/services", "/why-rejuvenate", "/rmi", "/rmi/glossary", "/contact"];

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = baseUrl();
  return routes.map((path) => ({
    url: `${origin}${path === "/" ? "" : path}`,
    changeFrequency: "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
