"use client";

import {useTranslations, useLocale} from "next-intl";
import { useEffect, useState, type MouseEvent } from "react";

import {
  buildPrefillText,
  buildTelegramUrl,
  CONTACT,
  fetchEventStatus,
  getStoredUtm,
  LIVE_COLOR,
  trackEvent,
  type EventStatus,
} from "./engage-lib";

/**
 * Thin event-mode banner meant to sit above the header on EVERY page. Reads
 * the shared `fetchEventStatus()` (nginx → hub, proxy-cached 30s; one request
 * per page load across banner/pill/card/survey) after mount and, when an
 * event is active, shows a pulsing live dot + "I'm at {name} right now" + an
 * inline Telegram CTA (the visitor is likely 20 meters away — shortest path
 * wins). Styled in the shared LIVE_COLOR so it reads as one system with the
 * hero LIVE pill. Renders nothing while loading, on error, or when no event
 * is active, so the static page never waits on the hub.
 */
export function EventBanner() {
  const t = useTranslations("event");
  const locale = useLocale();
  const tCta = useTranslations("cta");
  const [status, setStatus] = useState<EventStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchEventStatus(locale).then((data) => {
      if (!cancelled && data) setStatus(data);
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  if (!status) return null;

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    // Rebuild at click time so the freshest first-touch UTM is embedded.
    event.currentTarget.href = buildTelegramUrl(
      CONTACT.telegramUsername,
      buildPrefillText(
        tCta("prefill.hi"),
        window.location.pathname,
        getStoredUtm(),
      ),
    );
    trackEvent("event_banner_tg_click", { event: status?.name });
  }

  return (
    <div
      role="status"
      className="border-b"
      style={{
        borderColor: `color-mix(in oklab, ${LIVE_COLOR} 30%, var(--border))`,
        backgroundImage: `linear-gradient(90deg, color-mix(in oklab, ${LIVE_COLOR} 16%, var(--background)) 0%, color-mix(in oklab, ${LIVE_COLOR} 6%, var(--background)) 100%)`,
      }}
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm sm:px-6">
        <span aria-hidden className="relative flex size-2 shrink-0">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 motion-reduce:animate-none"
            style={{ backgroundColor: LIVE_COLOR }}
          />
          <span
            className="relative inline-flex size-2 rounded-full"
            style={{
              backgroundColor: LIVE_COLOR,
              boxShadow: `0 0 8px color-mix(in oklab, ${LIVE_COLOR} 80%, transparent)`,
            }}
          />
        </span>
        <span className="min-w-0 flex-1 font-medium">
          {t("badge", { name: status.name })}
        </span>
        <a
          href={buildTelegramUrl(CONTACT.telegramUsername, tCta("prefill.hi"))}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleClick}
          className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-transform hover:-translate-y-0.5 motion-reduce:transform-none"
          style={{
            backgroundColor: LIVE_COLOR,
            color: "var(--accent-foreground)",
          }}
        >
          {t("action")}
        </a>
      </div>
    </div>
  );
}
