"""초단타(scalp_flash) — 거래대금 상위·24h 상승 필터 + 3h/6h·15m 고가 조건."""

from __future__ import annotations

from typing import Any


def _quote_volume(t: dict[str, Any]) -> float:
    if not isinstance(t, dict):
        return 0.0
    for k in ("quoteVolume", "quote_volume"):
        v = t.get(k)
        if v is not None:
            try:
                return float(v)
            except (TypeError, ValueError):
                pass
    return 0.0


def _ticker_24h_change_pct(t: dict[str, Any]) -> float | None:
    """거래소 티커의 24h 등락률(%). 없으면 open/last 로 추정."""
    if not isinstance(t, dict):
        return None
    pct = t.get("percentage")
    if pct is not None:
        try:
            p = float(pct)
            if abs(p) <= 1.0 and p != 0.0:
                return p * 100.0
            return p
        except (TypeError, ValueError):
            pass
    last = t.get("last")
    o = t.get("open") or t.get("info", {}).get("opening_price")
    try:
        lf = float(last or 0)
        of = float(o or 0)
        if of > 1e-12:
            return (lf / of - 1.0) * 100.0
    except (TypeError, ValueError):
        pass
    return None


def build_scalp_watch_symbols(
    tickers_map: dict[str, dict[str, Any]],
    all_krw: list[str],
    *,
    volume_top_n: int,
    min_24h_rise_pct: float,
) -> list[str]:
    """
    24시간 거래대금(원화) 상위 N개 중, 24h 등락률이 min_24h_rise_pct(%p) 이상인 심볼.
    """
    n = max(5, min(int(volume_top_n), 50))
    rows: list[tuple[str, float, float | None]] = []
    for sym in all_krw:
        t = tickers_map.get(sym)
        if not t:
            continue
        qv = _quote_volume(t)
        chg = _ticker_24h_change_pct(t)
        rows.append((sym, qv, chg))
    rows.sort(key=lambda x: -x[1])
    top = rows[:n]
    out: list[str] = []
    min_r = float(min_24h_rise_pct)
    for sym, _qv, chg in top:
        if chg is None:
            continue
        if chg + 1e-9 >= min_r:
            out.append(sym)
    return out


def scalp_buy_conditions_ok(
    *,
    h3: float,
    h6: float,
    h15: float,
    last: float,
    high_3h_vs_6h_min_spread_pct: float,
    min_drop_from_15m_high_pct: float,
) -> bool:
    """
    - 3시간 고가 >= 6시간 고가 × (1 + spread/100)
    - 15분 고가 대비 min_drop 이상 하락: last <= h15 × (1 - drop/100)
    """
    if h3 <= 1e-12 or h6 <= 1e-12 or h15 <= 1e-12 or last <= 1e-12:
        return False
    sp = float(high_3h_vs_6h_min_spread_pct) / 100.0
    dr = float(min_drop_from_15m_high_pct) / 100.0
    if h3 + 1e-12 < h6 * (1.0 + sp):
        return False
    if last + 1e-12 > h15 * (1.0 - dr):
        return False
    return True
