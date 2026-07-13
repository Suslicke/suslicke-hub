import { getTranslations } from "next-intl/server";

import { HAS_CV, HR_FACTS, LINKS, PROJECTS, STACK_FLAT } from "@/content/facts";

/**
 * HR / recruiter persona sections: quick facts, an experience
 * timeline, a stack chip wall and LinkedIn/CV links. Server component.
 *
 * Periods are only rendered where they are verified facts
 * (`t.has(...)` — health and freelance carry a `period` key).
 */
export default async function HrSections() {
  const t = await getTranslations("personas.hr");
  const tCta = await getTranslations("cta");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-20 px-4 pb-24 sm:px-6">
      {/* Quick facts */}
      <section aria-labelledby="hr-facts">
        <h2
          id="hr-facts"
          className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {t("facts.title")}
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HR_FACTS.map((fact) => (
            <li
              key={fact}
              className="rounded-card border border-persona-hr/25 bg-muted/40 p-5 text-sm font-medium leading-snug"
            >
              {t(`facts.${fact}`)}
            </li>
          ))}
        </ul>
      </section>

      {/* Timeline */}
      <section aria-labelledby="hr-timeline">
        <h2
          id="hr-timeline"
          className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {t("timeline.title")}
        </h2>
        <ol className="mt-8 flex flex-col border-l-2 border-persona-hr/30">
          {PROJECTS.map((project) => (
            <li key={project.slug} className="relative pb-10 pl-8 last:pb-0">
              <span
                className="absolute -left-[7px] top-1.5 size-3 rounded-full border-2 border-background bg-persona-hr"
                aria-hidden
              />
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h3 className="font-display text-lg font-semibold">
                  {t(`timeline.items.${project.slug}.title`)}
                </h3>
                {t.has(`timeline.items.${project.slug}.period`) && (
                  <span className="text-sm text-muted-foreground">
                    {t(`timeline.items.${project.slug}.period`)}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-medium text-persona-hr">
                {t(`timeline.items.${project.slug}.role`)}
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                {t(`timeline.items.${project.slug}.body`)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Stack chips */}
      <section aria-labelledby="hr-stack">
        <h2
          id="hr-stack"
          className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {t("stack.title")}
        </h2>
        <ul className="mt-6 flex flex-wrap gap-2">
          {STACK_FLAT.map((item) => (
            <li
              key={item}
              className="rounded-full bg-persona-hr/10 px-3 py-1 text-sm font-medium"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* LinkedIn + CV */}
      <section
        aria-labelledby="hr-links"
        className="rounded-card border border-persona-hr/30 bg-persona-hr/10 p-8 sm:p-10"
      >
        <h2
          id="hr-links"
          className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {t("links.title")}
        </h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
          {t("links.body")}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={LINKS.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-transform hover:-translate-y-0.5"
          >
            {tCta("linkedin")}
            <span aria-hidden>&rarr;</span>
          </a>
          {/* Hidden until web/public/cv.pdf exists (HAS_CV) — a 404ing
              download is worse than one button fewer. */}
          {HAS_CV && (
            <a
              href={LINKS.cv}
              download
              className="inline-flex items-center gap-2 rounded-full border border-foreground/25 px-5 py-2.5 text-sm font-medium transition-transform hover:-translate-y-0.5"
            >
              {tCta("downloadCv")}
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
