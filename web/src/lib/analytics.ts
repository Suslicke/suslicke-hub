/**
 * Minimal structural view of the PostHog instance that <PosthogLoader/>
 * exposes as `window.posthog` after the SDK is dynamically imported.
 */
type PosthogLike = {
  capture: (name: string, props?: Record<string, unknown>) => void;
};

/**
 * Every analytics global this site touches, declared once here: the loaders
 * (<PosthogLoader/>, <GoogleAnalytics/>, <YandexMetrika/>) assign them after
 * consent, `trackEvent()` reads them. All optional — none exists before the
 * visitor grants consent.
 */
declare global {
  interface Window {
    posthog?: PosthogLike;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    ym?: (...args: unknown[]) => void;
  }
}

/**
 * Build-time provider config (NEXT_PUBLIC_* are inlined at build). Each
 * provider is independently optional; a missing key turns that provider's
 * loader into a no-op.
 */
export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
export const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST;
export const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
export const METRIKA_ID = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;

/** PostHog needs both its key and host. */
export const posthogEnabled = Boolean(POSTHOG_KEY && POSTHOG_HOST);

/**
 * True when ANY consent-gated provider (PostHog, GA4, Yandex Metrika) is
 * configured — this is what <ConsentBanner/> gates on: no providers, nothing
 * to consent to. The first-party hit counter is cookieless and consent-free.
 */
export const analyticsEnabled = Boolean(posthogEnabled || GA_ID || METRIKA_ID);

/** localStorage key holding the visitor's consent decision. */
export const CONSENT_STORAGE_KEY = "sl_consent";
/** CustomEvent name dispatched (detail = decision) when consent is decided. */
export const CONSENT_EVENT = "sl:consent";

export type ConsentDecision = "granted" | "denied";

/**
 * Persist a consent decision under `sl_consent`. Storage failures (quota,
 * disabled storage, private mode) are swallowed — consent then simply stays
 * undecided on the next load.
 */
export function storeConsent(decision: ConsentDecision): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, decision);
  } catch {
    // ignore storage failures
  }
}

/** Read the stored consent decision. `null` when undecided or during SSR. */
export function readStoredConsent(): ConsentDecision | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Track a product event: fan-out to PostHog (`capture`), Google Analytics
 * (`gtag('event', ...)`) and Yandex Metrika (`reachGoal`). Every provider
 * global exists only after its consent-gated loader ran, so events are
 * consent-gated by construction; before that each branch is a silent no-op.
 * Each provider call is wrapped in its own try/catch so a failing one never
 * blocks the others. SSR-safe.
 */
export function trackEvent(
  name: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;

  try {
    window.posthog?.capture(name, params);
  } catch {
    // Analytics must never break the UI.
  }

  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", name, params);
    }
  } catch {
    // swallow provider errors so other providers still fire
  }

  try {
    if (METRIKA_ID && typeof window.ym === "function") {
      window.ym(Number(METRIKA_ID), "reachGoal", name, params);
    }
  } catch {
    // swallow provider errors so other providers still fire
  }
}
