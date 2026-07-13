import { getTranslations } from "next-intl/server";

import { BIZ_APPROACH_STEPS, BIZ_CASE_SLUGS, LINKS } from "@/content/facts";

/**
 * Business persona sections: cases with outcomes, how-I-work steps,
 * the studio bridge and a closing CTA. Server component — the page
 * stub renders heading/intro; this renders everything below.
 */
export default async function BizSections() {
  const t = await getTranslations("personas.biz");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-20 px-4 pb-24 sm:px-6">
      {/* Cases */}
      <section aria-labelledby="biz-cases">
        <h2
          id="biz-cases"
          className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {t("cases.title")}
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {BIZ_CASE_SLUGS.map((slug) => (
            <article
              key={slug}
              className="flex flex-col gap-3 rounded-card border border-persona-biz/25 bg-muted/40 p-6"
            >
              <span className="inline-flex w-fit items-center rounded-full bg-persona-biz/15 px-3 py-1 text-sm font-semibold text-foreground">
                {t(`cases.${slug}.result`)}
              </span>
              <h3 className="font-display text-lg font-semibold">
                {t(`cases.${slug}.title`)}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t(`cases.${slug}.body`)}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Approach */}
      <section aria-labelledby="biz-approach">
        <h2
          id="biz-approach"
          className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {t("approach.title")}
        </h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {BIZ_APPROACH_STEPS.map((step, index) => (
            <li key={step} className="rounded-card bg-muted/60 p-6">
              <span
                className="font-display text-sm font-semibold text-persona-biz"
                aria-hidden
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-2 font-display text-lg font-semibold">
                {t(`approach.${step}.title`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(`approach.${step}.body`)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Studio bridge */}
      <section
        aria-labelledby="biz-studio"
        className="rounded-card border border-persona-biz/30 bg-persona-biz/10 p-8 sm:p-10"
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
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-transform hover:-translate-y-0.5"
        >
          {t("studio.cta")}
          <span aria-hidden>&rarr;</span>
        </a>
      </section>

      {/* Closing CTA */}
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
    </div>
  );
}
