"use client";

import type { PostHog } from "posthog-js";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  CONSENT_EVENT,
  POSTHOG_HOST,
  POSTHOG_KEY,
  posthogEnabled,
  readStoredConsent,
} from "@/lib/analytics";

/**
 * Consent-gated PostHog loader. The SDK is `import()`ed only AFTER the
 * visitor grants consent (stored `sl_consent` on mount, or the `sl:consent`
 * CustomEvent from <ConsentBanner/>), so posthog-js never touches the initial
 * bundle or the pre-consent network. Gated on both NEXT_PUBLIC_POSTHOG_KEY
 * and NEXT_PUBLIC_POSTHOG_HOST — without them this renders nothing at all.
 *
 * After init the instance is exposed as `window.posthog` for
 * `trackEvent()` in `@/lib/analytics`.
 */
export function PosthogLoader() {
  const pathname = usePathname();
  const startedRef = useRef(false);
  const posthogRef = useRef<PostHog | null>(null);
  // Pathname captured by the SDK's own initial pageview — SPA pageviews are
  // only fired manually for navigations AFTER this one.
  const lastCapturedPath = useRef<string | null>(null);

  useEffect(() => {
    if (!posthogEnabled || startedRef.current) return;

    const start = () => {
      if (startedRef.current) return;
      startedRef.current = true;

      // Deliberately NOT cancelled on unmount: init + the `window.posthog`
      // assignment are window-scoped singleton side effects, safe to finish
      // after the component is gone. A cancellation flag here broke dev
      // StrictMode (mount #1 started the import and set startedRef, its
      // cleanup cancelled it, mount #2 bailed on startedRef — PostHog never
      // initialized when consent was already stored).
      void import("posthog-js")
        .then(({ default: posthog }) => {
          // `__loaded` guards double-init across StrictMode / fast refresh.
          if (!posthog.__loaded) {
            posthog.init(POSTHOG_KEY!, {
              api_host: POSTHOG_HOST!,
              // Init happens strictly post-consent, so capturing starts
              // enabled — no opt-in dance needed.
              opt_out_capturing_by_default: false,
              // Build a person profile per (consented) visitor.
              person_profiles: "always",
              // SDK captures the initial pageview itself; SPA navigations
              // are captured manually below.
              capture_pageview: true,
              capture_pageleave: true,
            });
            // The PostHog project is shared with suslicketeam.com (free
            // plan): stamp every event from this site with a super property
            // so the two sites are separable in insights/filters.
            posthog.register({ site: "suslicke.com" });
          }
          posthogRef.current = posthog;
          // Expose for `trackEvent()` in @/lib/analytics (and engage-lib);
          // `window.posthog` is declared globally in @/lib/analytics.
          window.posthog = posthog;
          lastCapturedPath.current = window.location.pathname;
        })
        .catch(() => {
          // Blocked or offline — analytics stays silently off.
          startedRef.current = false;
        });
    };

    if (readStoredConsent() === "granted") {
      start();
    }

    const onConsent = (event: Event) => {
      if ((event as CustomEvent).detail === "granted") start();
    };
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => {
      window.removeEventListener(CONSENT_EVENT, onConsent);
    };
  }, []);

  // Manual $pageview per App Router navigation (the SDK only sees full loads).
  useEffect(() => {
    const posthog = posthogRef.current;
    if (!posthog?.__loaded || !pathname) return;
    if (lastCapturedPath.current === pathname) return;
    lastCapturedPath.current = pathname;

    let url = window.location.origin + pathname;
    if (window.location.search) url += window.location.search;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname]);

  return null;
}
