from datetime import datetime, timezone

from sqlalchemy import JSON, BigInteger, Boolean, DateTime, String, Text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from .config import settings

engine = create_async_engine(settings.database_url, pool_pre_ping=True)
session_factory = async_sessionmaker(engine, expire_on_commit=False)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class QrConfig(Base):
    """Single-row config (id=1) for the /qr redirect + event mode."""

    __tablename__ = "qr_config"

    id: Mapped[int] = mapped_column(primary_key=True)
    target: Mapped[str] = mapped_column(String(200), default="/")
    utm_source: Mapped[str] = mapped_column(String(60), default="shirt")
    utm_medium: Mapped[str] = mapped_column(String(60), default="offline")
    utm_campaign: Mapped[str] = mapped_column(String(60), default="networking")
    event_active: Mapped[bool] = mapped_column(Boolean, default=False)
    event_name: Mapped[str] = mapped_column(String(120), default="")
    event_slug: Mapped[str] = mapped_column(String(60), default="")
    event_default_persona: Mapped[str] = mapped_column(String(10), default="")
    event_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
    updated_by: Mapped[str] = mapped_column(String(40), default="")


class QrScan(Base):
    __tablename__ = "qr_scans"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    campaign: Mapped[str] = mapped_column(String(60), default="")
    event_slug: Mapped[str] = mapped_column(String(60), default="")
    ua_hash: Mapped[str] = mapped_column(String(16), default="")


class SurveyAnswer(Base):
    __tablename__ = "survey_answers"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    event_slug: Mapped[str] = mapped_column(String(60), default="")
    answer: Mapped[str] = mapped_column(String(30))
    free_text: Mapped[str] = mapped_column(Text, default="")
    persona: Mapped[str] = mapped_column(String(10), default="")
    utm: Mapped[dict] = mapped_column(JSON, default=dict)


class PageView(Base):
    __tablename__ = "page_views"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    path: Mapped[str] = mapped_column(String(200))
    locale: Mapped[str] = mapped_column(String(5), default="")
    persona: Mapped[str] = mapped_column(String(10), default="")
    referrer_host: Mapped[str] = mapped_column(String(120), default="")
    utm_source: Mapped[str] = mapped_column(String(60), default="")
    visitor_hash: Mapped[str] = mapped_column(String(64), default="", index=True)
    is_bot: Mapped[bool] = mapped_column(Boolean, default=False)


class SiteSetting(Base):
    __tablename__ = "site_settings"

    key: Mapped[str] = mapped_column(String(60), primary_key=True)
    value: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


async def init_db() -> None:
    # ponytail: create_all instead of alembic — single-owner schema, add
    # migrations when the first breaking column change actually happens.
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with session_factory() as s:
        if await s.get(QrConfig, 1) is None:
            s.add(QrConfig(id=1))
            await s.commit()


async def get_session() -> AsyncSession:
    async with session_factory() as s:
        yield s
