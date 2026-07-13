import { getTranslations } from "next-intl/server";

import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import { BIZ_APPROACH_STEPS, BIZ_CASE_SLUGS, LINKS } from "@/content/facts";

/**
 * Business persona sections: cases with outcomes (bento — the flagship
 * case is featured), how-I-work steps, the studio bridge and a closing
 * CTA. Server component — the page stub renders heading/intro; this
 * renders everything below.
 */
export default async function BizSections() {
  const t = await getTranslations("personas.biz");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-16 px-4 pb-24 sm:gap-20 sm:px-6">
      {/* Cases — featured first card, bento layout */}
      <section aria-labelledby="biz-cases">
        <Reveal>
          <SectionHeading id="biz-cases">{t("cases.title")}</SectionHeading>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {BIZ_CASE_SLUGS.map((slug, index) => (
            <Reveal
              key={slug}
              delay={index * 0.07}
              className={index === 0 ? "sm:col-span-2" : undefined}
            >
              <article className="card-surface card-lift bg-noise flex h-full flex-col gap-3 p-6 sm:p-7">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-persona-biz/30 bg-persona-biz/15 px-3 py-1 font-mono text-sm font-semibold">
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full bg-persona-biz"
                  />
                  {t(`cases.${slug}.result`)}
                </span>
                <h3 className="font-display text-lg font-semibold sm:text-xl">
                  {t(`cases.${slug}.title`)}
                </h3>
                <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  {t(`cases.${slug}.body`)}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Approach */}
      <section aria-labelledby="biz-approach">
        <Reveal>
          <SectionHeading id="biz-approach">
            {t("approach.title")}
          </SectionHeading>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {BIZ_APPROACH_STEPS.map((step, index) => (
            <Reveal key={step} delay={index * 0.08}>
              <div className="card-surface card-lift bg-noise h-full p-6">
                <span
                  className="font-display text-3xl font-semibold text-persona-biz/40"
                  aria-hidden
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-3 font-display text-lg font-semibold">
                  {t(`approach.${step}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {t(`approach.${step}.body`)}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Studio bridge */}
      <Reveal>
        <section
          aria-labelledby="biz-studio"
          className="bg-noise rounded-card border border-persona-biz/30 bg-persona-biz/10 p-6 sm:p-10"
        >
          <h2
            id="biz-studio"
            className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            {t("studio.title")}
          </h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
            {t("studio.body")}
          </p>
          <a
            href={LINKS.studio}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-transform hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transform-none"
          >
            {t("studio.cta")}
            <span aria-hidden>&rarr;</span>
          </a>
        </section>
      </Reveal>

      {/* Closing CTA */}
      <Reveal>
        <section aria-labelledby="biz-outro" className="text-center">
          <h2
            id="biz-outro"
            className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            {t("outro.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl leading-relaxed text-muted-foreground">
            {t("outro.body")}
          </p>
        </section>
      </Reveal>
    </div>
  );
}
