import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { ConsentWithdraw } from "@/components/analytics/consent-withdraw";
import type { Locale } from "@/lib/config";
import { buildMetadata } from "@/lib/seo";

/**
 * Section render order — each key maps to `privacy.sections.<key>` in
 * messages (title + body). Static `/privacy` segment wins over the sibling
 * dynamic `[persona]` route by App Router precedence.
 */
const SECTION_KEYS = [
  "firstParty",
  "consent",
  "posthog",
  "ga",
  "metrika",
  "processors",
  "contact",
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });

  return buildMetadata({
    locale,
    path: "/privacy",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

/**
 * Privacy page: an honest, compact disclosure of the measurement stack —
 * the always-on first-party cookieless counter, and the consent-gated
 * third-party providers (PostHog EU, Google Analytics, Yandex Metrika with
 * Webvisor session recording). Linked from the consent banner and footer.
 */
export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("privacy");

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">{t("updated")}</p>
        <p className="mt-6 leading-relaxed text-muted-foreground">
          {t("intro")}
        </p>

        {SECTION_KEYS.map((key) => (
          <section key={key} className="mt-10">
            <h2 className="font-display text-xl font-semibold tracking-tight">
              {t(`sections.${key}.title`)}
            </h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              {t(`sections.${key}.body`)}
            </p>
            {/* One-click withdrawal lives right under the consent section
                (client-only; renders nothing unless consent is granted). */}
            {key === "consent" && <ConsentWithdraw />}
          </section>
        ))}
      </div>
    </main>
  );
}
