"use client";

import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { isPersona, PERSONA_STORAGE_KEY } from "@/lib/config";
import { getStoredUtm, persistUtm } from "@/lib/utm";

/**
 * First-party, cookieless visit counter — POSTs to the hub's `/api/hit`
 * (same-origin via nginx) on every App Router navigation.
 *
 * Deliberately NOT consent-gated: no cookies, no cross-site identifiers, the
 * hub derives daily uniques from a server-side day-scoped hash. This is the
 * "all visitors" layer; PostHog (consent-gated) is the second layer.
 *
 * Also owns first-touch UTM capture: persists `sl_utm` from the landing URL
 * before reading it, so the very first hit already carries `utm_source`.
 */
export function HitBeacon() {
  const pathname = usePathname();
  const locale = useLocale();
  // document.referrer only describes how the visitor arrived on the site, so
  // its hostname is sent once (first hit), then an empty string.
  const referrerSent = useRef(false);
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || lastSent.current === pathname) return;
    lastSent.current = pathname;

    // First-touch UTM: persist before reading (no-op after the first call),
    // then tell subscribers (sticky CTA, survey dialog) that `sl_utm` may
    // have changed — they re-read it on this event.
    persistUtm(window.location.search);
    try {
      window.dispatchEvent(new CustomEvent("sl:utm"));
    } catch {
      // CustomEvent unsupported — subscribers also read storage on mount.
    }

    let referrerHost = "";
    if (!referrerSent.current) {
      referrerSent.current = true;
      try {
        if (document.referrer) {
          const host = new URL(document.referrer).hostname;
          // Internal navigations (hard reloads aside) aren't a traffic source.
          if (host && host !== window.location.hostname) referrerHost = host;
        }
      } catch {
        // unparsable referrer — skip
      }
    }

    // Path without the locale prefix — locale travels as its own field.
    const path =
      pathname.replace(new RegExp(`^/${locale}(?=/|$)`), "") || "/";

    // Persona: route segment first (a direct /en/dev landing must report
    // "dev" immediately, and a stored choice must not leak onto other
    // persona pages), stored choice second (neutral pages).
    let persona = "";
    const segment = path.split("/")[1] ?? "";
    if (isPersona(segment)) {
      persona = segment;
    } else {
      try {
        const stored = window.localStorage.getItem(PERSONA_STORAGE_KEY);
        if (stored && isPersona(stored)) persona = stored;
      } catch {
        // storage unavailable — send without persona
      }
    }

    const payload = JSON.stringify({
      path,
      locale,
      persona,
      referrer_host: referrerHost,
      utm_source: getStoredUtm().utm_source ?? "",
    });

    try {
      // Blob keeps the Content-Type application/json (a bare string would be
      // sent as text/plain, which FastAPI's JSON body parsing rejects).
      const blob = new Blob([payload], { type: "application/json" });
      if (!navigator.sendBeacon?.("/api/hit", blob)) {
        void fetch("/api/hit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Counting visits must never break the page.
    }
  }, [pathname, locale]);

  return null;
}
