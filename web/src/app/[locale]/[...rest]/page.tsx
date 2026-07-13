import { notFound } from "next/navigation";

/**
 * In-locale catch-all (standard next-intl pattern): any unknown multi-segment
 * path (e.g. /en/foo/bar) renders the localized, branded 404 in
 * `[locale]/not-found.tsx` instead of Next's default unstyled English page.
 * Single-segment misses are already handled by `[persona]/page.tsx`.
 */
export default function CatchAllPage() {
  notFound();
}
