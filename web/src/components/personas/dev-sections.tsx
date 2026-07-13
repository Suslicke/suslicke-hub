import { getTranslations } from "next-intl/server";

import {
  DEV_SITE_ITEMS,
  LINKS,
  PROJECTS,
  STACK_GROUPS,
} from "@/content/facts";

/**
 * Developer persona sections: stack by layer, experience with tech
 * chips, the "how this site works" breakdown (the site as an open
 * case study) and a GitHub CTA. Server component.
 */
export default async function DevSections() {
  const t = await getTranslations("personas.dev");
  const tCta = await getTranslations("cta");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-20 px-4 pb-24 sm:px-6">
      {/* Stack by layer */}
      <section aria-labelledby="dev-stack">
        <h2
          id="dev-stack"
          className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {t("stack.title")}
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {STACK_GROUPS.map((group) => (
            <div
              key={group.id}
              className="rounded-card border border-persona-dev/25 bg-muted/40 p-6"
            >
              <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-persona-dev">
                {t(`stack.groups.${group.id}`)}
              </h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="rounded-full bg-persona-dev/10 px-3 py-1 font-mono text-sm"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Experience */}
      <section aria-labelledby="dev-experience">
        <h2
          id="dev-experience"
          className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {t("experience.title")}
        </h2>
        <ul className="mt-8 flex flex-col gap-4">
          {PROJECTS.map((project) => (
            <li
              key={project.slug}
              className="rounded-card border-l-4 border-persona-dev/60 bg-muted/40 p-6"
            >
              <h3 className="font-display text-lg font-semibold">
                {t(`experience.${project.slug}.title`)}
              </h3>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {t(`experience.${project.slug}.body`)}
              </p>
              {project.tech.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {project.tech.map((tech) => (
                    <li
                      key={tech}
                      className="rounded-full border border-persona-dev/30 px-2.5 py-0.5 font-mono text-xs text-muted-foreground"
                    >
                      {tech}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* How this site works — the site as an open case study */}
      <section
        aria-labelledby="dev-site"
        className="rounded-card border border-persona-dev/30 bg-persona-dev/10 p-8 sm:p-10"
      >
        <h2
          id="dev-site"
          className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
        >
          {t("site.title")}
        </h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
          {t("site.intro")}
        </p>
        <ul className="mt-6 flex flex-col gap-4">
          {DEV_SITE_ITEMS.map((item) => (
            <li key={item} className="flex gap-3">
              <span
                className="mt-2 size-1.5 shrink-0 rounded-full bg-persona-dev"
                aria-hidden
              />
              <p className="text-sm leading-relaxed sm:text-base">
                {t(`site.items.${item}`)}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-muted-foreground">{t("site.github")}</p>
        <a
          href={LINKS.github}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-transform hover:-translate-y-0.5"
        >
          {tCta("github")}
          <span aria-hidden>&rarr;</span>
        </a>
      </section>

      {/* Closing CTA */}
      <section aria-labelledby="dev-outro" className="text-center">
        <h2
          id="dev-outro"
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
