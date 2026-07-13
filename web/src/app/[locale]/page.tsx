import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LiveEventPill, LiveEventSection } from "@/components/engage/live-event";
import { PersonaChips } from "@/components/engage/persona-chips";
import { JsonLd } from "@/components/json-ld";
import { Reveal } from "@/components/reveal";
import { SceneMount } from "@/components/scene/scene-mount";
import { SectionHeading } from "@/components/section-heading";
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
 * voxel-QR scene as a full-bleed background behind a soft vignette, the
 * "Who are you?" persona chips and a short neutral section (reuses the `hi`
 * copy) for visitors who don't pick a door.
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
          behind it (absolute, aria-hidden, pointer-events-none), under a
          vignette that fades its edges into the page background. */}
      <section className="relative -mt-14 overflow-hidden">
        {/* Live scene everywhere on the home hero: touch interactivity (finger
            repulsion, tap ripple) is the wow moment for QR visitors, who are
            mostly on phones. The scene self-reduces particle count on small
            viewports and idle-loads after LCP; persona pages stay on the
            cheap SVG poster (minWidth=640) to keep them light. */}
        <div className="pointer-events-none absolute inset-0 opacity-80 sm:opacity-100">
          <SceneMount />
        </div>
        {/* Readability vignette above the scene, below the content. */}
        <div aria-hidden className="hero-vignette pointer-events-none absolute inset-0" />

        <div className="relative z-10 mx-auto flex min-h-[92dvh] max-w-5xl flex-col justify-center gap-8 px-4 pb-12 pt-24 sm:gap-10 sm:px-6 sm:pb-16 sm:pt-28">
          <div className="flex max-w-3xl flex-col items-start gap-5">
            <p className="anim-rise inline-flex items-center gap-2.5 rounded-full border border-border bg-background/70 px-4 py-1.5 text-xs font-medium tracking-wide text-muted-foreground backdrop-blur sm:text-sm">
              <span aria-hidden className="relative flex size-2">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:animate-none"
                  style={{ backgroundColor: "var(--accent)" }}
                />
                <span
                  className="relative inline-flex size-2 rounded-full"
                  style={{ backgroundColor: "var(--accent)" }}
                />
              </span>
              {t("badge")}
            </p>

            {/* Event mode: pulsing "Live at {name}" pill, client-only —
                renders nothing unless the hub reports an active event, so the
                hero LCP never waits on it. */}
            <LiveEventPill />

            {/* The LCP — no entrance animation, gradient ink only. clamp()
                keeps "Андрей Пустовой" wrapping as clean word-per-line down
                to 320px instead of breaking mid-word. */}
            <h1 className="font-display text-[clamp(2.5rem,11.5vw,4.5rem)] font-semibold leading-[1.05] tracking-tight">
              <span className="text-gradient-accent">{t("title")}</span>
            </h1>

            <p
              className="anim-rise max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl"
              style={{ animationDelay: "0.1s" }}
            >
              {t("tagline")}
            </p>
          </div>

          <div className="anim-rise" style={{ animationDelay: "0.2s" }}>
            <PersonaChips className="max-w-3xl" />
          </div>

          <p
            className="anim-rise flex items-center gap-2 text-xs text-muted-foreground"
            style={{ animationDelay: "0.35s" }}
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="animate-drift size-4 motion-reduce:animate-none"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 4v16m0 0-5-5m5 5 5-5" />
            </svg>
            {t("scrollHint")}
          </p>
        </div>
      </section>

      {/* Event mode: rich live-event card (image, description, links, TG
          CTA). Client-only, absent unless an event is active. */}
      <LiveEventSection />

      {/* Neutral brief — a couple of sections from the `hi` copy. */}
      <section
        aria-labelledby="home-about"
        className="mx-auto max-w-5xl px-4 py-16 sm:px-6"
      >
        <Reveal>
          <SectionHeading id="home-about">{tHi("about.title")}</SectionHeading>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {tHi("about.body")}
          </p>
        </Reveal>
      </section>

      <section
        aria-labelledby="home-interests"
        className="mx-auto max-w-5xl px-4 pb-8 sm:px-6"
      >
        <Reveal>
          <SectionHeading id="home-interests">
            {tHi("interests.title")}
          </SectionHeading>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {HI_INTERESTS.map((interest, index) => (
            <Reveal
              key={interest}
              delay={index * 0.07}
              className={
                index === 0 || index === HI_INTERESTS.length - 1
                  ? "sm:col-span-2"
                  : undefined
              }
            >
              <article className="card-surface card-lift bg-noise h-full p-6 sm:p-7">
                <h3 className="font-display text-lg font-semibold">
                  {tHi(`interests.${interest}.title`)}
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {tHi(`interests.${interest}.body`)}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    </main>
  );
}
