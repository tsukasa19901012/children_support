import type { MetadataRoute } from "next";
import {
  AI_CRAWLER_USER_AGENTS,
  LEGAL_NOINDEX_PATH,
} from "../lib/crawlerPolicy";

export default function robots(): MetadataRoute.Robots {
  const legalOnly = [LEGAL_NOINDEX_PATH];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: legalOnly,
      },
      ...AI_CRAWLER_USER_AGENTS.map((userAgent) => ({
        userAgent,
        disallow: legalOnly,
      })),
    ],
  };
}
