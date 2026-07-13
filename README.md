# suslicke.com

Personal site of **Andrei Pustovoi** (aka **suslicke**) — Full Stack & AI developer in Almaty, founder of [suslicketeam](https://suslicketeam.com). **Live: https://suslicke.com**

The whole site exists for one thing: **networking through a QR code on the back of a t-shirt**. Someone scans it at an event or on the street, lands here, and the site's job is to turn that moment into a saved contact or a Telegram message.

## What's inside

- **Persona-aware landing** — the visitor picks who they are (Business / Developer / HR / Just saying hi) and gets their own content, accent color and call to action, in Russian and English (`/ru/dev`, `/en/biz`, …).
- **Particle suslik** — the hero is thousands of WebGL particles that assemble into a gopher mascot, morph into persona glyphs, scatter away from your finger and ripple on tap. Falls back to an SVG poster on reduced-motion / no WebGL. The 404 page assembles a literal "404".
- **Live events** — a Telegram bot command (or the web admin) turns on "I'm at {event} right now": the site shows a LIVE pill and an event card (photo, description, links), visitors get a "did you see the QR at the event?" popup with an optional leave-your-contact field, and every answer lands in Andrei's Telegram instantly.
- **suslicke-hub** (`hub/`) — FastAPI + aiogram backend: dynamic `/qr` redirect with editable UTM (change campaigns from your phone, no deploy), cookieless first-party visit counter, survey storage, and a `/hub` web admin with SVG charts.
- **Consent-first analytics** — PostHog, Google Analytics and Yandex Metrika load only after the visitor accepts; the first-party counter is cookieless by construction.

## Stack

Next.js 15 / React 19 / Tailwind v4 / next-intl / three.js + R3F (custom shader, one draw call) · FastAPI / aiogram / SQLAlchemy / Postgres 16 · Docker Compose on a VPS behind nginx (with a fallback so the shirt QR keeps working even if the backend is down).

## Development

```bash
cd web && pnpm install && pnpm dev        # site on :3000
pnpm typecheck && pnpm check:messages && pnpm lint && pnpm build   # the gate

cd hub && uv run --with pytest --no-project python -m pytest tests # helper tests
```

Prod: netcup VPS, `/opt/suslicke` (compose project `suslicke`), ports 127.0.0.1: 18000 web / 18001 hub / 18432 postgres. Secrets live in `/opt/suslicke/.env` (chmod 600, never committed).

Architecture details, conventions, gotchas and the deploy runbook: see [CLAUDE.md](CLAUDE.md).
Design history: suslicketeam repo, `docs/plans/2026-07-13-suslicke-personal-site-design.md`.
