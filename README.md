# suslicke.com — personal site + hub

Personal-brand site (Next.js, `web/` — WIP) and **suslicke-hub** (`hub/`):
FastAPI + aiogram (@suslicke_bot, polling) + Postgres. Dynamic `/qr` redirect
with editable UTM, event mode, first-party visit counter, event survey →
Telegram notification.

Design doc: suslicketeam repo, `docs/plans/2026-07-13-suslicke-personal-site-design.md`.

Prod: netcup, `/opt/suslicke` (compose project `suslicke`), ports 127.0.0.1:
18000 web / 18001 hub / 18432 postgres. Secrets in `/opt/suslicke/.env`
(chmod 600, never committed).

```bash
cd hub && uv run --with pytest --no-project python -m pytest tests
docker compose up -d --build   # on the box
```
