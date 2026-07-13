import { getTranslations } from "next-intl/server";

import { LINKS } from "@/content/facts";

/**
 * The "let's actually meet" invitation strip, rendered on every page before
 * the footer: the owner's ask is that every visitor sees a warm nudge to
 * reach out even if they never met him in person.
 */
export async function ConnectCta() {
  const t = await getTranslations("connect");

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
      <div className="card-surface bg-noise relative overflow-hidden rounded-3xl border border-border p-6 text-center sm:p-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60% 80% at 50% 110%, color-mix(in oklab, var(--accent) 22%, transparent) 0%, transparent 70%)",
          }}
        />
        <h2 className="font-display relative text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("title")}
        </h2>
        <p className="relative mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
          {t("body")}
        </p>
        <div className="relative mt-6 flex flex-wrap items-center justify-center gap-3">
          <a
            href={LINKS.telegram}
            className="rounded-full px-6 py-3 text-sm font-semibold transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{
              backgroundImage:
                "linear-gradient(135deg, var(--accent) 0%, color-mix(in oklab, var(--accent) 78%, var(--foreground)) 100%)",
              color: "var(--accent-foreground)",
            }}
          >
            {t("button")}
          </a>
          <span className="text-xs text-muted-foreground">{t("hint")}</span>
        </div>
      </div>
    </section>
  );
}
