import { getTranslations } from "next-intl/server";

import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import { HI_INTERESTS, LINKS } from "@/content/facts";

/**
 * "Just saying hi" persona sections: a warm about card, interest
 * cards (bento) and a no-pressure "just write hello" CTA with Telegram
 * and Instagram links. Server component.
 */
export default async function HiSections() {
  const t = await getTranslations("personas.hi");
  const tCta = await getTranslations("cta");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-4 pb-24 sm:gap-20 sm:px-6">
      {/* About */}
      <Reveal>
        <section
          aria-labelledby="hi-about"
          className="bg-noise rounded-card border border-persona-hi/30 bg-persona-hi/10 p-6 sm:p-10"
        >
          <h2
            id="hi-about"
            className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            {t("about.title")}
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed">{t("about.body")}</p>
        </section>
      </Reveal>

      {/* Interests — bento */}
      <section aria-labelledby="hi-interests">
        <Reveal>
          <SectionHeading id="hi-interests">
            {t("interests.title")}
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
                <h3 className="font-display text-lg font-semibold text-persona-hi">
                  {t(`interests.${interest}.title`)}
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {t(`interests.${interest}.body`)}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Just say hi */}
      <Reveal>
        <section aria-labelledby="hi-outro" className="text-center">
          <h2
            id="hi-outro"
            className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            {t("outro.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-muted-foreground">
            {t("outro.body")}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href={LINKS.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-transform hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transform-none"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, var(--persona-hi) 0%, color-mix(in oklab, var(--persona-hi) 78%, var(--foreground)) 100%)",
                color: "var(--accent-foreground)",
                boxShadow:
                  "0 6px 18px -8px color-mix(in oklab, var(--persona-hi) 65%, transparent)",
              }}
            >
              {tCta("writeHello")}
              <span aria-hidden>&rarr;</span>
            </a>
            <a
              href={LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-foreground/25 px-5 py-2.5 text-sm font-medium transition-[transform,border-color] hover:-translate-y-0.5 hover:border-foreground/50 motion-reduce:transform-none"
            >
              {tCta("instagram")}
            </a>
          </div>
        </section>
      </Reveal>
    </div>
  );
}
