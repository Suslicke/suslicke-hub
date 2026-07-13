import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /api/* and /hub/* are nginx-proxied to suslicke-hub — never index.
        disallow: ["/api/", "/hub/"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
