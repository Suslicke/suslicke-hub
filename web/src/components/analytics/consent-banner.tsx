"use client";

import { motion, useReducedMotion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  analyticsEnabled,
  CONSENT_EVENT,
  readStoredConsent,
  storeConsent,
  type ConsentDecision,
} from "@/lib/analytics";
import { Link } from "@/i18n/navigation";

/**
 * Compact bottom consent bar (deliberately not a modal — the single modal
 * budget belongs to the event survey popup). Shown only while no decision is
 * stored under `sl_consent`; a decision dispatches the `sl:consent`
 * CustomEvent so <PosthogLoader/> can start without a reload.
 *
 * Renders nothing when no consent-gated provider (PostHog, GA4, Yandex
 * Metrika) is configured: no analytics — nothing to consent to. The
 * first-party hit counter is cookieless and consent-free.
 *
 * Sits above the sticky CTA bar via `--sticky-cta-height` (a CSS variable the
 * CTA bar sets on :root; falls back to 0px when absent).
 */
export function ConsentBanner() {
  const t = useTranslations("consent");
  const reducedMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Decide visibility on the client only — avoids hydration mismatch.
    if (analyticsEnabled && readStoredConsent() === null) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function decide(decision: ConsentDecision) {
    storeConsent(decision);
    setVisible(false);
    try {
      window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: decision }));
    } catch {
      // CustomEvent unsupported — the next page load picks up stored consent.
    }
  }

  return (
    <motion.div
      initial={reducedMotion ? false : { y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      role="region"
      aria-label={t("text")}
      data-testid="consent-banner"
      className="fixed inset-x-0 z-50 px-4"
      style={{
        bottom:
          "calc(var(--sticky-cta-height, 0px) + env(safe-area-inset-bottom, 0px) + 0.75rem)",
      }}
    >
      <div className="mx-auto flex max-w-xl flex-col gap-3 rounded-card border border-border bg-background/95 p-4 shadow-xl shadow-black/10 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 sm:flex-row sm:items-center sm:gap-4">
        <p className="flex-1 text-sm leading-snug text-muted-foreground">
          {t("text")}{" "}
          <Link
            href="/privacy"
            className="whitespace-nowrap underline underline-offset-2 transition-colors hover:text-foreground"
          >
            {t("more")}
          </Link>
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => decide("denied")}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            {t("decline")}
          </button>
          <button
            type="button"
            onClick={() => decide("granted")}
            className="rounded-full px-4 py-2 text-sm font-semibold text-accent-foreground transition-[transform,opacity] hover:opacity-90 active:scale-[0.98]"
            style={{
              backgroundImage:
                "linear-gradient(135deg, var(--accent) 0%, color-mix(in oklab, var(--accent) 78%, var(--foreground)) 100%)",
            }}
          >
            {t("accept")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
