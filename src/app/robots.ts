import type { MetadataRoute } from "next";
import { BRAND_SITE_URL } from "../lib/brand";
import {
  AI_CRAWLER_USER_AGENTS,
  LEGAL_NOINDEX_PATH,
} from "../lib/crawlerPolicy";
import { SEO_DISALLOW_PATHS } from "../lib/seo";

export default function robots(): MetadataRoute.Robots {
  const disallow = [...SEO_DISALLOW_PATHS, LEGAL_NOINDEX_PATH];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
      ...AI_CRAWLER_USER_AGENTS.map((userAgent) => ({
        userAgent,
        disallow,
      })),
    ],
    sitemap: `${BRAND_SITE_URL.replace(/\/$/, "")}/sitemap.xml`,
    host: BRAND_SITE_URL.replace(/\/$/, ""),
  };
}
