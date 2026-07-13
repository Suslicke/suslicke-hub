import asyncio
import logging
import os
import time
from datetime import date

from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy import select

from . import bot as botmod
from .config import settings
from .db import PageView, QrConfig, QrScan, SiteSetting, SurveyAnswer, session_factory
from .helpers import (
    build_redirect_url,
    looks_like_bot,
    safe_media_filename,
    ua_hash,
    visitor_hash,
)

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
    "event_name_en": "",
    "event_slug": "",
    "event_default_persona": "",
    "event_description": "",
    "event_description_en": "",
    "event_image": "",
    "event_links": [],
}
_cache: dict = {"at": 0.0, "cfg": DEFAULT_CFG}
CACHE_TTL = 5.0

# Strong refs for fire-and-forget tasks (asyncio keeps only weak refs).
_bg_tasks: set[asyncio.Task] = set()


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

    # Fire-and-forget, but keep a strong reference: the loop holds only weak
    # refs to tasks, so an unreferenced task can be GC'd before it runs.
    task = asyncio.create_task(record())
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)
    return RedirectResponse(url, status_code=307)


@router.get("/api/event-status")
async def event_status(locale: str = ""):
    """Public event card for the site popup. Nothing private leaks: only the
    curated event fields, and all of them empty/null while the event is off.
    `?locale=en` serves the English name/description when filled (ru fallback)."""
    cfg = await get_cfg()
    if not cfg["event_active"]:
        return {"active": False, "name": "", "description": "", "image": None, "links": []}
    image = cfg["event_image"]
    en = locale.lower().startswith("en")
    return {
        "active": True,
        "name": (cfg["event_name_en"] if en and cfg["event_name_en"] else cfg["event_name"]),
        "description": (cfg["event_description_en"] if en and cfg["event_description_en"] else cfg["event_description"]),
        "image": f"/api/media/{image}" if image else None,
        "links": [
            {"label": str(l.get("label", "")), "url": str(l.get("url", ""))}
            for l in (cfg["event_links"] or [])
            if isinstance(l, dict)
        ][:5],
    }


_MEDIA_TYPES = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
}


@router.get("/api/media/{filename}")
async def media(filename: str):
    """Public serving of uploaded event images (uuid-named, admin-uploaded)."""
    safe = safe_media_filename(filename)
    if safe is None:
        return JSONResponse({"detail": "not found"}, status_code=404)
    path = os.path.realpath(os.path.join(settings.media_dir, safe))
    # belt-and-braces: safe_media_filename already forbids traversal
    if not path.startswith(os.path.realpath(settings.media_dir) + os.sep) or not os.path.isfile(path):
        return JSONResponse({"detail": "not found"}, status_code=404)
    ext = safe.rsplit(".", 1)[1].lower()
    return FileResponse(
        path,
        media_type=_MEDIA_TYPES[ext],
        headers={
            "Cache-Control": "public, max-age=3600",
            "X-Content-Type-Options": "nosniff",
        },
    )


class SurveyIn(BaseModel):
    answer: str = Field(pattern="^(here|street|friend|other)$")
    free_text: str = Field(default="", max_length=500)
    persona: str = Field(default="", max_length=10)
    contact: str = Field(default="", max_length=200)
    locale: str = Field(default="", max_length=5)
    utm: dict = Field(default_factory=dict)


@router.post("/api/event-survey")
async def event_survey(payload: SurveyIn, request: Request):
    if payload.answer == "other" and not payload.free_text.strip():
        return JSONResponse({"ok": False, "reason": "free_text_required"}, status_code=422)
    cfg = await get_cfg()
    ua = request.headers.get("user-agent", "")
    async with session_factory() as s:
        s.add(SurveyAnswer(
            event_slug=cfg["event_slug"],
            answer=payload.answer,
            free_text=payload.free_text.strip(),
            persona=payload.persona,
            contact=payload.contact.strip(),
            locale=payload.locale,
            ua_hash=ua_hash(ua),
            visitor_hash=visitor_hash(client_ip(request), ua, date.today()),
            utm={k: str(v)[:100] for k, v in list(payload.utm.items())[:8]},
        ))
        await s.commit()
    label = cfg["event_name"] or "вне ивента"
    await botmod.notify_admin(
        f"🔥 Опрос ({label}): ответ «{payload.answer}»"
        + (f", «{payload.free_text.strip()[:200]}»" if payload.free_text.strip() else "")
        + (f", персона {payload.persona}" if payload.persona else "")
        + (f"\n📱 КОНТАКТ: {payload.contact.strip()[:200]}" if payload.contact.strip() else "")
        + (f" [{payload.locale}]" if payload.locale else "")
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
