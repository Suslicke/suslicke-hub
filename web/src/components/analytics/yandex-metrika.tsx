"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { CONSENT_EVENT, METRIKA_ID, readStoredConsent } from "@/lib/analytics";

// `window.ym` is declared globally in `@/lib/analytics`; the loader needs the
// richer shape (it sets `.a`/`.l`), used via a local cast to avoid a
// conflicting global re-declaration.
type Ym = ((...args: unknown[]) => void) & { a?: unknown[][]; l?: number };

/**
 * Consent-gated Yandex Metrika (studio pattern). Metrika has no native
 * consent mode, and Webvisor records full sessions — so the tag is NOT
 * loaded at all until the visitor grants consent: stored `sl_consent` on
 * mount, or the `sl:consent` CustomEvent from <ConsentBanner/>. Until then
 * no Yandex script loads, no cookies are set, Webvisor records nothing —
 * consent-gated by construction.
 *
 * SPA hits: the tag only sees the initial load, so App Router navigations
 * fire a manual `ym('hit', url)` per pathname change.
 *
 * Gated on NEXT_PUBLIC_YANDEX_METRIKA_ID (inlined at build time); renders
 * nothing without it. The <noscript> pixel from Yandex's stock snippet is
 * intentionally omitted: it would fire unconditionally and can't respect
 * consent.
 */
export function YandexMetrika() {
  const pathname = usePathname();
  const loadedRef = useRef(false);
  // Path covered by the tag's own first hit — SPA hits are only fired for
  // navigations AFTER that one.
  const lastSentPath = useRef<string | null>(null);

  useEffect(() => {
    if (!METRIKA_ID) return;

    const start = () => {
      if (loadedRef.current) return;
      loadedRef.current = true;
      lastSentPath.current = window.location.pathname;
      if (typeof window.ym === "function") return; // tag already present

      // Stock Metrika loader (counter id from env), de-duped on re-injection.
      const src = `https://mc.yandex.ru/metrika/tag.js?id=${METRIKA_ID}`;
      const ym: Ym = (window.ym =
        window.ym ||
        function (...args: unknown[]) {
          (ym.a = ym.a || []).push(args);
        });
      ym.l = Number(new Date());

      if (![...document.scripts].some((s) => s.src === src)) {
        const script = document.createElement("script");
        script.async = true;
        script.src = src;
        document.head.appendChild(script);
      }

      window.ym(Number(METRIKA_ID), "init", {
        ssr: true,
        webvisor: true,
        clickmap: true,
        accurateTrackBounce: true,
        trackLinks: true,
        // The tag loads post-consent, possibly after SPA navigations — pin
        // the first hit's url/referrer to the real current values.
        url: window.location.href,
        referrer: document.referrer,
      });
    };

    // Start now if consent was granted in a previous session…
    if (readStoredConsent() === "granted") start();

    // …or the moment the banner reports a grant in this session.
    const onConsent = (event: Event) => {
      if ((event as CustomEvent).detail === "granted") start();
    };
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, []);

  // Manual hit per App Router navigation (the tag only sees full loads).
  useEffect(() => {
    if (!loadedRef.current || !pathname) return;
    if (lastSentPath.current === pathname) return;
    lastSentPath.current = pathname;

    if (!METRIKA_ID || typeof window.ym !== "function") return;
    let url = window.location.origin + pathname;
    if (window.location.search) url += window.location.search;
    window.ym(Number(METRIKA_ID), "hit", url);
  }, [pathname]);

  return null;
}
