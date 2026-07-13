/**
 * Typed, locale-independent facts about Andrei — the single structural
 * source for persona sections (and, later, the CV).
 *
 * Copy (titles, descriptions, roles, periods) lives in
 * `messages/{ru,en}.json` under `personas.*`; this file only holds
 * structure: ordering, tech labels, URLs. Tech/brand labels are the
 * documented exception to the "no strings in TSX" rule.
 *
 * Do NOT add facts that are not verified with Andrei — no invented
 * metrics, dates or roles.
 */

export const LINKS = {
  telegram: "https://t.me/Suslicke",
  github: "https://github.com/Suslicke",
  linkedin: "https://www.linkedin.com/in/suslicke",
  instagram: "https://www.instagram.com/suslicke",
  email: "admin@suslicketeam.com",
  phone: "+77474772302",
  /** The studio's WhatsApp — used by the biz persona CTA. */
  studioWhatsApp: "+77066998879",
  studio: "https://suslicketeam.com",
  /** Static CV file (phase 1); served from /public. */
  cv: "/cv.pdf",
} as const;

/**
 * `web/public/cv.pdf` does not exist yet — while this is `false`, every
 * "Download CV" surface is hidden so the site never ships a dead primary
 * CTA. Flip to `true` in the same change that adds the real PDF.
 */
export const HAS_CV = false;

/* ------------------------------------------------------------------ */
/* Stack                                                               */
/* ------------------------------------------------------------------ */

export type StackGroupId =
  | "backend"
  | "frontend"
  | "mobile"
  | "data"
  | "infra";

export interface StackGroup {
  /** Matches `personas.dev.stack.groups.<id>` in messages. */
  id: StackGroupId;
  items: readonly string[];
}

export const STACK_GROUPS: readonly StackGroup[] = [
  { id: "backend", items: ["Python", "Django", "FastAPI", "Celery", "Go"] },
  {
    id: "frontend",
    items: ["TypeScript", "JavaScript", "React", "Next.js", "Vue"],
  },
  { id: "mobile", items: ["Flutter", "React Native"] },
  { id: "data", items: ["PostgreSQL", "Redis", "Kafka", "RabbitMQ"] },
  { id: "infra", items: ["Docker", "AWS"] },
] as const;

/** Flat list for compact chip walls (hr persona). */
export const STACK_FLAT: readonly string[] = STACK_GROUPS.flatMap(
  (group) => group.items,
);

/* ------------------------------------------------------------------ */
/* Projects / experience                                               */
/* ------------------------------------------------------------------ */

export type ProjectSlug =
  | "health"
  | "admp"
  | "scioffice"
  | "kgpk"
  | "freelance";

export interface ProjectFact {
  /** Matches `personas.dev.experience.<slug>` and `personas.hr.timeline.items.<slug>`. */
  slug: ProjectSlug;
  /** Tech labels shown as chips; empty when not publicly confirmed. */
  tech: readonly string[];
}

/** Newest first — this is the render order for dev experience and the hr timeline. */
export const PROJECTS: readonly ProjectFact[] = [
  {
    slug: "health",
    tech: ["Django", "FastAPI", "Celery", "Vue", "DICOM/PACS"],
  },
  { slug: "admp", tech: ["Python", "Telegram Bot"] },
  { slug: "scioffice", tech: [] },
  { slug: "kgpk", tech: [] },
  { slug: "freelance", tech: [] },
] as const;

/**
 * The cases shown on the biz persona page (and their order): the personal
 * flagship cases plus verified cases from the suslicketeam studio
 * portfolio. The first entry is the featured (full-width) card; the
 * summary NDA card goes last. Copy lives in `personas.biz.cases.<slug>`.
 */
export const BIZ_CASE_SLUGS = [
  "health", // merged card: teleradiology platform == xaid.ai (same project)
  "admp",
  "loyrush",
  "exchangeBridge",
  "animeenigma",
  "scioffice",
  "kgpk",
  "nda",
] as const;
export type BizCaseSlug = (typeof BIZ_CASE_SLUGS)[number];

/* ------------------------------------------------------------------ */
/* Misc structural lists                                               */
/* ------------------------------------------------------------------ */

/** Matches `personas.biz.approach.<id>` in messages. */
export const BIZ_APPROACH_STEPS = ["listen", "build", "grow"] as const;

/** Matches `personas.dev.site.items.<id>` in messages. */
export const DEV_SITE_ITEMS = [
  "frontend",
  "hub",
  "fallback",
  "counter",
] as const;

/** Matches `personas.hr.facts.<id>` in messages. */
export const HR_FACTS = ["experience", "lead", "location", "founder"] as const;

/**
 * Matches `personas.hr.highlights.items.<id>` in messages — resume-verified
 * achievement stats (value / label / body) rendered at the top of the hr
 * persona page.
 */
export const HR_HIGHLIGHTS = [
  "integration",
  "bugs",
  "language",
  "mvp",
  "scale",
  "team",
] as const;

/** Matches `personas.hi.interests.<id>` in messages. */
export const HI_INTERESTS = ["code", "ai", "people", "almaty"] as const;
