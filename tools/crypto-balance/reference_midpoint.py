"""감시 기준 미들포인트 — 구간 고가·저가의 산술평균 (고+저)/2."""

from __future__ import annotations

from typing import Any

MIDPOINT_WINDOW_CHOICES = frozenset({"15m", "1h", "24h"})


def normalize_midpoint_window(raw: Any) -> str:
    s = str(raw or "1h").strip().lower()
    if s in MIDPOINT_WINDOW_CHOICES:
        return s
    return "1h"


def reference_midpoint_for_window(
    exchange: Any,
    symbol: str,
    window: str,
    ticker: dict[str, Any],
) -> float:
    """
    최근 구간의 고가·저가 합을 2로 나눈 값.
    - 24h: 티커 24h high/low (없으면 last)
    - 1h: 1분봉 최근 60개 캔들의 고가 최대·저가 최소
    - 15m: 1분봉 최근 15개 캔들의 고가 최대·저가 최소
    """
    window = normalize_midpoint_window(window)
    last = float(ticker.get("last") or 0)
    if window == "24h":
        h = float(ticker.get("high") or last)
        lo = float(ticker.get("low") or last)
        if h <= 1e-12 and lo <= 1e-12:
            return last
        return (h + lo) / 2.0
    n_candles = 60 if window == "1h" else 15
    try:
        ohlcv = exchange.fetch_ohlcv(symbol, "1m", limit=max(n_candles + 5, 24))
    except Exception:
        return last
    if not ohlcv or len(ohlcv) < 2:
        return last
    chunk = ohlcv[-n_candles:] if len(ohlcv) >= n_candles else ohlcv
    highs = [float(c[2]) for c in chunk]
    lows = [float(c[3]) for c in chunk]
    if not highs or not lows:
        return last
    mx = max(highs)
    mn = min(lows)
    return (mx + mn) / 2.0
