"""Pure helpers — no I/O, covered by tests/test_helpers.py."""

import hashlib
import re
from datetime import date
from urllib.parse import urlencode

_TRANSLIT = str.maketrans(
    "абвгдеёжзийклмнопрстуфхцчшщъыьэюя",
    "abvgdeejziyklmnoprstufhccss_y_eua",
)


def slugify(name: str) -> str:
    """Event name -> ascii utm_campaign slug. Cyrillic transliterated."""
    s = name.strip().lower().translate(_TRANSLIT)
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s[:60] or "event"


def build_redirect_url(base: str, cfg: dict) -> str:
    """cfg is a plain dict of QrConfig columns — keeps this function pure."""
    params = {
        "utm_source": cfg["utm_source"],
        "utm_medium": cfg["utm_medium"],
        "utm_campaign": cfg["utm_campaign"],
    }
    if cfg["event_active"] and cfg["event_default_persona"]:
        params["as"] = cfg["event_default_persona"]
    target = cfg["target"] if cfg["target"].startswith("/") else "/"
    return f"{base}{target}?{urlencode(params)}"


def visitor_hash(ip: str, ua: str, day: date) -> str:
    """Daily-rotating anonymous visitor id: no cookies, not reversible,
    not stable across days — the privacy property the /privacy page promises."""
    return hashlib.sha256(f"{ip}|{ua}|{day.isoformat()}".encode()).hexdigest()


def ua_hash(ua: str) -> str:
    return hashlib.sha256(ua.encode()).hexdigest()[:16]


_BOT_RE = re.compile(r"bot|crawl|spider|preview|fetch|monitor|curl|wget", re.I)


def looks_like_bot(ua: str) -> bool:
    return bool(_BOT_RE.search(ua))
