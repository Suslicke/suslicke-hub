"use client";

import { useEffect } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { PERSONA_STORAGE_KEY } from "@/lib/config";
import { parseAsPersona } from "@/lib/utm";

/**
 * Consumes the `?as=<persona>` deep-link contract: the hub's /qr redirect
 * lands event visitors on `/?utm_source=…&as=<persona>` (the event's default
 * persona). When the visitor is on the HOME route and `as` names a known
 * persona, persist it to `localStorage sl_persona` and client-replace to
 * `/{persona}` keeping the query string (first-touch UTM capture still sees
 * `utm_source`; `sl:utm` subscribers are unaffected).
 *
 * An explicit persona URL (`/dev` shared from GitHub, …) is NEVER overridden —
 * the effect only acts on the neutral home pathname.
 */
export function AsPersonaRedirect() {
  const pathname = usePathname(); // next-intl: no locale prefix
  const router = useRouter();

  useEffect(() => {
    if (pathname !== "/") return; // shared /{persona} links are sacred
    const persona = parseAsPersona(window.location.search);
    if (!persona) return;

    try {
      window.localStorage.setItem(PERSONA_STORAGE_KEY, persona);
    } catch {
      // storage unavailable — the redirect still applies the persona view
    }
    router.replace(`/${persona}${window.location.search}`);
  }, [pathname, router]);

  return null;
}
