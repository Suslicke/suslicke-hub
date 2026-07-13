"""@suslicke_bot — owner's remote control for /qr, event mode and daily stats.

Polling mode on purpose: no webhook, no public port, nothing to configure in
nginx. Admin commands are locked to ADMIN_CHAT_ID; /start tells anyone their
chat_id so the owner can fill that env on first run.
"""

import logging
from datetime import datetime, time, timezone

from aiogram import Bot, Dispatcher, Router
from aiogram.filters import Command, CommandObject
from aiogram.types import Message
from sqlalchemy import func, select

from .config import settings
from .db import PageView, QrConfig, QrScan, SurveyAnswer, session_factory, utcnow
from .helpers import build_redirect_url, slugify

log = logging.getLogger(__name__)
router = Router()

bot: Bot | None = None


async def notify_admin(text: str) -> None:
    if bot is None or not settings.admin_chat_id:
        log.info("notify_admin skipped (no bot/admin): %s", text)
        return
    try:
        await bot.send_message(settings.admin_chat_id, text)
    except Exception:
        log.exception("notify_admin failed")


def is_admin(msg: Message) -> bool:
    return bool(settings.admin_chat_id) and msg.chat.id == settings.admin_chat_id


async def _status_text() -> str:
    async with session_factory() as s:
        cfg = await s.get(QrConfig, 1)
    d = {k: getattr(cfg, k) for k in (
        "target", "utm_source", "utm_medium", "utm_campaign",
        "event_active", "event_name", "event_slug", "event_default_persona",
    )}
    url = build_redirect_url(settings.site_base_url, d)
    event = f"🟢 ивент: {d['event_name']}" if d["event_active"] else "⚪ ивент выключен"
    return f"{event}\n/qr ведёт на:\n{url}"


@router.message(Command("start"))
async def cmd_start(msg: Message):
    if is_admin(msg):
        await msg.answer(
            "Привет! Команды:\n"
            "/qr status — куда ведёт QR\n"
            "/qr set campaign|source|medium <значение>\n"
            "/event start <Название> — ивент-режим + метка\n"
            "/event stop\n"
            "/today — визиты, сканы, опросы за день"
        )
    else:
        await msg.answer(f"Ваш chat_id: {msg.chat.id}")


@router.message(Command("qr"))
async def cmd_qr(msg: Message, command: CommandObject):
    if not is_admin(msg):
        return
    args = (command.args or "status").split()
    if args[0] == "status":
        await msg.answer(await _status_text())
        return
    if args[0] == "set" and len(args) == 3 and args[1] in ("campaign", "source", "medium"):
        value = slugify(args[2])
        async with session_factory() as s:
            cfg = await s.get(QrConfig, 1)
            setattr(cfg, f"utm_{args[1]}", value)
            cfg.updated_by = "bot"
            await s.commit()
        _invalidate()
        await msg.answer(f"✅ utm_{args[1]} = {value}\n\n{await _status_text()}")
        return
    await msg.answer("Формат: /qr status | /qr set campaign|source|medium <значение>")


@router.message(Command("event"))
async def cmd_event(msg: Message, command: CommandObject):
    if not is_admin(msg):
        return
    args = (command.args or "").split(maxsplit=1)
    if args and args[0] == "start" and len(args) == 2:
        name = args[1].strip().strip('"')
        async with session_factory() as s:
            cfg = await s.get(QrConfig, 1)
            cfg.event_active = True
            cfg.event_name = name
            cfg.event_slug = slugify(name)
            cfg.event_started_at = utcnow()
            cfg.utm_campaign = cfg.event_slug  # atomic: banner + utm never diverge
            cfg.updated_by = "bot"
            await s.commit()
        _invalidate()
        await msg.answer(f"🟢 Ивент «{name}» включён.\n\n{await _status_text()}")
        return
    if args and args[0] == "stop":
        async with session_factory() as s:
            cfg = await s.get(QrConfig, 1)
            cfg.event_active = False
            cfg.utm_campaign = "networking"
            cfg.updated_by = "bot"
            await s.commit()
        _invalidate()
        await msg.answer(f"⚪ Ивент выключен.\n\n{await _status_text()}")
        return
    await msg.answer("Формат: /event start <Название> | /event stop")


@router.message(Command("today"))
async def cmd_today(msg: Message):
    if not is_admin(msg):
        return
    day_start = datetime.combine(utcnow().date(), time.min, tzinfo=timezone.utc)
    async with session_factory() as s:
        views = await s.scalar(select(func.count()).select_from(PageView)
                               .where(PageView.ts >= day_start, PageView.is_bot.is_(False)))
        uniq = await s.scalar(select(func.count(func.distinct(PageView.visitor_hash)))
                              .where(PageView.ts >= day_start, PageView.is_bot.is_(False)))
        scans = await s.scalar(select(func.count()).select_from(QrScan).where(QrScan.ts >= day_start))
        surveys = await s.scalar(select(func.count()).select_from(SurveyAnswer)
                                 .where(SurveyAnswer.ts >= day_start))
    await msg.answer(
        f"📊 Сегодня:\n"
        f"визиты: {views} (уникальных ≈ {uniq})\n"
        f"сканы /qr: {scans}\n"
        f"ответы опроса: {surveys}"
    )


def _invalidate() -> None:
    from .qr import invalidate_cfg_cache
    invalidate_cfg_cache()


def create_dispatcher() -> Dispatcher:
    dp = Dispatcher()
    dp.include_router(router)
    return dp
