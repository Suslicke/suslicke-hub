from datetime import date

from app.helpers import build_redirect_url, looks_like_bot, slugify, visitor_hash


def test_slugify():
    assert slugify("KazDevFest 2026") == "kazdevfest-2026"
    assert slugify("Астана Хаб!") == "astana-hab"
    assert slugify("///") == "event"


def test_build_redirect_url():
    cfg = {
        "target": "/", "utm_source": "shirt", "utm_medium": "offline",
        "utm_campaign": "networking", "event_active": False, "event_default_persona": "",
    }
    url = build_redirect_url("https://suslicke.com", cfg)
    assert url == "https://suslicke.com/?utm_source=shirt&utm_medium=offline&utm_campaign=networking"

    cfg |= {"event_active": True, "event_default_persona": "hi", "target": "https://evil.example"}
    url = build_redirect_url("https://suslicke.com", cfg)
    assert url.startswith("https://suslicke.com/?")  # non-relative target ignored
    assert "as=hi" in url


def test_visitor_hash_rotates_daily():
    a = visitor_hash("1.2.3.4", "ua", date(2026, 7, 13))
    b = visitor_hash("1.2.3.4", "ua", date(2026, 7, 14))
    assert a != b and len(a) == 64


def test_looks_like_bot():
    assert looks_like_bot("Mozilla/5.0 (compatible; Googlebot/2.1)")
    assert not looks_like_bot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)")
