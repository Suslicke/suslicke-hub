import { useTranslations } from "next-intl";

import {
  GitHubIcon,
  InstagramIcon,
  LinkedInIcon,
  MailIcon,
  TelegramIcon,
} from "@/components/icons";
import { LINKS } from "@/content/facts";
import { Link } from "@/i18n/navigation";

/**
 * Footer: a big closing "write me" block with the visible email, social
 * icon links (brand labels — the documented exception to the
 * no-strings-in-TSX rule), © line and the studio bridge. Keep the link set
 * in sync with `sameAs` in `@/lib/structured-data`.
 */
const SOCIAL_ITEMS = [
  { label: "Telegram", href: LINKS.telegram, Icon: TelegramIcon },
  { label: "GitHub", href: LINKS.github, Icon: GitHubIcon },
  { label: "LinkedIn", href: LINKS.linkedin, Icon: LinkedInIcon },
  { label: "Instagram", href: LINKS.instagram, Icon: InstagramIcon },
] as const;

export function SiteFooter() {
  const t = useTranslations("footer");

  return (
    // Bottom clearance for the fixed sticky-CTA bar/card (it publishes its
    // height as --sticky-cta-height on :root) — the last footer rows must
    // never sit under it at max scroll, on either breakpoint.
    <footer className="relative mt-16 overflow-hidden border-t border-border pb-[calc(var(--sticky-cta-height,0px)+1.5rem)]">
      {/* Warm glow behind the closing block. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, color-mix(in oklab, var(--accent) 10%, transparent) 0%, transparent 100%)",
        }}
      />

      <div className="relative mx-auto flex max-w-5xl flex-col gap-10 px-4 py-14 sm:px-6 sm:py-16">
        {/* Big closing CTA */}
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">
            <span className="text-gradient-accent">{t("title")}</span>
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            {t("subtitle")}
          </p>
          <a
            href={`mailto:${LINKS.email}`}
            className="group inline-flex w-fit items-center gap-3 font-mono text-base font-medium tracking-tight transition-colors hover:text-accent sm:text-lg"
          >
            <MailIcon className="size-5 text-muted-foreground transition-colors group-hover:text-accent" />
            {LINKS.email}
          </a>
        </div>

        {/* Social icon links. rel="me" marks them as identity links
            (Person.sameAs reciprocity / IndieWeb identity consolidation). */}
        <nav className="flex flex-wrap gap-2.5">
          {SOCIAL_ITEMS.map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="me noopener"
              className={[
                "inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-2 text-sm font-medium text-muted-foreground",
                "transition-[transform,color,border-color,box-shadow] duration-200",
                "hover:-translate-y-0.5 hover:border-accent/50 hover:text-foreground hover:shadow-md motion-reduce:transform-none",
              ].join(" ")}
            >
              <Icon className="size-4" />
              {label}
            </a>
          ))}
        </nav>

        {/* Visible nickname line — "suslicke" must appear as plain text on
            every page (brand-query signal), not only inside URLs. */}
        <p className="text-xs text-muted-foreground sm:text-sm">{t("nick")}</p>

        {/* Legal / credit row */}
        <div className="flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:text-sm">
          <div className="flex flex-col gap-1">
            <p>{t("rights")}</p>
            <Link
              href="/privacy"
              className="w-fit transition-colors hover:text-accent"
            >
              {t("privacy")}
            </Link>
          </div>
          <div className="flex flex-col gap-1 sm:items-end">
            <a
              href={LINKS.studio}
              target="_blank"
              rel="noopener noreferrer"
              className="w-fit transition-colors hover:text-accent"
            >
              {t("studio")}
            </a>
            <a
              href={LINKS.github}
              target="_blank"
              rel="noopener noreferrer"
              className="w-fit transition-colors hover:text-accent"
            >
              {t("made")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
