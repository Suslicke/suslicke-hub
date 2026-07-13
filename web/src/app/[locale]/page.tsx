import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PersonaChips } from "@/components/engage/persona-chips";
import { JsonLd } from "@/components/json-ld";
import { SceneMount } from "@/components/scene/scene-mount";
import { HI_INTERESTS } from "@/content/facts";
import { siteConfig, type Locale } from "@/lib/config";
import { buildMetadata } from "@/lib/seo";
import { profilePageJsonLd } from "@/lib/structured-data";

export function generateStaticParams() {
  return siteConfig.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return buildMetadata({
    locale,
    path: "",
    title: t("title"),
    description: t("description"),
  });
}

/**
 * Neutral home view: server-rendered hero (the name is the LCP), the lazy
 * voxel-QR scene behind it, the "Who are you?" persona chips and a short
 * neutral section (reuses the `hi` copy) for visitors who don't pick a door.
 */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("hero");
  const tHi = await getTranslations("personas.hi");

  return (
    // Sticky-CTA clearance lives on the footer (--sticky-cta-height), not here.
    <main className="flex-1">
      <JsonLd data={profilePageJsonLd(locale)} />

      {/* Hero — text stays the server-rendered LCP; the scene mounts lazily
          behind it (absolute, aria-hidden, pointer-events-none). */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-25 sm:left-1/2 sm:opacity-100">
          <SceneMount />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[70dvh] max-w-5xl flex-col justify-center gap-8 px-4 py-20 sm:px-6">
          <div className="flex max-w-2xl flex-col gap-4">
            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-6xl">
              {t("title")}
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              {t("tagline")}
            </p>
          </div>

          <PersonaChips className="max-w-2xl" />

          <p className="text-xs text-muted-foreground">{t("scrollHint")}</p>
        </div>
      </section>

      {/* Neutral brief — a couple of sections from the `hi` copy. */}
      <section
        aria-labelledby="home-about"
        className="mx-auto max-w-5xl px-4 py-16 sm:px-6"
      >
        <h2
          id="home-about"
          className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {tHi("about.title")}
        </h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
          {tHi("about.body")}
        </p>
      </section>

      <section
        aria-labelledby="home-interests"
        className="mx-auto max-w-5xl px-4 pb-8 sm:px-6"
      >
        <h2
          id="home-interests"
          className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {tHi("interests.title")}
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {HI_INTERESTS.map((interest) => (
            <article
              key={interest}
              className="rounded-card border border-border bg-muted/40 p-6"
            >
              <h3 className="font-display text-lg font-semibold">
                {tHi(`interests.${interest}.title`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {tHi(`interests.${interest}.body`)}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
