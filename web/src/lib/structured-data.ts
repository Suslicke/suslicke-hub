import { LINKS, STACK_FLAT } from "@/content/facts";
import { siteConfig, type Locale } from "@/lib/config";

/** Stable @id anchors — every schema on the site links back to these. */
const PERSON_ID = `${siteConfig.url}/#person`;
const WEBSITE_ID = `${siteConfig.url}/#website`;

/**
 * Person node — the SEO anchor of the whole site (`#person`), rendered on
 * every page from the locale layout. Facts only; `sameAs` must stay in sync
 * with the footer social links (and the bios on those profiles must link
 * back to suslicke.com for reciprocity). No `image`: there is no real photo
 * in /public yet — add one before referencing it here.
 */
export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": PERSON_ID,
    name: "Andrei Pustovoi",
    alternateName: ["Андрей Пустовой", "suslicke", "Suslicke"],
    givenName: "Andrei",
    familyName: "Pustovoi",
    additionalName: "suslicke",
    url: siteConfig.url,
    jobTitle: "Full Stack & AI Developer",
    email: `mailto:${LINKS.email}`,
    knowsAbout: [...STACK_FLAT, "AI"],
    sameAs: [LINKS.linkedin, LINKS.github, LINKS.instagram, LINKS.telegram],
    worksFor: {
      "@type": "Organization",
      name: "suslicketeam",
      url: LINKS.studio,
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Almaty",
      addressCountry: "KZ",
    },
  };
}

/**
 * WebSite node (`#website`) — rendered on every page from the locale
 * layout. `alternateName` carries the brand/name queries the site targets.
 */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: "suslicke.com",
    alternateName: ["suslicke", "Andrei Pustovoi", "Андрей Пустовой"],
    url: siteConfig.url,
    inLanguage: [...siteConfig.locales],
    publisher: { "@id": PERSON_ID },
  };
}

/**
 * ProfilePage for the localized home — `mainEntity` references the Person
 * node by @id (the full node is emitted by the layout on the same page).
 */
export function profilePageJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: `${siteConfig.url}/${locale}`,
    inLanguage: locale,
    isPartOf: { "@id": WEBSITE_ID },
    mainEntity: { "@id": PERSON_ID },
  };
}

/** BreadcrumbList for persona pages: Home → Persona (localized names). */
export function breadcrumbJsonLd(
  locale: Locale,
  homeName: string,
  personaName: string,
  personaPath: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: homeName,
        item: `${siteConfig.url}/${locale}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: personaName,
        item: `${siteConfig.url}/${locale}${personaPath}`,
      },
    ],
  };
}
