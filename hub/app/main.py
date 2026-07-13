import asyncio
import contextlib
import logging
from contextlib import asynccontextmanager

from aiogram import Bot
from fastapi import FastAPI

from . import bot as botmod
from .config import settings
from .db import init_db
from .admin import router as admin_router
from .qr import router

logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    polling_task = None
    if settings.bot_token:
        botmod.bot = Bot(settings.bot_token)
        dp = botmod.create_dispatcher()
        polling_task = asyncio.create_task(dp.start_polling(botmod.bot, handle_signals=False))
        log.info("bot polling started")
    else:
        log.warning("BOT_TOKEN empty — bot disabled")
    yield
    if polling_task:
        polling_task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await polling_task
    if botmod.bot:
        await botmod.bot.session.close()


app = FastAPI(title="suslicke-hub", lifespan=lifespan, docs_url=None, redoc_url=None)
app.include_router(router)
app.include_router(admin_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
