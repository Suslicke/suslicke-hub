"use client";

import { useTranslations } from "next-intl";

import { PERSONA_ICONS } from "@/components/icons";
import { Link, usePathname } from "@/i18n/navigation";
import {
  isPersona,
  PERSONA_STORAGE_KEY,
  siteConfig,
  type Persona,
} from "@/lib/config";

import { trackEvent } from "./engage-lib";

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
 * The four big "Who are you?" touch-cards for the hero (inline SVG icon in a
 * persona-tinted tile + label + arrow). The active persona is highlighted
 * with its `--persona-*` accent ring. Rendered as real locale-aware links
 * (SSR-crawlable hrefs); selection also persists to `localStorage sl_persona`.
 */
export function PersonaChips({ className }: { className?: string }) {
  const t = useTranslations("personas");
  const tHero = useTranslations("hero");
  const active = useActivePersona();

  return (
    <div className={className}>
      <p className="mb-4 text-sm font-medium uppercase tracking-widest text-muted-foreground">
        {tHero("whoAreYou")}
      </p>
      <nav
        aria-label={tHero("whoAreYou")}
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
      >
        {siteConfig.personas.map((persona) => {
          const isActive = active === persona;
          const accent = `var(--persona-${persona})`;
          const Icon = PERSONA_ICONS[persona];
          return (
            <Link
              key={persona}
              href={`/${persona}`}
              onClick={() => rememberPersona(persona)}
              aria-current={isActive ? "page" : undefined}
              className={[
                "group flex flex-col gap-3 rounded-2xl border bg-background/80 p-4 backdrop-blur sm:p-5",
                "transition-[transform,border-color,box-shadow] duration-200",
                "hover:-translate-y-1 hover:shadow-lg active:translate-y-0 active:scale-[0.98]",
                "motion-reduce:transform-none",
                isActive ? "shadow-md" : "border-border",
              ].join(" ")}
              style={
                isActive
                  ? { borderColor: accent, boxShadow: `0 0 0 1px ${accent}` }
                  : undefined
              }
            >
              <span
                aria-hidden
                className="flex size-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 motion-reduce:transform-none"
                style={{
                  color: accent,
                  backgroundColor: `color-mix(in oklab, ${accent} 14%, transparent)`,
                }}
              >
                <Icon className="size-5" />
              </span>
              <span className="flex items-center justify-between gap-2">
                <span
                  className="font-display text-sm font-semibold leading-tight tracking-tight"
                  style={isActive ? { color: accent } : undefined}
                >
                  {t(`${persona}.chip`)}
                </span>
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className="size-4 shrink-0 text-muted-foreground opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-x-0.5 group-hover:opacity-100 motion-reduce:transform-none"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14m-6-6 6 6-6 6" />
                </svg>
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
        "flex items-center gap-1 rounded-full border border-border bg-background/60 p-1 backdrop-blur",
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
