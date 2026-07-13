import asyncio
import logging
import time
from datetime import date

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import select

from . import bot as botmod
from .config import settings
from .db import PageView, QrConfig, QrScan, SiteSetting, SurveyAnswer, session_factory
from .helpers import build_redirect_url, looks_like_bot, ua_hash, visitor_hash

log = logging.getLogger(__name__)
router = APIRouter()

# The redirect must never fail: hardcoded fallback + tiny in-memory cache.
DEFAULT_CFG = {
    "target": "/",
    "utm_source": "shirt",
    "utm_medium": "offline",
    "utm_campaign": "networking",
    "event_active": False,
    "event_name": "",
    "event_slug": "",
    "event_default_persona": "",
}
_cache: dict = {"at": 0.0, "cfg": DEFAULT_CFG}
CACHE_TTL = 5.0


async def get_cfg() -> dict:
    if time.monotonic() - _cache["at"] < CACHE_TTL:
        return _cache["cfg"]
    try:
        async with session_factory() as s:
            row = await s.get(QrConfig, 1)
        if row is not None:
            _cache["cfg"] = {k: getattr(row, k) for k in DEFAULT_CFG}
            _cache["at"] = time.monotonic()
    except Exception:
        log.exception("qr_config read failed; serving cached/default")
    return _cache["cfg"]


def invalidate_cfg_cache() -> None:
    _cache["at"] = 0.0


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for", "")
    return fwd.split(",")[0].strip() or (request.client.host if request.client else "")


@router.get("/qr")
async def qr_redirect(request: Request):
    cfg = await get_cfg()
    url = build_redirect_url(settings.site_base_url, cfg)

    async def record() -> None:
        try:
            async with session_factory() as s:
                s.add(QrScan(
                    campaign=cfg["utm_campaign"],
                    event_slug=cfg["event_slug"] if cfg["event_active"] else "",
                    ua_hash=ua_hash(request.headers.get("user-agent", "")),
                ))
                await s.commit()
        except Exception:
            log.exception("qr scan log failed")

    asyncio.create_task(record())  # never blocks or breaks the redirect
    return RedirectResponse(url, status_code=307)


@router.get("/api/event-status")
async def event_status():
    cfg = await get_cfg()
    return {"active": cfg["event_active"], "name": cfg["event_name"] if cfg["event_active"] else ""}


class SurveyIn(BaseModel):
    answer: str = Field(pattern="^(here|street|friend|other)$")
    free_text: str = Field(default="", max_length=500)
    persona: str = Field(default="", max_length=10)
    utm: dict = Field(default_factory=dict)


@router.post("/api/event-survey")
async def event_survey(payload: SurveyIn):
    if payload.answer == "other" and not payload.free_text.strip():
        return JSONResponse({"ok": False, "reason": "free_text_required"}, status_code=422)
    cfg = await get_cfg()
    async with session_factory() as s:
        s.add(SurveyAnswer(
            event_slug=cfg["event_slug"],
            answer=payload.answer,
            free_text=payload.free_text.strip(),
            persona=payload.persona,
            utm={k: str(v)[:100] for k, v in list(payload.utm.items())[:8]},
        ))
        await s.commit()
    label = cfg["event_name"] or "вне ивента"
    await botmod.notify_admin(
        f"🔥 Опрос ({label}): ответ «{payload.answer}»"
        + (f", «{payload.free_text.strip()[:200]}»" if payload.free_text.strip() else "")
        + (f", персона {payload.persona}" if payload.persona else "")
    )
    return {"ok": True}


class HitIn(BaseModel):
    path: str = Field(max_length=200)
    locale: str = Field(default="", max_length=5)
    persona: str = Field(default="", max_length=10)
    referrer_host: str = Field(default="", max_length=120)
    utm_source: str = Field(default="", max_length=60)


@router.post("/api/hit")
async def hit(payload: HitIn, request: Request):
    ua = request.headers.get("user-agent", "")
    async with session_factory() as s:
        s.add(PageView(
            path=payload.path,
            locale=payload.locale,
            persona=payload.persona,
            referrer_host=payload.referrer_host,
            utm_source=payload.utm_source,
            visitor_hash=visitor_hash(client_ip(request), ua, date.today()),
            is_bot=looks_like_bot(ua),
        ))
        await s.commit()
    return {"ok": True}


@router.get("/api/settings")
async def site_settings():
    async with session_factory() as s:
        rows = (await s.execute(select(SiteSetting))).scalars().all()
    return {r.key: r.value for r in rows}
