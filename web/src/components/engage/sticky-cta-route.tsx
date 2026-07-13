"use client";

import { usePathname } from "@/i18n/navigation";
import { isPersona } from "@/lib/config";

import { StickyCta } from "./sticky-cta";

/**
 * Route-aware wrapper so <StickyCta/> can live once in the locale layout:
 * derives the active persona from the locale-less pathname ("/dev" → "dev")
 * and passes it down (biz → studio WhatsApp, others → personal Telegram).
 */
export function StickyCtaRoute() {
  const pathname = usePathname(); // next-intl: no locale prefix
  const segment = pathname.split("/")[1] ?? "";
  return <StickyCta persona={isPersona(segment) ? segment : null} />;
}
