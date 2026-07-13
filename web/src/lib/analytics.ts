/**
 * Minimal structural view of the PostHog instance that <PosthogLoader/>
 * exposes as `window.posthog` after the SDK is dynamically imported.
 * Deliberately NOT a `declare global` augmentation — a local cast keeps the
 * shape private to this module (posthog-loader casts the same way when it
 * assigns the instance).
 */
type PosthogLike = {
  capture: (name: string, props?: Record<string, unknown>) => void;
};

function getPosthog(): PosthogLike | undefined {
  return (window as Window & { posthog?: PosthogLike }).posthog;
}

/**
 * PostHog build-time config. Both env vars are required — without them the
 * whole consent-gated analytics layer (loader AND consent banner) renders
 * nothing: no analytics → no consent to ask for.
 */
export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
export const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST;
export const analyticsEnabled = Boolean(POSTHOG_KEY && POSTHOG_HOST);

/** localStorage key holding the visitor's consent decision. */
export const CONSENT_STORAGE_KEY = "sl_consent";
/** CustomEvent name dispatched (detail = decision) when consent is decided. */
export const CONSENT_EVENT = "sl:consent";

export type ConsentDecision = "granted" | "denied";

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
 * Track a product event. Forwards to PostHog when it has been loaded (i.e.
 * the visitor consented); otherwise a silent no-op. SSR-safe.
 */
export function trackEvent(
  name: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  try {
    getPosthog()?.capture(name, params);
  } catch {
    // Analytics must never break the UI.
  }
}
