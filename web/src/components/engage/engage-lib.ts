/**
 * Shared client-side helpers for the engage components (sticky CTA, chips,
 * event banner, survey). UTM capture and analytics live in `@/lib/utm` and
 * `@/lib/analytics` — re-exported here so the engage components keep a single
 * local import; this file only OWNS the contact constants, the messenger URL
 * builders and small misc helpers.
 */

import type { UtmParams as Utm } from "@/lib/utm";

export {
  getStoredUtm,
  parseUtm,
  persistUtm,
  type UtmParams,
} from "@/lib/utm";
export { trackEvent } from "@/lib/analytics";

/** Contact endpoints used by the CTAs. Facts only — do not invent more. */
export const CONTACT = {
  /** Personal Telegram (t.me/Suslicke). */
  telegramUsername: "Suslicke",
  /** Studio WhatsApp — used for the `biz` persona. */
  studioWhatsapp: "+77066998879",
  /** Personal phone — vCard + in-app-browser copy fallback. */
  phone: "+77474772302",
} as const;

/** Bare host for prefill texts, e.g. "suslicke.com". */
export const SITE_HOST = "suslicke.com";

// ---------------------------------------------------------------------------
// Event status (rich-event contract with the hub)
// ---------------------------------------------------------------------------

export interface EventLink {
  label: string;
  url: string;
}

/**
 * Public `/api/event-status` payload: when `active`, `name`/`description` are
 * set, `image` is a same-origin `/api/media/<file>` path (or null) and `links`
 * holds up to 5 `{label, url}` buttons. Inactive events zero everything out.
 */
export interface EventStatus {
  active: boolean;
  name: string;
  description: string;
  image: string | null;
  links: EventLink[];
}

/**
 * Warm live-red for everything "LIVE" (banner, hero pill, event card, glows).
 * Deliberately NOT `--accent`: the accent is persona-remapped terracotta,
 * while LIVE must read as "happening right now" in both themes.
 */
export const LIVE_COLOR = "oklch(0.62 0.2 29)";

let eventStatusPromise: Promise<EventStatus | null> | null = null;

/** Defensive parse — the UI never trusts the hub payload shape blindly. */
function normalizeEventStatus(data: unknown): EventStatus | null {
  if (!data || typeof data !== "object") return null;
  const raw = data as Record<string, unknown>;
  if (raw.active !== true || typeof raw.name !== "string" || !raw.name) {
    return null;
  }
  const links = Array.isArray(raw.links)
    ? raw.links
        .filter(
          (link): link is EventLink =>
            !!link &&
            typeof link === "object" &&
            typeof (link as EventLink).label === "string" &&
            (link as EventLink).label.trim().length > 0 &&
            typeof (link as EventLink).url === "string" &&
            /^https?:\/\//.test((link as EventLink).url),
        )
        .slice(0, 5)
    : [];
  return {
    active: true,
    name: raw.name,
    description: typeof raw.description === "string" ? raw.description : "",
    // Same-origin media path only ("/api/media/<file>") — never a foreign URL.
    // The contract prefix also rejects protocol-relative "//host/…" URLs.
    image:
      typeof raw.image === "string" && raw.image.startsWith("/api/media/")
        ? raw.image
        : null,
    links,
  };
}

/**
 * Fetch `/api/event-status` once per page load (module-level promise cache) —
 * the banner, hero pill, event card and survey all share the same request.
 * Resolves to null while the hub is down or no event is active, so the static
 * page never depends on it.
 */
export function fetchEventStatus(): Promise<EventStatus | null> {
  if (!eventStatusPromise) {
    eventStatusPromise = fetch("/api/event-status")
      .then((res) => (res.ok ? (res.json() as Promise<unknown>) : null))
      .then(normalizeEventStatus)
      .catch(() => null);
  }
  return eventStatusPromise;
}

// ---------------------------------------------------------------------------
// Messenger URL builders
// ---------------------------------------------------------------------------

/**
 * Compose the prefilled messenger text: persona prefill + readable current
 * URL + a short first-touch UTM tail (so it's visible in-chat who came from
 * where — the shirt, an event campaign, …).
 */
export function buildPrefillText(
  prefill: string,
  pathname: string,
  utm: Utm,
): string {
  const url = `${SITE_HOST}${pathname === "/" ? "" : pathname}`;
  const tail = [utm.utm_source, utm.utm_campaign].filter(Boolean).join("/");
  return `${prefill} ${url}${tail ? ` [${tail}]` : ""}`;
}

/** Telegram deep link with prefilled `?text=`. */
export function buildTelegramUrl(username: string, text: string): string {
  const safe = username.replace(/^@/, "").replace(/[^A-Za-z0-9_]/g, "");
  return `https://t.me/${safe}?text=${encodeURIComponent(text)}`;
}

/** WhatsApp click-to-chat link with prefilled `?text=`. */
export function buildWhatsappUrl(number: string, text: string): string {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

/**
 * Slugify an event name for the once-per-event localStorage key
 * `sl_ev_<slug>`. Keeps unicode letters (event names may be Cyrillic).
 */
export function slugifyEventName(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\p{L}\p{N}-]/gu, "")
      .replace(/-+/g, "-")
      .slice(0, 60) || "event"
  );
}

/**
 * Detect in-app browsers (Telegram / Instagram / Facebook webviews) that block
 * `.vcf` downloads — the sticky CTA shows a "copy the number" fallback there.
 */
export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /telegram|instagram|fbav|fban|line\//i.test(navigator.userAgent);
}
