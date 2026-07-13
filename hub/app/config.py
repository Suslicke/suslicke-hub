"""Env-driven settings. Real values live in /opt/suslicke/.env on the box
(chmod 600, never committed); defaults below only make local imports/tests work."""

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    bot_token: str = ""
    admin_chat_id: int | None = None
    database_url: str = "postgresql+asyncpg://suslicke:suslicke@localhost:18432/suslicke"
    site_base_url: str = "https://suslicke.com"
    hub_admin_password: str = ""
    media_dir: str = "/srv/data/media"  # compose mounts hubdata:/srv/data

    @field_validator("admin_chat_id", mode="before")
    @classmethod
    def _empty_env_is_none(cls, v: object) -> object:
        return None if v == "" else v


settings = Settings()
