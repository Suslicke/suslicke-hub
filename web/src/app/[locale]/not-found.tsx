import { getTranslations } from "next-intl/server";

import { SceneMount } from "@/components/scene/scene-mount";
import { Link } from "@/i18n/navigation";
import { LINKS } from "@/content/facts";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <main className="relative -mt-14 flex flex-1 flex-col overflow-hidden">
      {/* The particle field assembles into a literal "404" — and stays
          interactive: it scatters away from the pointer and ripples on tap. */}
      <div className="pointer-events-none absolute inset-0">
        <SceneMount glyph="404" />
      </div>
      <div className="hero-vignette pointer-events-none absolute inset-0" />

      <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col items-start justify-center gap-6 px-4 pt-28 pb-16 sm:px-6">
        <p className="font-mono text-sm tracking-[0.3em] text-muted-foreground uppercase">
          404
        </p>
        <h1 className="font-display text-[clamp(2.2rem,9vw,4rem)] font-semibold tracking-tight text-gradient-accent">
          {t("title")}
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          {t("description")}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {t("back")}
          </Link>
          <a
            href={LINKS.telegram}
            className="rounded-full border border-border px-5 py-2.5 text-sm transition-colors hover:border-accent hover:text-accent"
          >
            {t("telegram")}
          </a>
        </div>
        <p className="text-xs text-muted-foreground/70">{t("hint")}</p>
      </div>
    </main>
  );
}
