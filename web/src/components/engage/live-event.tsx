"use client";

import { motion, useReducedMotion } from "motion/react";
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
 * Shared "is an event live right now?" state for the home page. Piggybacks on
 * the module-cached `fetchEventStatus()`, so the pill, the card and the
 * banner all cost one request per page load. Null while loading / inactive —
 * both components render nothing then, keeping the server-rendered hero the
 * LCP.
 */
function useEventStatus(): EventStatus | null {
  const locale = useLocale();
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

  return status;
}

/** Pulsing live dot — ping ring + solid core in the shared live-red. */
function LiveDot({ size = "size-2" }: { size?: string }) {
  return (
    <span aria-hidden className={`relative flex shrink-0 ${size}`}>
      <span
        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 motion-reduce:animate-none"
        style={{ backgroundColor: LIVE_COLOR }}
      />
      <span
        className={`relative inline-flex rounded-full ${size}`}
        style={{
          backgroundColor: LIVE_COLOR,
          boxShadow: `0 0 8px color-mix(in oklab, ${LIVE_COLOR} 80%, transparent)`,
        }}
      />
    </span>
  );
}

/**
 * Hero LIVE pill: "Live at {name}" under the Almaty badge, only while an
 * event is active. Client-only by design (renders null on the server and
 * while fetching) — appears with a soft rise once the status lands. Links
 * down to the event card.
 */
export function LiveEventPill() {
  const t = useTranslations("live");
  const status = useEventStatus();
  const reducedMotion = useReducedMotion();

  if (!status) return null;

  return (
    <motion.a
      href="#live-event"
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="inline-flex items-center gap-2.5 rounded-full border px-4 py-1.5 text-xs font-semibold tracking-wide backdrop-blur transition-transform hover:-translate-y-0.5 motion-reduce:transform-none sm:text-sm"
      style={{
        borderColor: `color-mix(in oklab, ${LIVE_COLOR} 40%, var(--border))`,
        backgroundColor: `color-mix(in oklab, ${LIVE_COLOR} 10%, var(--background))`,
        color: `color-mix(in oklab, ${LIVE_COLOR} 60%, var(--foreground))`,
        boxShadow: `0 0 20px color-mix(in oklab, ${LIVE_COLOR} 22%, transparent)`,
      }}
    >
      <LiveDot />
      {t("badge", { name: status.name })}
    </motion.a>
  );
}

/**
 * Event card below the hero: image (fixed aspect, lazy — dynamic hub URL, so
 * a plain <img> instead of next/image), LIVE badge + event name, description,
 * the event's own link buttons (max 5, hub-validated + re-checked client
 * side) and the "I'm here, message me" Telegram CTA. Whole section is absent
 * from the DOM unless an event is live.
 */
export function LiveEventSection() {
  const t = useTranslations("live");
  const tCta = useTranslations("cta");
  const status = useEventStatus();
  const reducedMotion = useReducedMotion();
  // If /api/media 404s (file deleted/renamed on the hub), degrade to the
  // text-only card layout instead of a broken-image block.
  const [imageFailed, setImageFailed] = useState(false);

  if (!status) return null;

  const image = imageFailed ? null : status.image;

  function handleTelegramClick(event: MouseEvent<HTMLAnchorElement>) {
    // Rebuild at click time so the freshest first-touch UTM is embedded.
    event.currentTarget.href = buildTelegramUrl(
      CONTACT.telegramUsername,
      buildPrefillText(
        t("prefill", { name: status?.name ?? "" }),
        window.location.pathname,
        getStoredUtm(),
      ),
    );
    trackEvent("live_event_tg_click", { event: status?.name });
  }

  return (
    <motion.section
      id="live-event"
      aria-labelledby="live-event-title"
      className="mx-auto max-w-5xl scroll-mt-20 px-4 pb-6 sm:px-6"
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="card-surface bg-noise overflow-hidden"
        style={{
          borderColor: `color-mix(in oklab, ${LIVE_COLOR} 30%, var(--border))`,
          boxShadow: `0 12px 40px -18px color-mix(in oklab, ${LIVE_COLOR} 45%, transparent)`,
        }}
      >
        <div
          className={
            image ? "grid md:grid-cols-[minmax(0,4fr)_minmax(0,5fr)]" : ""
          }
        >
          {image && (
            <div className="relative aspect-[16/9] overflow-hidden md:aspect-auto md:h-full md:min-h-64">
              {/* eslint-disable-next-line @next/next/no-img-element -- dynamic hub media URL, next/image adds nothing here */}
              <img
                src={image}
                alt={status.name}
                loading="lazy"
                decoding="async"
                onError={() => setImageFailed(true)}
                className="absolute inset-0 h-full w-full object-cover"
              />
              {/* Soft fade into the card so the photo sits "in" the paper. */}
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, color-mix(in oklab, var(--background) 35%, transparent) 0%, transparent 30%)",
                }}
              />
            </div>
          )}

          <div className="flex flex-col items-start gap-4 p-6 sm:p-8">
            <p
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{
                borderColor: `color-mix(in oklab, ${LIVE_COLOR} 40%, var(--border))`,
                color: `color-mix(in oklab, ${LIVE_COLOR} 70%, var(--foreground))`,
                backgroundColor: `color-mix(in oklab, ${LIVE_COLOR} 8%, transparent)`,
              }}
            >
              <LiveDot />
              {t("title")}
            </p>

            <h2
              id="live-event-title"
              className="font-display text-2xl font-semibold tracking-tight sm:text-3xl"
            >
              {status.name}
            </h2>

            {status.description && (
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                {status.description}
              </p>
            )}

            <p className="text-sm font-medium">{t("come")}</p>

            <div className="mt-1 flex flex-wrap items-center gap-2.5">
              <a
                href={buildTelegramUrl(
                  CONTACT.telegramUsername,
                  tCta("prefill.hi"),
                )}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleTelegramClick}
                className="inline-flex h-11 items-center rounded-full px-5 text-sm font-semibold transition-transform hover:-translate-y-0.5 motion-reduce:transform-none"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${LIVE_COLOR} 0%, color-mix(in oklab, ${LIVE_COLOR} 70%, var(--accent)) 100%)`,
                  color: "var(--accent-foreground)",
                  boxShadow: `0 8px 20px -8px color-mix(in oklab, ${LIVE_COLOR} 60%, transparent)`,
                }}
              >
                {t("tg")}
              </a>

              {status.links.map((link, i) => (
                <a
                  key={`${i}-${link.url}`}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() =>
                    trackEvent("live_event_link_click", {
                      event: status.name,
                      label: link.label,
                    })
                  }
                  className="inline-flex h-11 items-center rounded-full border border-border px-5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
