import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/config";

/** Locale-less route paths. Home is the empty string. */
const ROUTES = [
  "",
  ...siteConfig.personas.map((p) => `/${p}`),
  "/privacy",
] as const;

/** Absolute URL for a locale + locale-less path. */
function abs(locale: string, path: string): string {
  return `${siteConfig.url}/${locale}${path}`;
}

/** hreflang language map (every locale + x-default) for a path. */
function languagesFor(path: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const loc of siteConfig.locales) {
    languages[loc] = abs(loc, path);
  }
  languages["x-default"] = abs(siteConfig.defaultLocale, path);
  return languages;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return siteConfig.locales.flatMap((locale) =>
    ROUTES.map((path) => ({
      url: abs(locale, path),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: path === "" ? 1 : 0.8,
      alternates: { languages: languagesFor(path) },
    })),
  );
}
