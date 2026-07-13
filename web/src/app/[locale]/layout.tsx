import type { Metadata, Viewport } from "next";
import { Inter, Unbounded } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { ConsentBanner } from "@/components/analytics/consent-banner";
import { GoogleAnalytics } from "@/components/analytics/google-analytics";
import { HitBeacon } from "@/components/analytics/hit-beacon";
import { PosthogLoader } from "@/components/analytics/posthog-loader";
import { YandexMetrika } from "@/components/analytics/yandex-metrika";
import { AsPersonaRedirect } from "@/components/engage/as-persona-redirect";
import { JsonLd } from "@/components/json-ld";
import { EventBanner } from "@/components/engage/event-banner";
import { StickyCtaRoute } from "@/components/engage/sticky-cta-route";
import { SurveyDialog } from "@/components/engage/survey-dialog";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { routing } from "@/i18n/routing";
import { siteConfig } from "@/lib/config";
import { personJsonLd, websiteJsonLd } from "@/lib/structured-data";

import "../globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// Tint the mobile address bar with the page background (hex approximations of
// --background in globals.css — keep in sync when the palette changes).
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4ede0" },
    { media: "(prefers-color-scheme: dark)", color: "#181d2e" },
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    metadataBase: new URL(siteConfig.url),
    title: {
      default: t("title"),
      template: "%s · suslicke.com",
    },
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Enable static rendering.
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${inter.variable} ${unbounded.variable}`}
    >
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        {/* Light-first by design — the shirt QR is scanned outdoors in
            daylight; no system-theme detection. */}
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <NextIntlClientProvider>
            {/* Site-wide entity graph: #person + #website. Page-level
                schemas (ProfilePage, BreadcrumbList) reference these @ids. */}
            <JsonLd data={personJsonLd()} />
            <JsonLd data={websiteJsonLd()} />
            <div className="flex min-h-dvh flex-col">
              <EventBanner />
              <SiteHeader />
              {/* Pages render their own <main> so persona routes can set
                  data-persona (remaps --accent via globals.css). */}
              {children}
              <SiteFooter />
            </div>

            {/* Conversion + measurement layer (all render null/overlays). */}
            <StickyCtaRoute />
            <SurveyDialog />
            <ConsentBanner />
            <PosthogLoader />
            <GoogleAnalytics />
            <YandexMetrika />
            {/* HitBeacon also owns first-touch UTM capture (`sl_utm`). */}
            <HitBeacon />
            {/* /qr event deep-link: `/?as=<persona>` → `/{persona}`. */}
            <AsPersonaRedirect />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
