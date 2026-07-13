import { isPersona, type Persona } from "@/lib/config";

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

type UtmKey = (typeof UTM_KEYS)[number];

export type UtmParams = Partial<Record<UtmKey, string>>;

/** sessionStorage key holding the first-touch UTM set. */
export const UTM_STORAGE_KEY = "sl_utm";

/**
 * Parse a query string (with or without leading `?`) into a whitelisted set
 * of UTM params. Empty or unknown values are dropped; values are length-capped
 * so a manipulated inbound URL can't bloat storage or prefill texts.
 */
export function parseUtm(search: string): UtmParams {
  const normalized = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(normalized);
  const result: UtmParams = {};

  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) {
      result[key] = value.slice(0, 200);
    }
  }

  return result;
}

/**
 * Parse the given search string and persist it to sessionStorage under
 * `sl_utm`. First-touch wins: if a non-empty value is already stored, it is
 * not overwritten. No-op during SSR.
 */
export function persistUtm(search: string): void {
  if (typeof window === "undefined") return;

  const existing = getStoredUtm();
  if (Object.keys(existing).length > 0) return;

  const parsed = parseUtm(search);
  if (Object.keys(parsed).length === 0) return;

  try {
    window.sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore storage failures (quota, disabled storage, private mode)
  }
}

/**
 * Read the stored UTM params from sessionStorage. Returns `{}` when absent,
 * invalid, or during SSR.
 */
export function getStoredUtm(): UtmParams {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.sessionStorage.getItem(UTM_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    // Re-validate key/value shapes — a tampered storage entry on the same
    // origin must not produce an unsound UtmParams cast.
    const safe: UtmParams = {};
    for (const key of UTM_KEYS) {
      const value = (parsed as Record<string, unknown>)[key];
      // Re-cap length too — stored values feed messenger prefill texts.
      if (typeof value === "string" && value) safe[key] = value.slice(0, 200);
    }
    return safe;
  } catch {
    return {};
  }
}

/**
 * Read the `as=<persona>` query param (the /qr redirect appends it to
 * preselect a persona, e.g. `/?utm_source=shirt&as=dev`). Returns the persona
 * when it is one of the known slugs, otherwise `null`.
 */
export function parseAsPersona(search: string): Persona | null {
  const normalized = search.startsWith("?") ? search.slice(1) : search;
  const value = new URLSearchParams(normalized).get("as");
  return value && isPersona(value) ? value : null;
}
