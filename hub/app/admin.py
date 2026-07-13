"""/hub — owner's web admin: visit/scan/survey dashboard + QR, event and
site-settings forms. Single password (HUB_ADMIN_PASSWORD env), signed
expiring session cookie, in-memory login rate limit.

ponytail: f-string HTML instead of a template engine — two pages, one
viewer. Reach for Jinja when a third page appears.

Design: self-contained (zero CDN/external assets/JS), light/dark via
prefers-color-scheme, palette synced with the site's "Warm Steppe
Editorial" theme (light sand/terracotta, dark evening-blue/peach).
Charts are server-side inline SVG from .charts.
"""

import contextlib
import hashlib
import hmac
import json
import logging
import os
import time
import uuid
from datetime import datetime, time as dtime, timedelta, timezone

from fastapi import APIRouter, File, Form, Request, UploadFile
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy import desc, func, select

from . import bot as botmod
from .charts import bar_chart_svg, donut_svg, fill_daily_series
from .config import settings
from .db import PageView, QrConfig, QrScan, SiteSetting, SurveyAnswer, session_factory
from .helpers import (
    EXT_KIND,
    media_ext,
    parse_event_links,
    safe_media_filename,
    slugify,
    sniff_image_kind,
)
from .qr import invalidate_cfg_cache

log = logging.getLogger(__name__)
router = APIRouter(prefix="/hub")

SESSION_TTL = 7 * 24 * 3600
COOKIE = "hub_session"

TARGET_ALLOWED = ("/", "https://suslicke.com", "https://suslicketeam.com")

PERSONAS = ("", "biz", "dev", "hr", "hi")
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_EVENT_LINKS = 5


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


# --- look & feel --------------------------------------------------------------

CSS = """
:root{
  --bg:#faf5ec;--card:#fffdf8;--fg:#2a2118;--mut:#8a7a68;--bd:#e6dccb;
  --acc:#b4552d;--acc-fg:#fff;--acc-soft:rgba(180,85,45,.09);
  --ok:#3f8f5f;--ok-glow:rgba(63,143,95,.45);--err:#c04327;
  --c1:#b4552d;--c2:#c9973b;--c3:#6f8f5a;--c4:#5c6f9e;--c5:#8a7a68;
  --shadow:0 1px 2px rgba(42,33,24,.05),0 12px 28px -16px rgba(42,33,24,.25);
  --shadow-lift:0 2px 4px rgba(42,33,24,.06),0 18px 40px -18px rgba(42,33,24,.32);
}
@media (prefers-color-scheme:dark){:root{
  --bg:#181d2e;--card:#1f2638;--fg:#ece4d6;--mut:#949db8;--bd:#2d3651;
  --acc:#e8a87c;--acc-fg:#241407;--acc-soft:rgba(232,168,124,.12);
  --ok:#58ba7f;--ok-glow:rgba(88,186,127,.5);--err:#e0765c;
  --c1:#e8a87c;--c2:#d9b86b;--c3:#8fb47e;--c4:#8b9cc9;--c5:#949db8;
  --shadow:0 1px 2px rgba(0,0,0,.35),0 14px 32px -16px rgba(0,0,0,.6);
  --shadow-lift:0 2px 6px rgba(0,0,0,.4),0 20px 44px -18px rgba(0,0,0,.65);
}}
*{box-sizing:border-box}
html{color-scheme:light dark}
body{margin:0;padding:clamp(1rem,2.5vw,2rem);background:var(--bg);color:var(--fg);
  font:15px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  -webkit-font-smoothing:antialiased}
main{max-width:74rem;margin:0 auto;display:grid;gap:1.1rem}
header.top{display:flex;align-items:center;gap:.8rem;flex-wrap:wrap}
header.top .sp{flex:1}
h1{font-size:1.5rem;letter-spacing:-.02em;margin:0}
h2{font-size:.78rem;text-transform:uppercase;letter-spacing:.09em;color:var(--mut);
  margin:0 0 .9rem;font-weight:600}
h3{font-size:.9rem;margin:0 0 .45rem;font-weight:600}
section{background:var(--card);border:1px solid var(--bd);border-radius:16px;
  padding:1.15rem 1.3rem;box-shadow:var(--shadow);transition:box-shadow .25s}
section:hover{box-shadow:var(--shadow-lift)}
.cols{display:grid;gap:1.1rem;grid-template-columns:repeat(auto-fit,minmax(21rem,1fr))}
.grid{display:grid;gap:.8rem;grid-template-columns:repeat(auto-fit,minmax(9.5rem,1fr))}
.stat{background:var(--acc-soft);border-radius:12px;padding:.75rem .95rem;transition:transform .18s}
.stat:hover{transform:translateY(-2px)}
.stat b{display:block;font-size:1.7rem;line-height:1.25;color:var(--acc);font-variant-numeric:tabular-nums}
.stat span{font-size:.78rem;color:var(--mut)}
table{width:100%;border-collapse:collapse;font-size:.85rem}
td,th{padding:.42rem .55rem;border-top:1px solid var(--bd);text-align:left;vertical-align:top}
th{color:var(--mut);font-weight:600;font-size:.72rem;text-transform:uppercase;
  letter-spacing:.06em;border-top:0}
tr{transition:background .15s}
tr:hover td{background:var(--acc-soft)}
input,select,textarea{font:inherit;color:var(--fg);padding:.5rem .7rem;border:1px solid var(--bd);
  border-radius:10px;background:var(--bg);max-width:100%;transition:border-color .15s,box-shadow .15s}
input:focus,select:focus,textarea:focus{outline:none;border-color:var(--acc);
  box-shadow:0 0 0 3px var(--acc-soft)}
textarea{width:100%;resize:vertical}
button{font:inherit;font-weight:600;padding:.5rem 1.2rem;border:0;border-radius:999px;
  background:var(--acc);color:var(--acc-fg);cursor:pointer;
  transition:transform .15s,filter .15s,box-shadow .15s}
button:hover{transform:translateY(-1px);filter:brightness(1.06);box-shadow:0 6px 16px -8px var(--acc)}
button:active{transform:none}
button.danger{background:transparent;color:var(--err);border:1px solid var(--err)}
button.danger:hover{box-shadow:0 6px 16px -8px var(--err)}
form.row{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center}
.stack{display:grid;gap:.9rem}
.field{display:grid;gap:.3rem;font-size:.78rem;color:var(--mut)}
.field input,.field textarea{font-size:.95rem}
.mut{color:var(--mut)}.small{font-size:.8rem}
.pill{border:1px solid var(--bd);border-radius:999px;padding:.15rem .7rem;font-size:.8rem;
  display:inline-flex;align-items:center;gap:.35rem}
.pill.on{border-color:var(--ok);color:var(--ok)}
a{color:var(--acc)}
code{background:var(--acc-soft);padding:.12rem .4rem;border-radius:6px;font-size:.85em;
  overflow-wrap:anywhere}
.dot{width:.6rem;height:.6rem;border-radius:50%;display:inline-block;flex:none}
.notice{border:1px solid var(--err);color:var(--err);border-radius:12px;padding:.6rem .95rem;
  background:var(--card);box-shadow:var(--shadow)}
.notice.ok{border-color:var(--ok);color:var(--ok)}
/* event toggle */
.switch{position:relative;display:inline-block;width:62px;height:34px;flex:none}
.switch input{position:absolute;opacity:0;inset:0;margin:0;cursor:pointer;z-index:1}
.slider{position:absolute;inset:0;background:var(--bd);border-radius:999px;
  transition:background .25s,box-shadow .25s}
.slider:before{content:"";position:absolute;width:26px;height:26px;left:4px;top:4px;
  border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);
  transition:transform .25s cubic-bezier(.34,1.56,.64,1)}
.switch input:checked ~ .slider{background:var(--ok);box-shadow:0 0 14px var(--ok-glow)}
.switch input:checked ~ .slider:before{transform:translateX(28px)}
.ev-head{display:flex;gap:.9rem;align-items:center}
/* persona radio-pills */
.pills{display:flex;gap:.45rem;flex-wrap:wrap}
.pills label{position:relative;cursor:pointer}
.pills input{position:absolute;opacity:0;inset:0;margin:0;cursor:pointer}
.pills span{display:inline-block;border:1px solid var(--bd);border-radius:999px;
  padding:.35rem .95rem;font-size:.85rem;transition:background .15s,border-color .15s,
  color .15s,box-shadow .15s}
.pills label:hover span{border-color:var(--acc)}
.pills input:checked + span{background:var(--acc);border-color:var(--acc);color:var(--acc-fg);
  box-shadow:0 4px 12px -6px var(--acc)}
.linkrow{display:grid;gap:.5rem;grid-template-columns:minmax(7rem,1fr) minmax(10rem,2fr)}
.ev-img{max-width:220px;max-height:160px;border-radius:12px;border:1px solid var(--bd);display:block}
.charts{display:grid;gap:1.3rem;grid-template-columns:repeat(auto-fit,minmax(19rem,1fr))}
.donut-wrap{display:flex;gap:1.1rem;align-items:center;flex-wrap:wrap}
.legend{display:grid;gap:.35rem;font-size:.82rem}
.legend span{display:inline-flex;align-items:center;gap:.45rem}
.login-wrap{min-height:72vh;display:grid;place-items:center}
.login-card{width:min(23rem,100%);text-align:center}
.login-card form{justify-content:center}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
"""


def _page(title: str, body: str) -> HTMLResponse:
    return HTMLResponse(
        f"""<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="robots" content="noindex,nofollow"><title>{title}</title>
<style>{CSS}</style></head><body><main>{body}</main></body></html>"""
    )


def _login_page(error: str = "") -> HTMLResponse:
    err = f'<p style="color:var(--err)">{error}</p>' if error else ""
    return _page(
        "hub · вход",
        f"""<div class="login-wrap"><section class="login-card stack">
<h1>suslicke-hub</h1>{err}
<form method="post" action="/hub/login" class="row">
<input type="password" name="password" placeholder="пароль" autofocus>
<button>Войти</button></form></section></div>""",
    )


def _esc(s: object) -> str:
    return (
        str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


NOTES = {
    "saved": ("ok", "Сохранено"),
    "img_ok": ("ok", "Картинка обновлена"),
    "img_del": ("ok", "Картинка удалена"),
    "img_type": ("err", "Картинка: только jpg / png / webp"),
    "img_size": ("err", "Картинка больше 5 МБ"),
    "img_empty": ("err", "Файл не выбран или пуст"),
    "event_name": ("err", "Чтобы включить ивент, укажи название"),
}

CHART_COLORS = ["var(--c1)", "var(--c2)", "var(--c3)", "var(--c4)", "var(--c5)"]


def _event_section(cfg) -> str:
    links = [l for l in (cfg.event_links or []) if isinstance(l, dict)]
    link_rows = "".join(
        f"""<div class="linkrow">
<input name="link_label_{i}" maxlength="60" placeholder="Название ссылки"
 value="{_esc((links[i].get('label', '') if i < len(links) else ''))}">
<input name="link_url_{i}" maxlength="300" placeholder="https://…"
 value="{_esc((links[i].get('url', '') if i < len(links) else ''))}">
</div>"""
        for i in range(MAX_EVENT_LINKS)
    )
    pills = "".join(
        f"""<label><input type="radio" name="default_persona" value="{p}"
 {'checked' if cfg.event_default_persona == p else ''}><span>{p or 'не задана'}</span></label>"""
        for p in PERSONAS
    )
    if cfg.event_image:
        img_html = f"""<div class="row" style="align-items:flex-start;gap:1rem">
<img src="/api/media/{_esc(cfg.event_image)}" alt="картинка ивента" class="ev-img">
<form method="post" action="/hub/event-image/delete"><button class="danger">Удалить картинку</button></form>
</div>"""
    else:
        img_html = '<p class="mut small" style="margin:.2rem 0">Картинки пока нет.</p>'
    state = (
        f'ивент <b style="color:var(--ok)">включён</b> — {_esc(cfg.event_name)}'
        if cfg.event_active else "ивент выключен"
    )
    return f"""<section><h2>Ивент</h2>
<form method="post" action="/hub/event" class="stack">
<div class="ev-head">
<label class="switch"><input type="checkbox" name="active" {'checked' if cfg.event_active else ''}>
<span class="slider"></span></label>
<div><div>{state}</div>
<div class="mut small">Включение атомарно ставит utm_campaign = slug ивента и шлёт уведомление в бот. Также: /event start &lt;Название&gt;.</div></div>
</div>
<label class="field">Название
<input name="name" maxlength="120" value="{_esc(cfg.event_name)}" placeholder="Название ивента"></label>
<label class="field">Описание (показывается в попапе на сайте)
<textarea name="description" rows="3" maxlength="2000" placeholder="Пара предложений о ивенте…">{_esc(cfg.event_description)}</textarea></label>
<div class="field"><span>Ссылки (до {MAX_EVENT_LINKS}, пара «название + URL»; пустые строки игнорируются)</span>
<div class="stack" style="gap:.5rem">{link_rows}</div></div>
<div class="field"><span>Персона по умолчанию (параметр <code>as</code> в /qr-редиректе)</span>
<div class="pills">{pills}</div></div>
<div><button>Сохранить ивент</button></div>
</form>
<div class="stack" style="margin-top:1rem">
<h3>Картинка ивента</h3>
{img_html}
<form method="post" action="/hub/event-image" enctype="multipart/form-data" class="row">
<input type="file" name="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp">
<button>Загрузить</button></form>
<p class="mut small" style="margin:0">jpg / png / webp, до 5 МБ. Отдаётся сайту как <code>/api/media/…</code>.</p>
</div></section>"""


async def _dashboard(note_key: str = "") -> HTMLResponse:
    today = datetime.now(timezone.utc).date()
    day = datetime.combine(today, dtime.min, tzinfo=timezone.utc)
    week = day - timedelta(days=6)
    start14 = day - timedelta(days=13)
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

        pv_day = func.date_trunc("day", PageView.ts)
        visit_rows = (await s.execute(
            select(pv_day, func.count()).where(PageView.ts >= start14, nb).group_by(pv_day)
        )).all()
        scan_day = func.date_trunc("day", QrScan.ts)
        scan_rows = (await s.execute(
            select(scan_day, func.count()).where(QrScan.ts >= start14).group_by(scan_day)
        )).all()

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

    # charts: dense 14-day series (missing days = 0), server-side SVG
    visits_series = fill_daily_series({r[0].date(): r[1] for r in visit_rows}, 14, today)
    scans_series = fill_daily_series({r[0].date(): r[1] for r in scan_rows}, 14, today)
    visits_svg = bar_chart_svg(
        [(d.strftime("%d.%m"), v) for d, v in visits_series],
        color="var(--c1)", title="Визиты за 14 дней",
    )
    scans_svg = bar_chart_svg(
        [(d.strftime("%d.%m"), v) for d, v in scans_series],
        color="var(--c2)", title="Сканы /qr за 14 дней",
    )
    persona_parts = [(p, n) for p, n in personas]
    donut = donut_svg(persona_parts, CHART_COLORS)
    legend = "".join(
        f'<span><i class="dot" style="background:{CHART_COLORS[i % len(CHART_COLORS)]}"></i>'
        f'{_esc(p)} — {n}</span>'
        for i, (p, n) in enumerate(persona_parts)
    ) or '<span class="mut">персон за неделю нет</span>'

    event_badge = (
        f'<span class="pill on">● ивент: {_esc(cfg.event_name)}</span>'
        if cfg.event_active else '<span class="pill">○ ивент выключен</span>'
    )
    kind, text = NOTES.get(note_key, ("", ""))
    notice = f'<div class="notice {"ok" if kind == "ok" else ""}">{text}</div>' if text else ""

    paths_html = "".join(
        f"<tr><td>{_esc(p)}</td><td>{n}</td></tr>" for p, n in top_paths
    ) or "<tr><td class=mut colspan=2>пока пусто</td></tr>"
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

    body = f"""
<header class="top"><h1>suslicke-hub</h1>{event_badge}<span class="sp"></span>
<a href="/hub/logout" class="small">выйти</a></header>
{notice}

<section><h2>Сегодня / 7 дней (UTC)</h2><div class="grid">
<div class="stat"><b>{views_d}</b><span>визиты сегодня</span></div>
<div class="stat"><b>{uniq_d}</b><span>уникальных сегодня</span></div>
<div class="stat"><b>{views_w}</b><span>визиты за неделю</span></div>
<div class="stat"><b>{scans_d} / {scans_w}</b><span>сканы /qr день/неделя</span></div>
<div class="stat"><b>{surv_w}</b><span>ответы опроса за неделю</span></div>
</div></section>

<section><h2>Динамика за 14 дней</h2><div class="charts">
<div><h3>Визиты (не-боты)</h3>{visits_svg}</div>
<div><h3>Сканы /qr</h3>{scans_svg}</div>
<div><h3>Персоны за неделю</h3><div class="donut-wrap">{donut}<div class="legend">{legend}</div></div></div>
</div></section>

{_event_section(cfg)}

<div class="cols">
<section><h2>QR-редирект</h2>
<p class="mut small">Сейчас: <code>{_esc(cfg.target)}?utm_source={_esc(cfg.utm_source)}&amp;utm_medium={_esc(cfg.utm_medium)}&amp;utm_campaign={_esc(cfg.utm_campaign)}</code></p>
<form method="post" action="/hub/qr" class="stack">
<label class="field">utm_source<input name="utm_source" value="{_esc(cfg.utm_source)}" placeholder="source"></label>
<label class="field">utm_medium<input name="utm_medium" value="{_esc(cfg.utm_medium)}" placeholder="medium"></label>
<label class="field">utm_campaign<input name="utm_campaign" value="{_esc(cfg.utm_campaign)}" placeholder="campaign"></label>
<label class="field">target<input name="target" value="{_esc(cfg.target)}" placeholder="target"></label>
<div><button>Обновить</button></div></form></section>

<section><h2>Топ страниц за неделю</h2><table>
<tr><th>страница</th><th>визиты</th></tr>{paths_html}</table></section>
</div>

<section><h2>Последние ответы опроса</h2>
<table><tr><th>когда</th><th>ивент</th><th>ответ</th><th>текст</th><th>персона</th></tr>{surveys_html}</table></section>

<section><h2>site_settings</h2><table>{settings_html}</table>
<form method="post" action="/hub/settings" class="row" style="margin-top:.7rem">
<input name="key" placeholder="ключ"><input name="value" placeholder='значение (JSON: "строка", true, 42)' style="min-width:16rem">
<button>Добавить</button></form>
<p class="mut small">Сайт читает их через GET /api/settings (кэш ~60с).</p></section>
"""
    return _page("suslicke-hub", body)


@router.get("", response_class=HTMLResponse)
@router.get("/", response_class=HTMLResponse)
async def hub_home(request: Request):
    if not settings.hub_admin_password:
        return _page("hub", "<p>HUB_ADMIN_PASSWORD не задан в .env</p>")
    if not _valid(request.cookies.get(COOKIE)):
        return _login_page()
    return await _dashboard(request.query_params.get("note", ""))


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
    return RedirectResponse("/hub?note=saved", status_code=303)


@router.post("/event")
async def hub_event(request: Request):
    if (r := _guard(request)):
        return r
    form = await request.form()
    want = bool(form.get("active"))
    name = str(form.get("name", "")).strip()[:120]
    description = str(form.get("description", "")).strip()[:2000]
    persona = str(form.get("default_persona", ""))
    links = parse_event_links(
        [str(form.get(f"link_label_{i}", "")) for i in range(MAX_EVENT_LINKS)],
        [str(form.get(f"link_url_{i}", "")) for i in range(MAX_EVENT_LINKS)],
        MAX_EVENT_LINKS,
    )
    if want and not name:
        # Don't discard what was just typed: persist the content fields
        # (description / links / persona), leave name + active state + utm
        # untouched, and only then show the "name required" notice.
        async with session_factory() as s:
            cfg = await s.get(QrConfig, 1)
            cfg.event_description = description
            cfg.event_links = links
            cfg.event_default_persona = persona if persona in PERSONAS else ""
            cfg.updated_by = "hub-admin"
            await s.commit()
        invalidate_cfg_cache()
        return RedirectResponse("/hub?note=event_name", status_code=303)
    async with session_factory() as s:
        cfg = await s.get(QrConfig, 1)
        was = cfg.event_active
        cfg.event_name = name
        cfg.event_description = description
        cfg.event_links = links
        cfg.event_default_persona = persona if persona in PERSONAS else ""
        if want:
            # atomic: banner + utm never diverge
            cfg.event_active = True
            cfg.event_slug = slugify(name)
            cfg.utm_campaign = cfg.event_slug
            if not was:
                cfg.event_started_at = datetime.now(timezone.utc)
        else:
            cfg.event_active = False
            if was:
                cfg.utm_campaign = "networking"
        cfg.updated_by = "hub-admin"
        await s.commit()
    invalidate_cfg_cache()
    if want and not was:
        await botmod.notify_admin(f"🖥 Из админки: ивент включён: {name}")
    elif was and not want:
        await botmod.notify_admin("🖥 Из админки: ивент выключен")
    return RedirectResponse("/hub?note=saved", status_code=303)


def _remove_media(name: str) -> None:
    safe = safe_media_filename(name) if name else None
    if safe is None:
        return
    with contextlib.suppress(OSError):
        os.remove(os.path.join(settings.media_dir, safe))


@router.post("/event-image")
async def hub_event_image(request: Request, file: UploadFile | None = File(None)):
    if (r := _guard(request)):
        return r
    if file is None or not file.filename:
        return RedirectResponse("/hub?note=img_empty", status_code=303)
    ext = media_ext(file.filename)
    if ext is None:
        return RedirectResponse("/hub?note=img_type", status_code=303)
    data = await file.read(MAX_IMAGE_BYTES + 1)
    if not data:
        return RedirectResponse("/hub?note=img_empty", status_code=303)
    if len(data) > MAX_IMAGE_BYTES:
        return RedirectResponse("/hub?note=img_size", status_code=303)
    # content must actually be the image type the extension claims (magic bytes)
    if sniff_image_kind(data) != EXT_KIND[ext]:
        return RedirectResponse("/hub?note=img_type", status_code=303)
    fname = f"{uuid.uuid4().hex}.{ext}"
    os.makedirs(settings.media_dir, exist_ok=True)
    with open(os.path.join(settings.media_dir, fname), "wb") as fh:
        fh.write(data)
    async with session_factory() as s:
        cfg = await s.get(QrConfig, 1)
        old = cfg.event_image
        cfg.event_image = fname
        cfg.updated_by = "hub-admin"
        await s.commit()
    _remove_media(old)
    invalidate_cfg_cache()
    return RedirectResponse("/hub?note=img_ok", status_code=303)


@router.post("/event-image/delete")
async def hub_event_image_delete(request: Request):
    if (r := _guard(request)):
        return r
    async with session_factory() as s:
        cfg = await s.get(QrConfig, 1)
        old = cfg.event_image
        cfg.event_image = ""
        cfg.updated_by = "hub-admin"
        await s.commit()
    _remove_media(old)
    invalidate_cfg_cache()
    return RedirectResponse("/hub?note=img_del", status_code=303)


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
    return RedirectResponse("/hub?note=saved", status_code=303)
