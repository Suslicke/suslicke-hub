"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, type ChangeEvent } from "react";

import { PersonaPills } from "@/components/engage/persona-chips";
import { trackEvent } from "@/components/engage/engage-lib";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  isPersona,
  PERSONA_STORAGE_KEY,
  siteConfig,
  type Persona,
} from "@/lib/config";

import { LocaleSwitch } from "./locale-switch";
import { ThemeToggle } from "./theme-toggle";

/**
 * Compact select-like persona switcher for small screens (the pills need
 * horizontal room). A real <select> styled as a pill — native UX on touch.
 */
function PersonaSelect({ className }: { className?: string }) {
  const t = useTranslations("personas");
  const tHero = useTranslations("hero");
  const router = useRouter();
  const pathname = usePathname();
  const segment = pathname.split("/")[1] ?? "";
  const active: Persona | "" = isPersona(segment) ? segment : "";

  function onChange(event: ChangeEvent<HTMLSelectElement>) {
    const persona = event.target.value;
    if (!isPersona(persona)) return;
    try {
      window.localStorage.setItem(PERSONA_STORAGE_KEY, persona);
    } catch {
      // storage unavailable — navigation still works
    }
    trackEvent("persona_selected", { persona });
    router.push(`/${persona}`);
  }

  return (
    <select
      value={active}
      onChange={onChange}
      aria-label={tHero("whoAreYou")}
      className={[
        // Fixed width + clipping: a native select otherwise sizes itself to
        // its widest option and blows the 390px header layout apart.
        "h-9 w-28 appearance-none overflow-hidden text-ellipsis whitespace-nowrap rounded-full border border-border bg-background/70 px-3 pr-7 text-xs font-medium text-foreground backdrop-blur",
        "bg-[url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23888%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22/%3E%3C/svg%3E')] bg-[length:14px] bg-[position:right_0.6rem_center] bg-no-repeat",
        className ?? "",
      ].join(" ")}
    >
      <option value="" disabled>
        {tHero("whoAreYou")}
      </option>
      {siteConfig.personas.map((persona) => (
        <option key={persona} value={persona}>
          {t(`${persona}.chip`)}
        </option>
      ))}
    </select>
  );
}

/**
 * Header: transparent over the hero, gains a blur backdrop + hairline border
 * once the page scrolls. Name-logo → home, persona pills (≥md) or a compact
 * persona select (<md), locale + theme toggles.
 *
 * Mobile stays deliberately light: just the logo + locale/theme. The persona
 * select duplicates the hero chips, so it fades in only after the visitor has
 * scrolled past the hero (where the chips are no longer on screen).
 */
export function SiteHeader() {
  const t = useTranslations("hero");
  const [scrolled, setScrolled] = useState(false);
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 8);
      setPastHero(window.scrollY > window.innerHeight * 0.6);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={[
        "sticky top-0 z-40 transition-[background-color,border-color,box-shadow] duration-300",
        scrolled
          ? "border-b border-border bg-background/80 shadow-sm shadow-black/5 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-2 px-4 sm:gap-3 sm:px-6">
        <Link
          href="/"
          className="min-w-0 truncate font-display text-[13px] font-semibold tracking-tight transition-colors hover:text-accent sm:text-sm"
        >
          {t("title")}
        </Link>
        <PersonaPills className="hidden md:flex" />
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {pastHero && <PersonaSelect className="anim-rise md:hidden" />}
          <LocaleSwitch />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
