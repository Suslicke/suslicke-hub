"use client";

import clsx from "clsx";
import { useLocale, useTranslations } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/**
 * RU/EN pill switcher. Replaces the locale prefix while preserving the
 * current pathname (persona pages switch in place).
 */
export function LocaleSwitch() {
  const t = useTranslations("a11y");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div
      role="group"
      aria-label={t("language")}
      className="inline-flex items-center gap-1 rounded-full border border-border p-1"
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
  );
}
