import type { Metadata } from "next";
import type { ComponentType } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { PersonaTransition } from "@/components/persona-transition";
import BizSections from "@/components/personas/biz-sections";
import DevSections from "@/components/personas/dev-sections";
import HiSections from "@/components/personas/hi-sections";
import HrSections from "@/components/personas/hr-sections";
import { SceneMount } from "@/components/scene/scene-mount";
import { routing } from "@/i18n/routing";
import {
  isPersona,
  PERSONA_ACCENT_HEX,
  siteConfig,
  type Locale,
  type Persona,
} from "@/lib/config";
import { buildMetadata } from "@/lib/seo";

const PERSONA_SECTIONS: Record<Persona, ComponentType> = {
  biz: BizSections,
  dev: DevSections,
  hr: HrSections,
  hi: HiSections,
};

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    siteConfig.personas.map((persona) => ({ locale, persona })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale; persona: string }>;
}): Promise<Metadata> {
  const { locale, persona } = await params;
  if (!isPersona(persona)) {
    return {};
  }

  const t = await getTranslations({
    locale,
    namespace: `personas.${persona}`,
  });

  return buildMetadata({
    locale,
    path: `/${persona}`,
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

/**
 * Persona view: compact hero (accented heading + intro, scene keyed to the
 * persona accent) and the persona's content sections, cross-faded on persona
 * switches. `data-persona` on <main> remaps `--accent` via globals.css so the
 * whole page (links, selection, event banner tint) follows the persona.
 */
export default async function PersonaPage({
  params,
}: {
  params: Promise<{ locale: Locale; persona: string }>;
}) {
  const { locale, persona } = await params;
  if (!isPersona(persona)) {
    notFound();
  }

  setRequestLocale(locale);

  const t = await getTranslations(`personas.${persona}`);
  const Sections = PERSONA_SECTIONS[persona];

  return (
    // Sticky-CTA clearance lives on the footer (--sticky-cta-height), not here.
    <main className="flex-1" data-persona={persona}>
      <PersonaTransition persona={persona}>
        {/* Compact hero — same full-bleed scene layer as home, persona-
            accented, under a readability vignette. */}
        <section className="relative -mt-14 overflow-hidden">
          {/* Wrapper is display:none below sm — minWidth={640} stops the
              WebGL chunk from downloading where it would be invisible. */}
          <div className="pointer-events-none absolute inset-0 hidden sm:block">
            <SceneMount accent={PERSONA_ACCENT_HEX[persona]} minWidth={640} />
          </div>
          <div
            aria-hidden
            className="hero-vignette pointer-events-none absolute inset-0 hidden sm:block"
          />

          <div className="relative z-10 mx-auto flex max-w-5xl flex-col items-start gap-6 px-4 pb-16 pt-28 sm:px-6 sm:pb-24 sm:pt-36">
            <p
              className="anim-rise inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-widest backdrop-blur"
              style={{
                color: `var(--persona-${persona})`,
                borderColor: `color-mix(in oklab, var(--persona-${persona}) 40%, transparent)`,
                backgroundColor: `color-mix(in oklab, var(--persona-${persona}) 10%, transparent)`,
              }}
            >
              <span
                aria-hidden
                className="size-1.5 rounded-full"
                style={{ backgroundColor: `var(--persona-${persona})` }}
              />
              {t("chip")}
            </p>

            {/* The LCP — no entrance animation. */}
            <h1 className="max-w-3xl font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
              <span className="text-gradient-accent">{t("heading")}</span>
            </h1>

            <p
              className="anim-rise max-w-xl text-lg leading-relaxed text-muted-foreground"
              style={{ animationDelay: "0.1s" }}
            >
              {t("intro")}
            </p>
          </div>
        </section>

        <Sections />
      </PersonaTransition>
    </main>
  );
}
