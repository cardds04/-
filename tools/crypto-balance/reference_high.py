"""매수 기준 '고가' — 24h 티커 또는 최근 N시간(1h 캔들) 최고가."""

from __future__ import annotations

from typing import Any

DROP_REFERENCE_HIGH_CHOICES = frozenset({"24h", "15m", "30m", "1h", "2h", "3h", "4h", "6h", "12h"})
DROP_REF_TO_HOURS = {"1h": 1, "2h": 2, "3h": 3, "4h": 4, "6h": 6, "12h": 12}
DROP_REF_SUBHOUR_TIMEFRAME = frozenset({"15m", "30m"})


def normalize_drop_reference_high(raw: Any) -> str:
    s = str(raw or "24h").strip().lower()
    if s in DROP_REFERENCE_HIGH_CHOICES:
        return s
    return "24h"


def reference_high_for_drop(
    exchange: Any,
    symbol: str,
    ref: str,
    ticker: dict[str, Any],
) -> float:
    """
    ref 가 24h 이면 티커 24h 고가(업비트/CCXT).
    15m·30m 는 해당 분봉 OHLCV 최근 캔들 고가.
    그 외(1h~12h)는 60분봉 OHLCV 마지막 N개 고가 중 최대.
    """
    ref = normalize_drop_reference_high(ref)
    last = float(ticker.get("last") or 0)
    if ref == "24h":
        h = float(ticker.get("high") or last)
        return max(h, last)
    if ref in DROP_REF_SUBHOUR_TIMEFRAME:
        tf = "15m" if ref == "15m" else "30m"
        try:
            ohlcv = exchange.fetch_ohlcv(symbol, tf, limit=24)
        except Exception:
            h = float(ticker.get("high") or last)
            return max(h, last)
        if not ohlcv:
            h = float(ticker.get("high") or last)
            return max(h, last)
        chunk = ohlcv[-2:] if len(ohlcv) >= 2 else ohlcv
        highs = [float(c[2]) for c in chunk]
        mx = max(highs) if highs else last
        return max(mx, last)
    n = DROP_REF_TO_HOURS.get(ref)
    if not n or n < 1:
        h = float(ticker.get("high") or last)
        return max(h, last)
    try:
        ohlcv = exchange.fetch_ohlcv(symbol, "1h", limit=min(n + 2, 200))
    except Exception:
        h = float(ticker.get("high") or last)
        return max(h, last)
    if not ohlcv:
        h = float(ticker.get("high") or last)
        return max(h, last)
    chunk = ohlcv[-n:] if len(ohlcv) >= n else ohlcv
    highs = [float(c[2]) for c in chunk]
    mx = max(highs) if highs else last
    return max(mx, last)
