# CLAUDE.md

Technical context for AI assistants working in this repository. Read this before making changes.

## Project

**suslicke.com** — personal-brand site of **Andrei Pustovoi** (nickname **suslicke**), Full Stack & AI developer in Almaty, founder of the suslicketeam studio. **LIVE in production at https://suslicke.com.**

Purpose: networking through a **QR code printed on the back of a t-shirt** (events, street, chance meetings). The QR encodes `suslicke.com/qr`. Conversion #1 is "saved my contact" (vCard), #2 is "messaged me on Telegram". Everything on the site is a call to get acquainted — that framing is deliberate, keep it.

This is the **personal** site: it sells the acquaintance; the studio site (suslicketeam.com, separate repo `Suslicke/suslicketeam`) sells projects. The biz persona bridges to the studio, never competes with it.

## Repository layout — two apps, one compose

```
web/   Next.js 15 site  (TypeScript, App Router)
hub/   suslicke-hub     (FastAPI + aiogram bot + SQLAlchemy async, Python 3.12)
docker-compose.yml      project name PINNED: `name: suslicke` (see Deploy)
deploy/                 nginx vhost + placeholder page as deployed (reference copies)
```

The old terminal-UI suslicke.com was fully replaced by this project (2026-07).

## web — the site

- **Next.js 15.5** (App Router, `output: "standalone"`) + **React pinned exactly 19.1.1** — `@react-three/fiber@9.6` peer range is `>=19 <19.3`; do NOT bump react blindly.
- **Tailwind CSS v4** (CSS-first, tokens in `src/app/globals.css`, no tailwind.config) + **next-intl** (locales `ru`/`en`, **default `en`**, localePrefix always) + **next-themes** (light DEFAULT, dark via toggle; palette "Warm Steppe Editorial": sandy paper light / evening-blue dark, terracotta accent) + **motion** v12 + **three/R3F/drei**.
- **Personas**: 4 static routes `/{locale}/{biz|dev|hr|hi}` + neutral home. Persona = its own content, accent color (`--persona-*`, `[data-persona]` remaps `--accent`), CTA and messenger prefill. Choice persists in `localStorage sl_persona`; returning visitors get a soft client-side restore hint, **never a middleware redirect** (edge-cache bugs). `?as=<persona>` on `/` redirects client-side (used by /qr default persona).
- **3D hero scene** (`src/components/scene/`): particle field, ONE THREE.Points + custom shader. Assembles into a **suslik (gopher) mascot** drawn analytically (`suslik-shape.ts`); morphs into persona glyphs (`$`, `</>`, `CV`, `👋`) on persona pick (CustomEvent `sl:persona`); pointer repulsion, tap ripple, gyro parallax, scroll scatter. Arbitrary glyph via `SceneMount glyph="404"` (used on the interactive 404 page). Lazy: idle-load after LCP, `prefers-reduced-motion`/no-WebGL → SVG poster, persona pages pass `minWidth={640}` (poster on phones), home keeps the live scene on mobile (touch interactivity is the wow for QR visitors). three stays **client-only**.
- **Sticky CTA bar**: [Telegram] + [Save contact] visible before any choice; publishes `--sticky-cta-height` (consent banner and footer offset by it). Messenger links rebuild at click time with persona prefill + first-touch UTM (`sessionStorage sl_utm`).
- **vCard** `/vcard.vcf` (route handler; dot in path bypasses the i18n matcher): strictly VERSION:3.0 + CRLF (4.0 breaks iOS); in-app browsers (Telegram/Instagram) block .vcf downloads → copy-number fallback is next to the button.
- **Event layer** (client-side, fetches `/api/event-status?locale=xx` once per page via `engage-lib fetchEventStatus`): LIVE pill in hero + event card (image/description/links) + top banner + **survey dialog** (shown to EVERYONE during an active event, once per event via `localStorage sl_ev_<slug>`, ~6s delay, closes only via ✕/Skip so the consent banner can't dismiss it; optional "leave a contact" field).
- **Analytics (all consent-gated, single rule: zero third-party requests before consent)**: consent banner (`localStorage sl_consent` + CustomEvent `sl:consent`) → PostHog EU, Google Analytics, Yandex Metrika (webvisor; no noscript pixel) load only after "Accept". `trackEvent()` in `src/lib/analytics.ts` fans out to all three. **PostHog project is SHARED with suslicketeam.com (free plan)** — every event carries super property `site: "suslicke.com"`; filter by it in insights. First-party visit counter (`sendBeacon /api/hit`, cookieless, daily-rotating hash) needs no consent — by design, don't gate it.
- **SEO**: target queries are the name and nickname ("suslicke", "Андрей Пустовой", "Andrei Pustovoi") — brand/name SERP domination, not competitive keywords. Nickname lives in the home title; RU home H1 is Cyrillic. Person JSON-LD (`@id https://suslicke.com/#person`, alternateName incl. suslicke, sameAs LinkedIn/GitHub/Instagram/Telegram, worksFor → suslicketeam) + ProfilePage + WebSite + BreadcrumbList. OG images are build-time (no runtime next/og). `metadataBase`, hreflang ru/en + x-default, sitemap × locales, robots disallow `/api` `/hub` only.

### web conventions (follow these)

- **No hardcoded user-facing strings in TSX** — everything via `messages/{ru,en}.json`. **RU is the authoritative original**, EN is a real translation. Parity is enforced: `pnpm check:messages` (identical flat key sets) — run it after touching messages.
- **NO em dashes ("—") in any user-facing copy** — owner's hard rule ("выдают ИИ"). Rephrase (colon, period, comma), don't just substitute.
- **No invented facts** — metrics/roles/dates only from the owner's résumé or the studio's case copy. NDA cases stay vague. `src/content/facts.ts` is the single typed source of facts.
- Server Components by default; the LCP (hero h1) must stay server-rendered — never wrap it client-only.
- Animate only transform/opacity; respect `prefers-reduced-motion`; hover effects gated by `@media (hover:hover)`.
- Mobile is the primary scenario (QR scans are phones): no horizontal overflow (the header select once stretched the page to 501px — the class of bug to watch for), 44px tap targets, iOS safe-area on the sticky bar.

## hub — suslicke-hub (backend)

One Python process: FastAPI + **aiogram polling** (asyncio task in lifespan — no webhook, no public port) + SQLAlchemy async → Postgres 16.

- **Bot @suslicke_bot** (admin = `ADMIN_CHAT_ID`, Andrei's chat_id 969202680): `/qr status`, `/qr set campaign|source|medium <v>`, `/event start <Name>` (atomic: banner + `utm_campaign=slug`; a DIFFERENT slug clears the previous event's description/image/links), `/event stop`, `/today` (visits/scans/surveys). Anyone else gets their chat_id from `/start`.
- **Endpoints** (nginx proxies from suslicke.com, same-origin): `GET /qr` (307 with UTM from Postgres, logs the scan; in-memory 5s config cache; hardcoded default — the shirt QR must never fail), `GET /api/event-status?locale=` (public, curated fields only; EN fields fall back to RU), `GET /api/media/{f}` (uploaded event images; traversal-proof name validation + magic-byte-verified uploads), `POST /api/event-survey` (stores answer + contact/locale/ua_hash/visitor_hash, instant Telegram notify), `POST /api/hit` (visit counter), `GET /api/settings` (public site_settings), `/health`.
- **Web admin `/hub`**: password login (`HUB_ADMIN_PASSWORD`), HMAC-signed 7-day session cookie, login rate-limit, `noindex`. Dashboard (server-side SVG charts: visits 14d, scans, personas; no JS libs, no CDNs), QR/UTM form, **event editor** (CSS toggle, bilingual RU/EN name+description, up to 5 links, image upload ≤5MB jpg/png/webp), site_settings editor, recent surveys (with contact + locale columns). HTML is f-strings on purpose (two pages; reach for Jinja at page three).
- **Schema changes**: `create_all` only creates missing tables — additive columns go through idempotent `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` in `_MIGRATIONS` (db.py). No alembic until the first breaking change.
- Single-row config `qr_config` (id=1) holds UTM + the whole event; `qr_scans`, `page_views`, `survey_answers`, `site_settings` tables.

## Commands

```bash
# web
cd web && pnpm dev            # turbopack dev
pnpm typecheck && pnpm check:messages && pnpm lint && pnpm build   # THE GATE — green before any commit
# hub
cd hub && uv run --with pytest --no-project python -m pytest tests
python3 -m py_compile hub/app/*.py
# deploy (manual for now; CI is a TODO)
rsync -az --delete --exclude .env --exclude .git --exclude node_modules --exclude .next \
  --exclude __pycache__ --exclude .pytest_cache ./ netcup:/opt/suslicke/
ssh netcup 'cd /opt/suslicke && docker compose build && docker compose up -d'
```

## Deploy (netcup VPS — deliberately NOT Cloudflare)

Owner's explicit decision: self-hosted on the netcup box (ssh alias `netcup`), same server as suslicketeam-platform/Twenty/loyrush. **Do not move this to Cloudflare.**

- `/opt/suslicke`, compose project **pinned `name: suslicke`** — volumes (`suslicke_pgdata`, `suslicke_hubdata`) and the network are project-name-prefixed; the pin makes them survive a directory rename (lesson from renaming /opt/platform).
- **Ports (block 18xxx, all 127.0.0.1 only)**: web `18000`, hub `18001`, postgres `18432`. Other projects own 17xxx (platform), 81xx (loyrush), 4000 (twenty), 543xx (supabase).
- nginx `/etc/nginx/conf.d/suslicke.com.conf`: `/` → web; `/qr`, `/api/*`, `/hub` → hub; **`@qr_fallback`** — on hub 502 nginx itself 307s with default UTM (the shirt QR survives a dead backend); `client_max_body_size 6m` on /hub (uploads). Reference copy in `deploy/`.
- TLS: certbot **webroot HTTP-01** for suslicke.com (the studio's wildcard covers only *.suslicketeam.com). Auto-renews via certbot.timer. No `www` DNS record yet (re-issue with `-d www.suslicke.com` if added).
- **Secrets** in `/opt/suslicke/.env` (chmod 600, NEVER in git): `BOT_TOKEN`, `ADMIN_CHAT_ID`, `HUB_ADMIN_PASSWORD`, `POSTGRES_*`, `DATABASE_URL`, `NEXT_PUBLIC_POSTHOG_KEY/HOST`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_YANDEX_METRIKA_ID`. `NEXT_PUBLIC_*` are **build-time**: Dockerfile ARGs, passed via compose `build.args` (compose interpolates them from .env). Changing them requires `docker compose build web`.
- Monitoring: uptime-kuma already runs on the box (:3001) — /qr (expect 307) and /api/event-status belong there.

## Gotchas (each cost a debug cycle — don't relearn)

1. Empty env string vs `int | None` in pydantic-settings: `ADMIN_CHAT_ID=` crashes without the `_empty_env_is_none` validator (config.py).
2. Compose project name defaults to the DIRECTORY name; unpinned, a rename orphans volumes. Always `name:` in compose files.
3. `dynamic(..., { ssr: false })` is only legal inside a Client Component in Next 15 (hence the scene-mount wrapper).
4. Next 15: `params` is a Promise — always `await params`.
5. A native `<select>` sizes itself to its widest option and can stretch the whole page beyond the viewport (the mobile horizontal-scroll bug).
6. asyncio fire-and-forget tasks need a strong reference (`_bg_tasks` set in qr.py) or they can be GC'd mid-flight.
7. Telegram/Instagram in-app browsers block .vcf downloads; Telegram caches OG previews ~forever (@WebpageBot to reset) — check previews BEFORE printing QR merch.
8. pnpm 11 blocks postinstall scripts — `pnpm-workspace.yaml` `allowBuilds` covers sharp/@swc.
9. Dev-server quirks inherited from the studio stack: verify behavior with `pnpm build && pnpm start`, not the dev server.

## Related infra (context, not this repo)

- **suslicketeam** (studio site, Cloudflare Workers) and **suslicketeam-platform** (`/opt/suslicketeam-platform`, lead-bot @suslicketeam_lead_bot + Twenty CRM at crm.suslicketeam.com) are SEPARATE projects — owner's rule: changes here must not touch them. The only shared things: the nginx instance, the PostHog project (separated by the `site` super property), and the biz persona linking out to the studio.
- Design history: studio repo `docs/plans/2026-07-13-suslicke-personal-site-design.md` (4 revisions).

## Current status (2026-07)

LIVE: site (personas RU/EN, particle suslik, interactive 404), hub (bot, /qr, rich bilingual events with image/links, visit counter, /hub admin with charts), consent-gated PostHog+GA+Metrika, meet-in-person CTA everywhere, conversation-starter prefills. Open TODOs: `web/public/cv.pdf` missing (`HAS_CV=false` hides the button), CI deploy (rsync by hand now), www DNS record, build-time OG images with a real photo, suslik "character" reactions (nod on persona pick), GSC + Yandex Webmaster registration (owner), suslicke.com link in social bios (owner — sameAs reciprocity).
