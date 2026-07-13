"""Pure server-side SVG chart builders — no I/O, no JS, stdlib only.

Colors are CSS custom properties (var(--…)) so the inline SVG follows the
admin page's light/dark palette for free. Covered by the smoke script and
importable without any third-party deps.
"""

from __future__ import annotations

import math
from datetime import date, timedelta


def _esc(s: object) -> str:
    return (
        str(s)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def fill_daily_series(
    counts: dict[date, int], days: int, end: date
) -> list[tuple[date, int]]:
    """Dense day series ending at `end` (inclusive); missing days become 0."""
    return [
        (d, int(counts.get(d, 0)))
        for d in (end - timedelta(days=days - 1 - i) for i in range(days))
    ]


def bar_chart_svg(
    series: list[tuple[str, int]],
    *,
    color: str = "var(--acc)",
    width: int = 616,
    height: int = 150,
    title: str = "",
) -> str:
    """Bar chart: proportional heights, day labels, <title> hover tooltips."""
    n = max(len(series), 1)
    pad, top, label_h = 6, 16, 16
    chart_h = height - top - label_h
    maxv = max((v for _, v in series), default=0) or 1
    slot = (width - pad * 2) / n
    bar_w = max(min(slot * 0.6, 40.0), 3.0)
    base_y = top + chart_h

    out = [
        f'<svg viewBox="0 0 {width} {height}" role="img" aria-label="{_esc(title)}"'
        ' preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;display:block">'
        f'<line x1="{pad}" y1="{base_y}" x2="{width - pad}" y2="{base_y}"'
        ' stroke="var(--bd)" stroke-width="1"/>'
    ]
    for i, (label, v) in enumerate(series):
        h = round(chart_h * v / maxv, 1) if v > 0 else 0.0
        if v > 0:
            h = max(h, 2.0)
        x = round(pad + slot * i + (slot - bar_w) / 2, 1)
        y = round(base_y - h, 1)
        cx = round(pad + slot * i + slot / 2, 1)
        out.append(
            f"<g><title>{_esc(label)}: {v}</title>"
            f'<rect x="{x}" y="{y}" width="{round(bar_w, 1)}" height="{h}"'
            f' rx="3" fill="{color}" opacity="{1 if v else 0.35}"/>'
        )
        if v > 0:
            out.append(
                f'<text x="{cx}" y="{y - 4}" text-anchor="middle" font-size="9"'
                f' fill="var(--mut)">{v}</text>'
            )
        out.append(
            f'<text x="{cx}" y="{height - 4}" text-anchor="middle" font-size="9"'
            f' fill="var(--mut)">{_esc(label)}</text></g>'
        )
    out.append("</svg>")
    return "".join(out)


def donut_svg(
    parts: list[tuple[str, int]],
    colors: list[str],
    *,
    size: int = 132,
    stroke: int = 18,
) -> str:
    """Mini donut; each segment carries a <title> tooltip, total in the middle."""
    total = sum(v for _, v in parts)
    r = (size - stroke) / 2
    circ = 2 * math.pi * r
    half = size / 2
    out = [
        f'<svg viewBox="0 0 {size} {size}" role="img" aria-label="donut"'
        f' style="width:{size}px;height:{size}px;flex:none">'
    ]
    if total <= 0:
        out.append(
            f'<circle cx="{half}" cy="{half}" r="{r}" fill="none"'
            f' stroke="var(--bd)" stroke-width="{stroke}"/>'
        )
    else:
        acc = 0.0
        for i, (label, v) in enumerate(parts):
            if v <= 0:
                continue
            seg = circ * v / total
            color = colors[i % len(colors)] if colors else "var(--acc)"
            out.append(
                f"<g><title>{_esc(label)}: {v}</title>"
                f'<circle cx="{half}" cy="{half}" r="{r}" fill="none"'
                f' stroke="{color}" stroke-width="{stroke}"'
                f' stroke-dasharray="{round(seg, 2)} {round(circ - seg, 2)}"'
                f' stroke-dashoffset="{round(-acc, 2)}"'
                f' transform="rotate(-90 {half} {half})"/></g>'
            )
            acc += seg
    out.append(
        f'<text x="{half}" y="{half + 5}" text-anchor="middle" font-size="18"'
        f' font-weight="700" fill="var(--fg)">{total}</text></svg>'
    )
    return "".join(out)
