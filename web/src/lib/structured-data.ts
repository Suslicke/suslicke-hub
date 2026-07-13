import { LINKS, STACK_FLAT } from "@/content/facts";
import { siteConfig, type Locale } from "@/lib/config";

/**
 * Person node — the SEO anchor of the whole site (`#person`). Facts only;
 * `sameAs` must stay in sync with the footer social links (and the bios on
 * those profiles must link back to suslicke.com for reciprocity).
 */
export function personJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": `${siteConfig.url}/#person`,
    name: "Andrei Pustovoi",
    alternateName: "Андрей Пустовой",
    url: siteConfig.url,
    jobTitle: "Full Stack Developer",
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

/** ProfilePage for the localized home — mainEntity embeds the Person node. */
export function profilePageJsonLd(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: `${siteConfig.url}/${locale}`,
    inLanguage: locale,
    mainEntity: personJsonLd(),
  };
}
