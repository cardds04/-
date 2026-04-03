"""감시 기준 미들포인트 — 구간 고가·저가의 산술평균 (고+저)/2."""

from __future__ import annotations

from typing import Any

MIDPOINT_WINDOW_CHOICES = frozenset({"15m", "1h", "6h", "24h"})


def normalize_midpoint_window(raw: Any) -> str:
    s = str(raw or "1h").strip().lower()
    if s in MIDPOINT_WINDOW_CHOICES:
        return s
    return "1h"


def _mid_fallback_from_ticker(ticker: dict[str, Any], last: float) -> float:
    """
    OHLCV 실패·캔들 부족 시 티커 고·저로 대략 미들.
    last만 쓰면 mgl==last가 되어 미들상승(+gate) 조건이 사실상 영원히 불가능해질 수 있음.
    """
    h = float(ticker.get("high") or last)
    lo = float(ticker.get("low") or last)
    if h <= 1e-12 and lo <= 1e-12:
        return last
    return (h + lo) / 2.0


def reference_midpoint_for_window(
    exchange: Any,
    symbol: str,
    window: str,
    ticker: dict[str, Any],
) -> float:
    """
    최근 구간의 고가·저가 합을 2로 나눈 값.
    - 24h: 티커 24h high/low (없으면 last)
    - 6h: 5분봉 최근 72개(약 6시간) 구간 고가 최대·저가 최소
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
    if window == "6h":
        # 1분봉 360개는 거래소 OHLCV 상한(예: 200)을 넘기 쉬움 → 5분봉 72개 = 6시간
        n_candles = 72
        tf = "5m"
        fetch_limit = max(n_candles + 8, 24)
    else:
        n_candles = {"15m": 15, "1h": 60}.get(window, 60)
        tf = "1m"
        fetch_limit = max(n_candles + 5, 24)
    try:
        ohlcv = exchange.fetch_ohlcv(symbol, tf, limit=fetch_limit)
    except Exception:
        return _mid_fallback_from_ticker(ticker, last)
    if not ohlcv or len(ohlcv) < 2:
        return _mid_fallback_from_ticker(ticker, last)
    chunk = ohlcv[-n_candles:] if len(ohlcv) >= n_candles else ohlcv
    highs = [float(c[2]) for c in chunk]
    lows = [float(c[3]) for c in chunk]
    if not highs or not lows:
        return last
    mx = max(highs)
    mn = min(lows)
    return (mx + mn) / 2.0
