import { useTranslations } from "next-intl";

import { PersonaPills } from "@/components/engage/persona-chips";
import { Link } from "@/i18n/navigation";

import { LocaleSwitch } from "./locale-switch";
import { ThemeToggle } from "./theme-toggle";

/** Header: name-logo → home, persona pill switcher, locale + theme toggles. */
export function SiteHeader() {
  const t = useTranslations("hero");

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="shrink-0 font-display text-sm font-semibold tracking-tight"
        >
          {t("title")}
        </Link>
        {/* Pills need horizontal room — the hero chips cover persona
            selection on small screens. */}
        <PersonaPills className="hidden md:flex" />
        <div className="flex shrink-0 items-center gap-2">
          <LocaleSwitch />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
