import { getTranslations } from "next-intl/server";

import { HI_INTERESTS, LINKS } from "@/content/facts";

/**
 * "Just saying hi" persona sections: a warm about card, interest
 * cards and a no-pressure "just write hello" CTA with Telegram and
 * Instagram links. Server component.
 */
export default async function HiSections() {
  const t = await getTranslations("personas.hi");
  const tCta = await getTranslations("cta");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-20 px-4 pb-24 sm:px-6">
      {/* About */}
      <section
        aria-labelledby="hi-about"
        className="rounded-card border border-persona-hi/30 bg-persona-hi/10 p-8 sm:p-10"
      >
        <h2
          id="hi-about"
          className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {t("about.title")}
        </h2>
        <p className="mt-4 max-w-2xl leading-relaxed">{t("about.body")}</p>
      </section>

      {/* Interests */}
      <section aria-labelledby="hi-interests">
        <h2
          id="hi-interests"
          className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {t("interests.title")}
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {HI_INTERESTS.map((interest) => (
            <article
              key={interest}
              className="rounded-card border border-persona-hi/25 bg-muted/40 p-6"
            >
              <h3 className="font-display text-lg font-semibold text-persona-hi">
                {t(`interests.${interest}.title`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {t(`interests.${interest}.body`)}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Just say hi */}
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
            className="inline-flex items-center gap-2 rounded-full bg-persona-hi px-5 py-2.5 text-sm font-medium text-background transition-transform hover:-translate-y-0.5"
          >
            {tCta("writeHello")}
            <span aria-hidden>&rarr;</span>
          </a>
          <a
            href={LINKS.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-foreground/25 px-5 py-2.5 text-sm font-medium transition-transform hover:-translate-y-0.5"
          >
            {tCta("instagram")}
          </a>
        </div>
      </section>
    </div>
  );
}
