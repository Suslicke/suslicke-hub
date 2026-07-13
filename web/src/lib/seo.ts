import type { Metadata } from "next";

import { siteConfig, type Locale } from "@/lib/config";

type OgImages = NonNullable<NonNullable<Metadata["openGraph"]>["images"]>;

/**
 * Maps an app locale to its OpenGraph `og:locale` value (language_REGION).
 * hreflang itself stays region-less (plain `ru`/`en`).
 */
const OG_LOCALE: Record<Locale, string> = {
  ru: "ru_RU",
  en: "en_US",
};

const SITE_NAME = "suslicke.com";

export interface BuildMetadataArgs {
  /** App locale for this page. */
  locale: Locale;
  /** Locale-less route path, e.g. "" (home), "/dev". */
  path: string;
  title: string;
  description: string;
  /** Optional OG/Twitter images (build-time PNGs land in phase 2). */
  images?: OgImages;
}

/** Builds `/<locale><path>` (home => `/<locale>`). */
function localePath(locale: string, path: string): string {
  return `/${locale}${path}`;
}

/**
 * Builds a Next.js `Metadata` object with canonical + hreflang alternates
 * (ru/en + x-default), OpenGraph and Twitter cards for a localized route.
 * Studio `buildMetadata` pattern, trimmed to this site's two locales.
 */
export function buildMetadata({
  locale,
  path,
  title,
  description,
  images,
}: BuildMetadataArgs): Metadata {
  const canonical = localePath(locale, path);

  // hreflang map: every locale + x-default -> defaultLocale path.
  const languages: Record<string, string> = {};
  for (const loc of siteConfig.locales) {
    languages[loc] = localePath(loc, path);
  }
  languages["x-default"] = localePath(siteConfig.defaultLocale, path);

  return {
    metadataBase: new URL(siteConfig.url),
    title,
    description,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: OG_LOCALE[locale],
      ...(images ? { images } : {}),
    },
    twitter: {
      // No dedicated OG image yet (phase 2) — summary card, not large image.
      card: images ? "summary_large_image" : "summary",
      title,
      description,
      ...(images ? { images } : {}),
    },
  };
}
