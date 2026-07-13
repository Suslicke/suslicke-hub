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


# --- event media -------------------------------------------------------------

MEDIA_EXTS = ("jpg", "jpeg", "png", "webp")
_MEDIA_NAME_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_-]{0,190}\.(jpg|jpeg|png|webp)$")


def safe_media_filename(name: str) -> str | None:
    """Validate a stored media filename for public serving.

    Rejects path separators, dotfiles, double extensions and anything outside
    the image whitelist — traversal-proof by construction (single dot allowed,
    only before the extension).
    """
    if not name or "/" in name or "\\" in name or name.count(".") != 1:
        return None
    if _MEDIA_NAME_RE.fullmatch(name) is None:
        return None
    return name


def media_ext(original_name: str) -> str | None:
    """Whitelisted lowercase extension of an uploaded filename, else None."""
    if "." not in original_name:
        return None
    ext = original_name.rsplit(".", 1)[1].lower()
    return ext if ext in MEDIA_EXTS else None


def sniff_image_kind(data: bytes) -> str | None:
    """Image family by magic bytes: 'jpeg' | 'png' | 'webp' | None.

    Extension checks alone let an admin store arbitrary bytes as ".jpg";
    the upload handler requires the content to actually be the image type
    the extension claims.
    """
    if data.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


# extension -> magic family accepted for it
EXT_KIND = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png", "webp": "webp"}


def parse_event_links(labels: list[str], urls: list[str], max_links: int = 5) -> list[dict]:
    """Zip label/url form inputs into the event_links JSON shape.

    Drops incomplete pairs and non-http(s)/non-relative URLs; caps at max_links.
    """
    out: list[dict] = []
    for label, url in zip(labels, urls):
        label = (label or "").strip()[:60]
        url = (url or "").strip()[:300]
        if not label or not url:
            continue
        # NB: reject protocol-relative "//host" BEFORE the "/" whitelist match.
        if url.startswith("//") or not url.startswith(("https://", "http://", "/")):
            continue
        out.append({"label": label, "url": url})
        if len(out) >= max_links:
            break
    return out
