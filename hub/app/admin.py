"""/hub — owner's web admin: visit/scan/survey dashboard + QR, event and
site-settings forms. Single password (HUB_ADMIN_PASSWORD env), signed
expiring session cookie, in-memory login rate limit.

ponytail: f-string HTML instead of a template engine — two pages, one
viewer. Reach for Jinja when a third page appears.
"""

import hashlib
import hmac
import json
import logging
import time
from datetime import datetime, time as dtime, timedelta, timezone

from fastapi import APIRouter, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import desc, func, select

from . import bot as botmod
from .config import settings
from .db import PageView, QrConfig, QrScan, SiteSetting, SurveyAnswer, session_factory
from .helpers import slugify
from .qr import invalidate_cfg_cache

log = logging.getLogger(__name__)
router = APIRouter(prefix="/hub")

SESSION_TTL = 7 * 24 * 3600
COOKIE = "hub_session"

TARGET_ALLOWED = ("/", "https://suslicke.com", "https://suslicketeam.com")


def _key() -> bytes:
    return hashlib.sha256(("hub-session:" + settings.hub_admin_password).encode()).digest()


def _make_token() -> str:
    exp = str(int(time.time()) + SESSION_TTL)
    return f"{exp}.{hmac.new(_key(), exp.encode(), hashlib.sha256).hexdigest()}"


def _valid(token: str | None) -> bool:
    if not token or not settings.hub_admin_password or "." not in token:
        return False
    exp, sig = token.split(".", 1)
    want = hmac.new(_key(), exp.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(sig, want) and exp.isdigit() and int(exp) > time.time()


_attempts: dict[str, list[float]] = {}


def _rate_limited(ip: str) -> bool:
    now = time.time()
    lst = [t for t in _attempts.get(ip, []) if now - t < 300]
    _attempts[ip] = lst
    if len(lst) >= 5:
        return True
    lst.append(now)
    return False


def _ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    return fwd.split(",")[0].strip() or (request.client.host if request.client else "?")


CSS = """
:root{--bg:#faf5ec;--fg:#2a2118;--mut:#8a7a68;--card:#fffdf8;--bd:#e6dccb;--acc:#b4552d}
*{box-sizing:border-box}body{font:15px/1.5 system-ui;background:var(--bg);color:var(--fg);margin:0;padding:1.5rem}
main{max-width:64rem;margin:0 auto;display:grid;gap:1rem}
h1{font-size:1.4rem;margin:0}h2{font-size:1rem;margin:0 0 .6rem}
section{background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:1rem}
.grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(9rem,1fr))}
.stat b{display:block;font-size:1.6rem;color:var(--acc)}
table{width:100%;border-collapse:collapse;font-size:.85rem}
td,th{padding:.3rem .5rem;border-top:1px solid var(--bd);text-align:left;vertical-align:top}
input,select,textarea{font:inherit;padding:.45rem .6rem;border:1px solid var(--bd);border-radius:8px;background:#fff;max-width:100%}
button{font:inherit;padding:.45rem 1rem;border:0;border-radius:999px;background:var(--acc);color:#fff;cursor:pointer}
form.row{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center}
.mut{color:var(--mut)}.pill{border:1px solid var(--bd);border-radius:999px;padding:.1rem .6rem;font-size:.8rem}
a{color:var(--acc)}
"""


def _page(title: str, body: str) -> HTMLResponse:
    return HTMLResponse(
        f"""<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>{title}</title>
<style>{CSS}</style></head><body><main>{body}</main></body></html>"""
    )


def _login_page(error: str = "") -> HTMLResponse:
    err = f'<p style="color:#c04327">{error}</p>' if error else ""
    return _page(
        "hub · вход",
        f"""<h1>suslicke-hub</h1>{err}
<section><form method="post" action="/hub/login" class="row">
<input type="password" name="password" placeholder="пароль" autofocus>
<button>Войти</button></form></section>""",
    )


def _esc(s: object) -> str:
    return (
        str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


async def _dashboard() -> HTMLResponse:
    day = datetime.combine(datetime.now(timezone.utc).date(), dtime.min, tzinfo=timezone.utc)
    week = day - timedelta(days=6)
    async with session_factory() as s:
        cfg = await s.get(QrConfig, 1)

        async def count(model, since, *extra):
            q = select(func.count()).select_from(model).where(model.ts >= since, *extra)
            return await s.scalar(q) or 0

        nb = PageView.is_bot.is_(False)
        views_d, views_w = await count(PageView, day, nb), await count(PageView, week, nb)
        uniq_d = await s.scalar(
            select(func.count(func.distinct(PageView.visitor_hash))).where(PageView.ts >= day, nb)
        ) or 0
        scans_d, scans_w = await count(QrScan, day), await count(QrScan, week)
        surv_w = await count(SurveyAnswer, week)

        top_paths = (await s.execute(
            select(PageView.path, func.count().label("n"))
            .where(PageView.ts >= week, nb)
            .group_by(PageView.path).order_by(desc("n")).limit(8)
        )).all()
        personas = (await s.execute(
            select(PageView.persona, func.count().label("n"))
            .where(PageView.ts >= week, nb, PageView.persona != "")
            .group_by(PageView.persona).order_by(desc("n"))
        )).all()
        recent_surveys = (await s.execute(
            select(SurveyAnswer).order_by(SurveyAnswer.ts.desc()).limit(10)
        )).scalars().all()
        settings_rows = (await s.execute(select(SiteSetting))).scalars().all()

    event_badge = (
        f'<span class="pill">🟢 ивент: {_esc(cfg.event_name)}</span>'
        if cfg.event_active else '<span class="pill">⚪ ивент выключен</span>'
    )
    paths_html = "".join(f"<tr><td>{_esc(p)}</td><td>{n}</td></tr>" for p, n in top_paths) or "<tr><td class=mut colspan=2>пока пусто</td></tr>"
    personas_html = " ".join(f'<span class="pill">{_esc(p)}: {n}</span>' for p, n in personas) or '<span class="mut">пока пусто</span>'
    surveys_html = "".join(
        f"<tr><td>{r.ts:%d.%m %H:%M}</td><td>{_esc(r.event_slug) or '·'}</td>"
        f"<td>{_esc(r.answer)}</td><td>{_esc(r.free_text) or '·'}</td><td>{_esc(r.persona) or '·'}</td></tr>"
        for r in recent_surveys
    ) or "<tr><td class=mut colspan=5>пока пусто</td></tr>"
    settings_html = "".join(
        f"""<tr><td>{_esc(r.key)}</td><td><form method="post" action="/hub/settings" class="row">
<input type="hidden" name="key" value="{_esc(r.key)}">
<input name="value" value="{_esc(json.dumps(r.value, ensure_ascii=False))}" style="min-width:16rem">
<button>Сохранить</button></form></td></tr>"""
        for r in settings_rows
    )
    personas_opts = "".join(
        f'<option value="{p}" {"selected" if cfg.event_default_persona == p else ""}>{p or ": не задана"}</option>'
        for p in ("", "biz", "dev", "hr", "hi")
    )

    body = f"""
<h1>suslicke-hub {event_badge} <a href="/hub/logout" style="font-size:.8rem">выйти</a></h1>

<section><h2>Сегодня / 7 дней (UTC)</h2><div class="grid">
<div class="stat"><b>{views_d}</b>визиты сегодня</div>
<div class="stat"><b>{uniq_d}</b>уникальных сегодня</div>
<div class="stat"><b>{views_w}</b>визиты за неделю</div>
<div class="stat"><b>{scans_d} / {scans_w}</b>сканы /qr день/неделя</div>
<div class="stat"><b>{surv_w}</b>ответы опроса за неделю</div>
</div><p>{personas_html}</p></section>

<section><h2>QR-редирект</h2>
<p class="mut">Сейчас: <code>{_esc(cfg.target)}?utm_source={_esc(cfg.utm_source)}&amp;utm_medium={_esc(cfg.utm_medium)}&amp;utm_campaign={_esc(cfg.utm_campaign)}</code></p>
<form method="post" action="/hub/qr" class="row">
<input name="utm_source" value="{_esc(cfg.utm_source)}" placeholder="source">
<input name="utm_medium" value="{_esc(cfg.utm_medium)}" placeholder="medium">
<input name="utm_campaign" value="{_esc(cfg.utm_campaign)}" placeholder="campaign">
<input name="target" value="{_esc(cfg.target)}" placeholder="target">
<button>Обновить</button></form></section>

<section><h2>Ивент-режим</h2>
<form method="post" action="/hub/event" class="row">
<input name="name" value="{_esc(cfg.event_name)}" placeholder="Название ивента">
<select name="default_persona">{personas_opts}</select>
<button name="action" value="start">Включить</button>
<button name="action" value="stop" style="background:#8a7a68">Выключить</button>
</form>
<p class="mut">Включение атомарно ставит utm_campaign = slug ивента. Управляется и ботом: /event start &lt;Название&gt;.</p></section>

<section><h2>Топ страниц за неделю</h2><table>{paths_html}</table></section>

<section><h2>Последние ответы опроса</h2>
<table><tr><th>когда</th><th>ивент</th><th>ответ</th><th>текст</th><th>персона</th></tr>{surveys_html}</table></section>

<section><h2>site_settings</h2><table>{settings_html}</table>
<form method="post" action="/hub/settings" class="row">
<input name="key" placeholder="ключ"><input name="value" placeholder='значение (JSON: "строка", true, 42)' style="min-width:16rem">
<button>Добавить</button></form>
<p class="mut">Сайт читает их через GET /api/settings (кэш ~60с).</p></section>
"""
    return _page("suslicke-hub", body)


@router.get("", response_class=HTMLResponse)
@router.get("/", response_class=HTMLResponse)
async def hub_home(request: Request):
    if not settings.hub_admin_password:
        return _page("hub", "<p>HUB_ADMIN_PASSWORD не задан в .env</p>")
    if not _valid(request.cookies.get(COOKIE)):
        return _login_page()
    return await _dashboard()


@router.post("/login")
async def hub_login(request: Request, password: str = Form("")):
    if _rate_limited(_ip(request)):
        return _login_page("Слишком много попыток, подождите 5 минут")
    if not settings.hub_admin_password or not hmac.compare_digest(
        password, settings.hub_admin_password
    ):
        log.warning("hub login failed from %s", _ip(request))
        return _login_page("Неверный пароль")
    resp = RedirectResponse("/hub", status_code=303)
    resp.set_cookie(
        COOKIE, _make_token(), max_age=SESSION_TTL, path="/hub",
        httponly=True, secure=True, samesite="strict",
    )
    return resp


@router.get("/logout")
async def hub_logout():
    resp = RedirectResponse("/hub", status_code=303)
    resp.delete_cookie(COOKIE, path="/hub")
    return resp


def _guard(request: Request) -> RedirectResponse | None:
    if not _valid(request.cookies.get(COOKIE)):
        return RedirectResponse("/hub", status_code=303)
    return None


@router.post("/qr")
async def hub_qr(
    request: Request,
    utm_source: str = Form(""), utm_medium: str = Form(""),
    utm_campaign: str = Form(""), target: str = Form("/"),
):
    if (r := _guard(request)):
        return r
    if not (target.startswith("/") or target.startswith(TARGET_ALLOWED[1:])):
        target = "/"
    async with session_factory() as s:
        cfg = await s.get(QrConfig, 1)
        cfg.utm_source = slugify(utm_source or "shirt")
        cfg.utm_medium = slugify(utm_medium or "offline")
        cfg.utm_campaign = slugify(utm_campaign or "networking")
        cfg.target = target[:200]
        cfg.updated_by = "hub-admin"
        await s.commit()
    invalidate_cfg_cache()
    return RedirectResponse("/hub", status_code=303)


@router.post("/event")
async def hub_event(
    request: Request,
    action: str = Form("stop"), name: str = Form(""), default_persona: str = Form(""),
):
    if (r := _guard(request)):
        return r
    async with session_factory() as s:
        cfg = await s.get(QrConfig, 1)
        if action == "start" and name.strip():
            cfg.event_active = True
            cfg.event_name = name.strip()[:120]
            cfg.event_slug = slugify(name)
            cfg.event_default_persona = default_persona if default_persona in ("biz", "dev", "hr", "hi") else ""
            cfg.event_started_at = datetime.now(timezone.utc)
            cfg.utm_campaign = cfg.event_slug
        else:
            cfg.event_active = False
            cfg.utm_campaign = "networking"
        cfg.updated_by = "hub-admin"
        await s.commit()
    invalidate_cfg_cache()
    await botmod.notify_admin(
        f"🖥 Из админки: ивент {'включён: ' + name if action == 'start' and name.strip() else 'выключен'}"
    )
    return RedirectResponse("/hub", status_code=303)


@router.post("/settings")
async def hub_settings(request: Request, key: str = Form(...), value: str = Form("")):
    if (r := _guard(request)):
        return r
    key = key.strip()[:60]
    if key:
        try:
            parsed = json.loads(value) if value.strip() else ""
        except json.JSONDecodeError:
            parsed = value  # plain string convenience
        async with session_factory() as s:
            row = await s.get(SiteSetting, key)
            if row is None:
                s.add(SiteSetting(key=key, value=parsed))
            else:
                row.value = parsed
            await s.commit()
    return RedirectResponse("/hub", status_code=303)
