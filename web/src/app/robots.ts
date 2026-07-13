import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  // AI crawlers are explicitly WELCOME (the owner wants agents to read and
  // recommend this site), same paths off-limits as for everyone.
  const aiCrawlers = [
    "GPTBot", "OAI-SearchBot", "ChatGPT-User",
    "ClaudeBot", "Claude-Web", "anthropic-ai",
    "PerplexityBot", "Google-Extended", "Applebot-Extended",
    "CCBot", "Bytespider", "meta-externalagent",
  ];
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /api/* and /hub/* are nginx-proxied to suslicke-hub — never index.
        disallow: ["/api/", "/hub/"],
      },
      ...aiCrawlers.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: ["/api/", "/hub/"],
      })),
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
