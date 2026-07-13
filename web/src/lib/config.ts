/**
 * Single source of truth for locales, personas and the canonical URL.
 * Changing values here propagates to routing, static params and SEO.
 */
export const siteConfig = {
  url: "https://suslicke.com",
  locales: ["ru", "en"],
  defaultLocale: "en",
  personas: ["biz", "dev", "hr", "hi"],
} as const;

export type Locale = (typeof siteConfig.locales)[number];
export type Persona = (typeof siteConfig.personas)[number];

export function isPersona(value: string): value is Persona {
  return (siteConfig.personas as readonly string[]).includes(value);
}

/** localStorage key that remembers the visitor's persona choice. */
export const PERSONA_STORAGE_KEY = "sl_persona";

/**
 * Persona accents as HEX for the three.js hero scene (it can't parse the
 * oklch CSS variables). Approximations of the `--persona-*` values in
 * globals.css; keep in sync when the palette changes.
 */
export const PERSONA_ACCENT_HEX: Record<Persona, string> = {
  biz: "#a06e1d",
  dev: "#1f7f4c",
  hr: "#3567c8",
  hi: "#c04327",
};
