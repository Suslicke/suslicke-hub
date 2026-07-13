import { getTranslations } from "next-intl/server";

import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import {
  HAS_CV,
  HR_FACTS,
  HR_HIGHLIGHTS,
  LINKS,
  PROJECTS,
  STACK_FLAT,
} from "@/content/facts";

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
      {/* Achievement highlights — resume-verified numbers, stat cards */}
      <section aria-labelledby="hr-highlights">
        <Reveal>
          <SectionHeading id="hr-highlights">
            {t("highlights.title")}
          </SectionHeading>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HR_HIGHLIGHTS.map((item, index) => (
            <Reveal key={item} delay={index * 0.06}>
              <div className="card-surface card-lift bg-noise flex h-full flex-col p-6">
                <span className="font-display text-3xl font-semibold tracking-tight text-persona-hr sm:text-4xl">
                  {t(`highlights.items.${item}.value`)}
                </span>
                <p className="mt-2 text-sm font-medium leading-snug">
                  {t(`highlights.items.${item}.label`)}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {t(`highlights.items.${item}.body`)}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Quick facts */}
      <section aria-labelledby="hr-facts">
        <Reveal>
          <SectionHeading id="hr-facts">{t("facts.title")}</SectionHeading>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HR_FACTS.map((fact, index) => (
            <Reveal key={fact} delay={index * 0.07}>
              <div className="card-surface card-lift bg-noise h-full p-5">
                <span
                  aria-hidden
                  className="mb-3 block h-1 w-8 rounded-full bg-persona-hr"
                />
                <p className="text-sm font-medium leading-snug">
                  {t(`facts.${fact}`)}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Timeline — vertical accent line with ringed dots */}
      <section aria-labelledby="hr-timeline">
        <Reveal>
          <SectionHeading id="hr-timeline">{t("timeline.title")}</SectionHeading>
        </Reveal>
        <ol
          className="relative mt-10 ml-1.5 flex flex-col border-l-2"
          style={{
            borderImage:
              "linear-gradient(to bottom, var(--persona-hr), color-mix(in oklab, var(--persona-hr) 25%, transparent)) 1",
          }}
        >
          {PROJECTS.map((project, index) => (
            <li key={project.slug} className="relative pb-12 pl-8 last:pb-0">
              <span
                className="absolute -left-[9px] top-1 size-4 rounded-full border-[3px] border-background bg-persona-hr shadow-[0_0_0_3px_color-mix(in_oklab,var(--persona-hr)_25%,transparent)]"
                aria-hidden
              />
              <Reveal delay={index * 0.05}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="font-display text-lg font-semibold">
                    {t(`timeline.items.${project.slug}.title`)}
                  </h3>
                  {t.has(`timeline.items.${project.slug}.period`) && (
                    <span className="rounded-full border border-persona-hr/30 px-2.5 py-0.5 font-mono text-xs text-muted-foreground">
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
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* Stack chips */}
      <section aria-labelledby="hr-stack">
        <Reveal>
          <SectionHeading id="hr-stack">{t("stack.title")}</SectionHeading>
          <ul className="mt-6 flex flex-wrap gap-2">
            {STACK_FLAT.map((item) => (
              <li
                key={item}
                className="rounded-full border border-persona-hr/25 bg-persona-hr/10 px-3 py-1 font-mono text-sm font-medium transition-colors hover:border-persona-hr/50"
              >
                {item}
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      {/* LinkedIn + CV */}
      <Reveal>
        <section
          aria-labelledby="hr-links"
          className="bg-noise rounded-card border border-persona-hr/30 bg-persona-hr/10 p-8 sm:p-10"
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
              className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-transform hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transform-none"
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
                className="inline-flex items-center gap-2 rounded-full border border-foreground/25 px-5 py-2.5 text-sm font-medium transition-transform hover:-translate-y-0.5 motion-reduce:transform-none"
              >
                {tCta("downloadCv")}
              </a>
            )}
          </div>
        </section>
      </Reveal>
    </div>
  );
}
