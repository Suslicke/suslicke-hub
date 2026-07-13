"use client";

import clsx from "clsx";
import { useLocale, useTranslations } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * RU/EN switcher. Replaces the locale prefix while preserving the current
 * pathname (persona pages switch in place).
 *
 * Mobile renders a single compact round button showing the locale you would
 * SWITCH TO (the header has ~150px of spare width at 390px); the two-pill
 * group appears from `sm` up.
 */
export function LocaleSwitch() {
  const t = useTranslations("a11y");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const next =
    routing.locales[
      (routing.locales.indexOf(locale as (typeof routing.locales)[number]) +
        1) %
        routing.locales.length
    ];

  return (
    <>
      <button
        type="button"
        aria-label={t("language")}
        onClick={() => router.replace(pathname, { locale: next })}
        className="inline-flex size-9 items-center justify-center rounded-full border border-border text-xs font-semibold uppercase text-muted-foreground transition-colors hover:text-foreground sm:hidden"
      >
        {next}
      </button>
      <div
        role="group"
        aria-label={t("language")}
        className="hidden items-center gap-1 rounded-full border border-border p-1 sm:inline-flex"
      >
        {routing.locales.map((l) => (
          <button
            key={l}
            type="button"
            aria-pressed={l === locale}
            onClick={() => router.replace(pathname, { locale: l })}
            className={clsx(
              "rounded-full px-2.5 py-1 text-xs font-medium uppercase transition-colors",
              l === locale
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {l}
          </button>
        ))}
      </div>
    </>
  );
}
