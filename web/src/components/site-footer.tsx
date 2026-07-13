import { useTranslations } from "next-intl";

import { LINKS } from "@/content/facts";

/**
 * Footer: social links (brand labels — the documented exception to the
 * no-strings-in-TSX rule), © line and the studio bridge. Keep the link set
 * in sync with `sameAs` in `@/lib/structured-data`.
 */
const SOCIAL_ITEMS = [
  { label: "Telegram", href: LINKS.telegram },
  { label: "GitHub", href: LINKS.github },
  { label: "LinkedIn", href: LINKS.linkedin },
  { label: "Instagram", href: LINKS.instagram },
  { label: "Email", href: `mailto:${LINKS.email}` },
] as const;

export function SiteFooter() {
  const t = useTranslations("footer");

  return (
    // Bottom clearance for the fixed sticky-CTA bar/card (it publishes its
    // height as --sticky-cta-height on :root) — the last footer rows must
    // never sit under it at max scroll, on either breakpoint.
    <footer className="border-t border-border pb-[calc(var(--sticky-cta-height,0px)+1rem)]">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-6">
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          {SOCIAL_ITEMS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-accent"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <p>{t("rights")}</p>
          <a
            href={LINKS.studio}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-accent"
          >
            {t("studio")}
          </a>
        </div>
      </div>
    </footer>
  );
}
