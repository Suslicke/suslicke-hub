"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import {
  isPersona,
  PERSONA_STORAGE_KEY,
  siteConfig,
  type Persona,
} from "@/lib/config";

import { trackEvent } from "./engage-lib";

const EMOJI: Record<Persona, string> = {
  biz: "💼",
  dev: "💻",
  hr: "📄",
  hi: "👋",
};

/** Derive the active persona from the locale-less pathname ("/dev" → "dev"). */
function useActivePersona(): Persona | null {
  const pathname = usePathname(); // next-intl: no locale prefix
  const segment = pathname.split("/")[1] ?? "";
  return isPersona(segment) ? segment : null;
}

/**
 * Persist the choice + track. Navigation itself is the <Link>'s job — real
 * anchors keep the persona pages crawlable and middle-click/cmd-click work.
 */
function rememberPersona(persona: Persona) {
  try {
    window.localStorage.setItem(PERSONA_STORAGE_KEY, persona);
  } catch {
    // storage unavailable — navigation still works
  }
  trackEvent("persona_selected", { persona });
}

/**
 * The four big "Who are you?" chips for the hero (emoji + label). The active
 * persona is highlighted with its `--persona-*` accent. Rendered as real
 * locale-aware links (SSR-crawlable hrefs); selection also persists to
 * `localStorage sl_persona`.
 */
export function PersonaChips({ className }: { className?: string }) {
  const t = useTranslations("personas");
  const tHero = useTranslations("hero");
  const active = useActivePersona();

  return (
    <div className={className}>
      <p className="mb-3 text-sm font-medium text-muted-foreground">
        {tHero("whoAreYou")}
      </p>
      <nav
        aria-label={tHero("whoAreYou")}
        className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap"
      >
        {siteConfig.personas.map((persona) => {
          const isActive = active === persona;
          const accent = `var(--persona-${persona})`;
          return (
            <Link
              key={persona}
              href={`/${persona}`}
              onClick={() => rememberPersona(persona)}
              aria-current={isActive ? "page" : undefined}
              className={[
                "flex items-center gap-3 rounded-2xl border-2 bg-background px-5 py-4 text-left",
                "transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md",
                "motion-reduce:transform-none focus-visible:outline-2 focus-visible:outline-offset-2",
                isActive ? "shadow-md" : "border-border",
              ].join(" ")}
              style={
                isActive
                  ? { borderColor: accent, color: accent }
                  : undefined
              }
            >
              <span aria-hidden className="text-2xl">
                {EMOJI[persona]}
              </span>
              <span className="font-display text-sm font-semibold tracking-tight sm:text-base">
                {t(`${persona}.chip`)}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

/**
 * Compact pill switcher for the header — same behavior as the chips, sized
 * to sit next to the locale/theme toggles.
 */
export function PersonaPills({ className }: { className?: string }) {
  const t = useTranslations("personas");
  const active = useActivePersona();

  return (
    <nav
      className={[
        "flex items-center gap-1 rounded-full border border-border bg-background/60 p-1",
        className ?? "",
      ].join(" ")}
    >
      {siteConfig.personas.map((persona) => {
        const isActive = active === persona;
        const accent = `var(--persona-${persona})`;
        return (
          <Link
            key={persona}
            href={`/${persona}`}
            onClick={() => rememberPersona(persona)}
            aria-current={isActive ? "page" : undefined}
            className="rounded-full px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            style={
              isActive
                ? {
                    color: accent,
                    backgroundColor: `color-mix(in oklab, ${accent} 15%, transparent)`,
                  }
                : undefined
            }
          >
            {t(`${persona}.chip`)}
          </Link>
        );
      })}
    </nav>
  );
}
