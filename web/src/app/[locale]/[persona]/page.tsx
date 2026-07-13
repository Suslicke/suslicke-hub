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
        {/* Compact hero — same scene layer as home, persona-accented. */}
        <section className="relative overflow-hidden">
          {/* Wrapper is display:none below sm — minWidth={640} stops the
              WebGL chunk from downloading where it would be invisible. */}
          <div className="pointer-events-none absolute inset-0 hidden sm:left-1/2 sm:block">
            <SceneMount accent={PERSONA_ACCENT_HEX[persona]} minWidth={640} />
          </div>

          <div className="relative z-10 mx-auto flex max-w-5xl flex-col gap-6 px-4 py-20 sm:px-6 sm:py-24">
            <h1
              className="max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-5xl"
              style={{ color: `var(--persona-${persona})` }}
            >
              {t("heading")}
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              {t("intro")}
            </p>
          </div>
        </section>

        <Sections />
      </PersonaTransition>
    </main>
  );
}
