"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type MouseEvent } from "react";

import { LINKS } from "@/content/facts";
import type { Persona } from "@/lib/config";

import {
  buildPrefillText,
  buildTelegramUrl,
  buildWhatsappUrl,
  CONTACT,
  getStoredUtm,
  isInAppBrowser,
  persistUtm,
  trackEvent,
  type UtmParams,
} from "./engage-lib";

export interface StickyCtaProps {
  /** Active persona (route-driven); `null`/omitted on the neutral view. */
  persona?: Persona | null;
}

/**
 * The primary conversion surface: a fixed bottom bar on mobile (a compact
 * corner card on desktop) with two actions — [message on Telegram / studio
 * WhatsApp for `biz` / LinkedIn for `hr`] and [save contact → /vcard.vcf].
 * (Design doc specs hr → "LinkedIn/CV"; the secondary stays the vCard because
 * saving the contact is the site-wide conversion #1 and the CV PDF doesn't
 * exist yet — see HAS_CV in @/content/facts.)
 *
 * The messenger href embeds the persona prefill + current URL + first-touch
 * UTM and is rebuilt at click time (studio `messenger-cta.tsx` pattern) so the
 * opened chat always carries the freshest captured campaign. In in-app
 * browsers (Telegram/Instagram block `.vcf` downloads) a "copy the number"
 * fallback appears next to "save contact".
 */
export function StickyCta({ persona = null }: StickyCtaProps) {
  const t = useTranslations("cta");

  const [utm, setUtm] = useState<UtmParams>({});
  const [pathname, setPathname] = useState("/");
  const [inApp, setInApp] = useState(false);
  const [copied, setCopied] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  // Publish the bar's height as `--sticky-cta-height` on :root so the consent
  // banner (and anything else fixed to the bottom) can sit above it.
  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const root = document.documentElement;
    const update = () =>
      root.style.setProperty("--sticky-cta-height", `${bar.offsetHeight}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(bar);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--sticky-cta-height");
    };
  }, []);

  // Resolve client-only state after mount. persistUtm is idempotent
  // (first-touch wins), so calling it here protects against effect ordering
  // vs whichever component captures UTM globally; `sl:utm` keeps us fresh.
  useEffect(() => {
    function refresh() {
      persistUtm(window.location.search);
      setUtm(getStoredUtm());
      setPathname(window.location.pathname);
    }
    refresh();
    setInApp(isInAppBrowser());
    window.addEventListener("sl:utm", refresh);
    return () => window.removeEventListener("sl:utm", refresh);
  }, []);

  // Persona-reactive primary action: biz → studio WhatsApp, hr → LinkedIn
  // (recruiters get the profile surface, not a personal messenger), the
  // rest → personal Telegram.
  const channel: "whatsapp" | "telegram" | "linkedin" =
    persona === "biz" ? "whatsapp" : persona === "hr" ? "linkedin" : "telegram";
  const prefill = t(`prefill.${persona ?? "hi"}`);

  function buildHref(liveUtm: UtmParams, livePath: string): string {
    if (channel === "linkedin") return LINKS.linkedin;
    const text = buildPrefillText(prefill, livePath, liveUtm);
    return channel === "whatsapp"
      ? buildWhatsappUrl(CONTACT.studioWhatsapp, text)
      : buildTelegramUrl(CONTACT.telegramUsername, text);
  }

  function handlePrimaryClick(event: MouseEvent<HTMLAnchorElement>) {
    // Click time is the source of truth for messengers: re-read UTM + path
    // fresh and rewrite the anchor's href before the browser follows it.
    // (LinkedIn is a static profile URL — nothing to rebuild.)
    if (channel !== "linkedin") {
      event.currentTarget.href = buildHref(
        getStoredUtm(),
        window.location.pathname,
      );
    }
    trackEvent("cta_click", { channel, persona: persona ?? "none" });
  }

  function handleVcardClick() {
    trackEvent("vcard_download", { persona: persona ?? "none" });
  }

  async function copyPhone() {
    try {
      await navigator.clipboard.writeText(CONTACT.phone);
      trackEvent("phone_copy", { persona: persona ?? "none" });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (some webviews) — last-resort visible prompt.
      window.prompt(CONTACT.phone, CONTACT.phone);
    }
  }

  const accent = persona ? `var(--persona-${persona})` : "var(--accent)";

  return (
    <div
      ref={barRef}
      className={[
        // Mobile: full-width fixed bottom bar (above the OS home indicator).
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/75 backdrop-blur-xl",
        "pb-[env(safe-area-inset-bottom)]",
        // Desktop: compact floating card in the corner.
        "sm:inset-x-auto sm:right-6 sm:bottom-6 sm:rounded-2xl sm:border sm:shadow-xl sm:shadow-black/15",
      ].join(" ")}
    >
      <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3 sm:px-3 sm:py-2.5">
        <a
          href={buildHref(utm, pathname)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handlePrimaryClick}
          data-channel={channel}
          // 13px + px-3 below sm: the long RU labels ("Написать в Telegram")
          // must stay on ONE line when the two buttons split 390px.
          className="flex h-11 flex-1 items-center justify-center whitespace-nowrap rounded-full px-3 text-[13px] font-semibold transition-[transform,box-shadow] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] motion-reduce:transform-none sm:flex-none sm:px-5 sm:text-sm"
          style={{
            backgroundImage: `linear-gradient(135deg, ${accent} 0%, color-mix(in oklab, ${accent} 78%, var(--foreground)) 100%)`,
            color: "var(--accent-foreground)",
            boxShadow: `0 6px 18px -8px color-mix(in oklab, ${accent} 65%, transparent)`,
          }}
        >
          {channel === "whatsapp"
            ? t("whatsapp")
            : channel === "linkedin"
              ? t("linkedin")
              : t("telegram")}
        </a>

        <a
          href="/vcard.vcf"
          download
          onClick={handleVcardClick}
          className="flex h-11 flex-1 items-center justify-center whitespace-nowrap rounded-full border border-foreground/20 bg-transparent px-3 text-[13px] font-semibold transition-[transform,border-color] hover:-translate-y-0.5 hover:border-foreground/45 active:translate-y-0 motion-reduce:transform-none sm:flex-none sm:px-5 sm:text-sm"
        >
          {t("saveContact")}
        </a>

        {inApp && (
          // In-app browsers (Telegram/Instagram) block .vcf downloads — offer
          // the raw number with one-tap copy. aria-live announces the copied
          // state to screen readers (the visual is a label swap).
          <button
            type="button"
            onClick={copyPhone}
            aria-label={`${t("copyPhone")}: ${CONTACT.phone}`}
            className="flex h-11 shrink-0 items-center justify-center rounded-full border border-border bg-background px-3 text-xs font-medium tabular-nums text-muted-foreground transition-colors hover:text-foreground"
          >
            <span aria-live="polite">
              {copied ? t("copied") : CONTACT.phone}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
