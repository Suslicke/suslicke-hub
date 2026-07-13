"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  CONSENT_EVENT,
  readStoredConsent,
  storeConsent,
} from "@/lib/analytics";

/**
 * One-click consent withdrawal for the /privacy page (GDPR Art. 7(3):
 * withdrawing must be as easy as granting). Rendered only while the stored
 * decision is "granted" — once consent is granted the banner never returns,
 * so this is the in-UI way back.
 *
 * Withdrawing writes "denied" to `sl_consent`, dispatches the `sl:consent`
 * CustomEvent (same contract as <ConsentBanner/>) and reloads the page:
 * already-loaded GA / Metrika / PostHog tags cannot be unloaded in-page, so
 * the reload is what actually stops them.
 */
export function ConsentWithdraw() {
  const t = useTranslations("privacy.withdraw");
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    // Client-only read — avoids a hydration mismatch on the server render.
    setGranted(readStoredConsent() === "granted");
  }, []);

  if (!granted) return null;

  function withdraw() {
    storeConsent("denied");
    try {
      window.dispatchEvent(
        new CustomEvent(CONSENT_EVENT, { detail: "denied" }),
      );
    } catch {
      // CustomEvent unsupported — the reload below applies the decision.
    }
    window.location.reload();
  }

  return (
    <div className="mt-4 flex flex-col items-start gap-3 rounded-card border border-border bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm leading-snug text-muted-foreground">{t("note")}</p>
      <button
        type="button"
        onClick={withdraw}
        className="shrink-0 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent"
      >
        {t("button")}
      </button>
    </div>
  );
}
