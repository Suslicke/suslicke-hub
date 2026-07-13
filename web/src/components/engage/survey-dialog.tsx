"use client";

import {useTranslations, useLocale} from "next-intl";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { isPersona, PERSONA_STORAGE_KEY } from "@/lib/config";

import {
  fetchEventStatus,
  getStoredUtm,
  persistUtm,
  slugifyEventName,
  trackEvent,
  type UtmParams,
} from "./engage-lib";

// Stable answer keys — mirror `survey.*` message keys and the hub API enum.
const ANSWERS = ["here", "street", "friend", "other"] as const;
type Answer = (typeof ANSWERS)[number];

// Generous delay so the visitor reads the page first (and the consent banner
// is seen) — the survey now targets EVERYONE during an event, so it must not
// hit them in the face on arrival.
const SHOW_DELAY_MS = 6000;

function seenKey(slug: string): string {
  return `sl_ev_${slug}`;
}

function alreadySeen(slug: string): boolean {
  try {
    return window.localStorage.getItem(seenKey(slug)) === "done";
  } catch {
    return false;
  }
}

function markSeen(slug: string): void {
  try {
    window.localStorage.setItem(seenKey(slug), "done");
  } catch {
    // ignore storage failures
  }
}

/** Best-effort current persona: route segment first, stored choice second. */
function resolvePersona(): string {
  const fromPath = window.location.pathname
    .split("/")
    .filter(Boolean)
    .find(isPersona);
  if (fromPath) return fromPath;
  try {
    const stored = window.localStorage.getItem(PERSONA_STORAGE_KEY);
    if (stored && isPersona(stored)) return stored;
  } catch {
    // fall through
  }
  return "";
}

/**
 * Event-mode survey popup ("how did you find me?"). Shown when BOTH hold: an
 * event is active (`/api/event-status`) and `localStorage sl_ev_<slug(name)>`
 * is unset (once per event) — no UTM gate: during an event the owner wants to
 * ask every visitor, QR or not, after a ~6s settle delay. Closes only via
 * ✕ / Skip — outside clicks and Escape are swallowed so the consent banner
 * can't dismiss it (studio QrWelcome semantics), implemented as a lightweight
 * hand-rolled dialog (no radix dep) with a focus-trap-lite. Submits to
 * `/api/event-survey` (hub → Telegram) and fires a consent-gated
 * `qr_survey_response` analytics event.
 */
export function SurveyDialog() {
  const t = useTranslations("survey");
  const locale = useLocale();

  const [eventName, setEventName] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [freeText, setFreeText] = useState("");
  const [contact, setContact] = useState("");
  const [done, setDone] = useState(false);
  const [utm, setUtm] = useState<UtmParams>({});

  const panelRef = useRef<HTMLDivElement>(null);
  const slug = eventName ? slugifyEventName(eventName) : "";

  // Eligibility: resolve after mount (storage + fetch are client-only).
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    fetchEventStatus(locale).then((data) => {
      if (cancelled || !data) return;
      if (alreadySeen(slugifyEventName(data.name))) return;
      // UTM is attached to the submission when present, but no longer gates
      // the popup — during an event everyone gets asked, once per event.
      persistUtm(window.location.search);
      setUtm(getStoredUtm());
      setEventName(data.name);
      timer = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    });

    // UTM may be captured by another component after our fetch resolves —
    // refresh the payload copy (does not affect eligibility).
    function refreshUtm() {
      setUtm(getStoredUtm());
    }
    window.addEventListener("sl:utm", refreshUtm);
    return () => {
      cancelled = true;
      window.removeEventListener("sl:utm", refreshUtm);
      if (timer) clearTimeout(timer);
    };
  }, [locale]);

  // Lock body scroll + swallow Escape at the document level while open —
  // closing is allowed only via ✕ / Skip.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") event.preventDefault();
    }
    document.addEventListener("keydown", onKeyDown, true);

    // Focus-trap-lite entry point.
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  const close = useCallback(() => {
    // Closing without answering still counts as seen — don't nag.
    if (slug) markSeen(slug);
    setOpen(false);
  }, [slug]);

  // Keep Tab cycling inside the panel (focus-trap-lite).
  function trapTab(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab" || !panelRef.current) return;
    const focusables = panelRef.current.querySelectorAll<HTMLElement>(
      'button, textarea, [href], [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const canSubmit =
    answer !== null && (answer !== "other" || freeText.trim().length > 0);

  function submit() {
    if (!canSubmit || !answer || !eventName) return;
    const persona = resolvePersona();
    const trimmed = answer === "other" ? freeText.trim().slice(0, 500) : "";

    // 1) Guaranteed sink: hub → Postgres + instant Telegram message.
    void fetch("/api/event-survey", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        answer,
        free_text: trimmed,
        persona,
        contact: contact.trim().slice(0, 200),
        locale,
        utm: utm as Record<string, string>,
      }),
      keepalive: true,
    }).catch(() => {
      // best-effort — the analytics event still covers the consented case
    });

    // 2) Analytics (consent-gated).
    trackEvent("qr_survey_response", {
      answer,
      free_text: trimmed,
      event: eventName,
      persona,
      ...utm,
    });

    markSeen(slug);
    setDone(true);
  }

  if (!open || !eventName) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay — deliberately NOT clickable-to-close. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sl-survey-title"
        tabIndex={-1}
        onKeyDown={trapTab}
        className="absolute left-1/2 top-1/2 flex max-h-[85dvh] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-card border border-border bg-background/95 p-6 shadow-2xl shadow-black/20 outline-none backdrop-blur-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="sl-survey-title"
            className="font-display text-lg font-semibold tracking-tight"
          >
            {done ? t("thanks") : t("title", { name: eventName })}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label={t("skip")}
            className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {!done && (
          <>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium text-muted-foreground">
                {t("question")}
              </legend>
              {ANSWERS.map((key) => {
                const selected = answer === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setAnswer(key)}
                    aria-pressed={selected}
                    className={[
                      "rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                      selected
                        ? "border-transparent"
                        : "border-border hover:bg-muted",
                    ].join(" ")}
                    style={
                      selected
                        ? {
                            backgroundColor:
                              "color-mix(in oklab, var(--accent) 15%, transparent)",
                            color: "var(--accent)",
                            boxShadow: "inset 0 0 0 2px var(--accent)",
                          }
                        : undefined
                    }
                  >
                    {t(key)}
                  </button>
                );
              })}
            </fieldset>

            {answer === "other" && (
              <textarea
                value={freeText}
                onChange={(event) => setFreeText(event.target.value)}
                placeholder={t("otherPlaceholder")}
                required
                rows={3}
                maxLength={500}
                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              />
            )}

            <label className="block text-left">
              <span className="mb-1 block text-xs text-muted-foreground">
                {t("contactLabel")}
              </span>
              <input
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                placeholder={t("contactPlaceholder")}
                maxLength={200}
                inputMode="email"
                autoComplete="off"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              />
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit}
                className="h-11 flex-1 rounded-full text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, var(--accent) 0%, color-mix(in oklab, var(--accent) 78%, var(--foreground)) 100%)",
                  color: "var(--accent-foreground)",
                }}
              >
                {t("submit")}
              </button>
              <button
                type="button"
                onClick={close}
                className="h-11 rounded-full border border-border px-5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {t("skip")}
              </button>
            </div>
          </>
        )}

        {done && <ThanksAutoClose onDone={() => setOpen(false)} />}
      </div>
    </div>
  );
}

/** After the thanks message, close the dialog automatically (✕ also works). */
function ThanksAutoClose({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
