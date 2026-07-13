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

/**
 * Default OG/Twitter image, used by every page unless it passes its own
 * `images`. A build-time static PNG (repo convention: no runtime next/og);
 * source SVG lives in scripts/og.svg — regenerate with
 * `rsvg-convert -w 1200 -h 630 scripts/og.svg -o public/og.png`.
 * `metadataBase` below resolves the relative URL to the canonical origin.
 */
const DEFAULT_OG_IMAGES: OgImages = [
  {
    url: "/og.png",
    width: 1200,
    height: 630,
    alt: "Andrei Pustovoi (suslicke), Full Stack & AI Developer",
  },
];

export interface BuildMetadataArgs {
  /** App locale for this page. */
  locale: Locale;
  /** Locale-less route path, e.g. "" (home), "/dev". */
  path: string;
  title: string;
  description: string;
  /**
   * Render the title as-is, bypassing the layout's "%s · suslicke.com"
   * template. Used by the home page, whose title already contains the
   * "suslicke" nickname — the template would duplicate it.
   */
  titleAbsolute?: boolean;
  /** Per-page OG/Twitter images; defaults to the site-wide /og.png. */
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
  titleAbsolute,
  images,
}: BuildMetadataArgs): Metadata {
  const canonical = localePath(locale, path);
  const ogImages = images ?? DEFAULT_OG_IMAGES;

  // hreflang map: every locale + x-default -> defaultLocale path.
  const languages: Record<string, string> = {};
  for (const loc of siteConfig.locales) {
    languages[loc] = localePath(loc, path);
  }
  languages["x-default"] = localePath(siteConfig.defaultLocale, path);

  return {
    metadataBase: new URL(siteConfig.url),
    title: titleAbsolute ? { absolute: title } : title,
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
      alternateLocale: siteConfig.locales
        .filter((loc) => loc !== locale)
        .map((loc) => OG_LOCALE[loc]),
      images: ogImages,
    },
    twitter: {
      // An image is always present (default or per-page) — large card.
      card: "summary_large_image",
      title,
      description,
      images: ogImages,
    },
  };
}
