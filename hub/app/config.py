"""Env-driven settings. Real values live in /opt/suslicke/.env on the box
(chmod 600, never committed); defaults below only make local imports/tests work."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    bot_token: str = ""
    admin_chat_id: int | None = None
    database_url: str = "postgresql+asyncpg://suslicke:suslicke@localhost:18432/suslicke"
    site_base_url: str = "https://suslicke.com"


settings = Settings()
