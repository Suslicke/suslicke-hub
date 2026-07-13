"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { CONSENT_EVENT, GA_ID, readStoredConsent } from "@/lib/analytics";

/**
 * Consent-gated Google Analytics 4. This site's rule is "no third-party
 * request before consent", so instead of GA's Consent Mode v2 (which still
 * loads gtag.js and sends cookieless pings pre-consent) the tag is NOT
 * loaded at all until the visitor grants consent — stored `sl_consent` on
 * mount, or the `sl:consent` CustomEvent from <ConsentBanner/>. Simpler and
 * stricter, and consistent with the PostHog / Metrika loaders.
 *
 * On start: gtag.js is injected, `gtag('config', ID)` sends the first
 * page_view for the page consent was granted on; App Router navigations
 * (which don't reload) fire a manual `page_view` event per pathname change.
 *
 * Gated on NEXT_PUBLIC_GA_ID (inlined at build time); renders nothing
 * without it.
 */
export function GoogleAnalytics() {
  const pathname = usePathname();
  const loadedRef = useRef(false);
  // Path covered by the `config` hit — SPA page_views are only fired for
  // navigations AFTER that one.
  const lastSentPath = useRef<string | null>(null);

  useEffect(() => {
    if (!GA_ID) return;

    const start = () => {
      if (loadedRef.current) return;
      loadedRef.current = true;

      // Stock gtag bootstrap. gtag() must push the `arguments` object itself
      // (gtag.js ignores plain arrays), hence no rest parameters here.
      window.dataLayer = window.dataLayer || [];
      window.gtag =
        window.gtag ||
        function gtag() {
          // eslint-disable-next-line prefer-rest-params
          window.dataLayer!.push(arguments);
        };
      window.gtag("js", new Date());
      // `config` sends the initial page_view itself.
      window.gtag("config", GA_ID);
      lastSentPath.current = window.location.pathname;

      const src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
      if (![...document.scripts].some((s) => s.src === src)) {
        const script = document.createElement("script");
        script.async = true;
        script.src = src;
        document.head.appendChild(script);
      }
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

  // Manual page_view per App Router navigation (gtag only sees full loads).
  useEffect(() => {
    if (!loadedRef.current || !pathname) return;
    if (lastSentPath.current === pathname) return;
    lastSentPath.current = pathname;

    let url = window.location.origin + pathname;
    if (window.location.search) url += window.location.search;
    window.gtag?.("event", "page_view", {
      page_location: url,
      page_title: document.title,
    });
  }, [pathname]);

  return null;
}
