import type { MetadataRoute } from "next";
import { absoluteUrl, SEO_INDEXABLE_PATHS } from "../lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return SEO_INDEXABLE_PATHS.map((path) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency: path === "/lp" ? "weekly" : "monthly",
    priority: path === "/lp" ? 1 : 0.5,
  }));
}
