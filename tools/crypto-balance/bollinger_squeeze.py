"""볼린저 밴드 스퀴즈(trading_style=bollinger_squeeze) — 후보 선별."""

from __future__ import annotations

from typing import Any


def _bb_from_closes(closes: list[float], period: int, std_mult: float) -> tuple[float, float, float] | None:
    if len(closes) < period:
        return None
    slice_ = closes[-period:]
    n = len(slice_)
    mid = sum(slice_) / n
    if mid <= 1e-18:
        return None
    var = sum((x - mid) ** 2 for x in slice_) / n
    std = var**0.5
    upper = mid + std_mult * std
    lower = mid - std_mult * std
    return mid, upper, lower


def _width_pct(mid: float, upper: float, lower: float) -> float:
    if mid <= 1e-18:
        return 999.0
    return (upper - lower) / mid * 100.0


def pass_bollinger_squeeze_one(
    exchange: Any,
    symbol: str,
    cfg: dict[str, Any],
    *,
    tickers_cache: dict[str, dict[str, Any]] | None = None,
) -> dict[str, Any] | None:
    _ = tickers_cache
    tf = str(cfg.get("timeframe") or "1h").strip().lower()
    period = int(cfg.get("bb_period") or 20)
    std_m = float(cfg.get("bb_std_mult") or 2.0)
    smax = float(cfg.get("squeeze_max_width_pct") or 4.0)
    breakout_only = bool(cfg.get("breakout_only", True))
    need = period + 5
    try:
        ohlcv = exchange.fetch_ohlcv(symbol, tf, limit=max(need, 80))
    except Exception:
        return None
    if not ohlcv or len(ohlcv) < period + 1:
        return None
    closes = [float(c[4]) for c in ohlcv]
    last_close = closes[-1]
    bb = _bb_from_closes(closes, period, std_m)
    if bb is None:
        return None
    mid, upper, lower = bb
    w_pct = _width_pct(mid, upper, lower)
    if w_pct > smax + 1e-9:
        return None
    if breakout_only and last_close <= upper + 1e-12:
        return None
    return {
        "symbol": symbol,
        "width_pct": round(w_pct, 4),
        "middle": round(mid, 8),
        "upper": round(upper, 8),
        "lower": round(lower, 8),
        "last_close": round(last_close, 8),
    }


def list_bollinger_squeeze_candidates(
    exchange: Any,
    all_krw: list[str],
    cfg: dict[str, Any],
    *,
    tickers_map: dict[str, dict[str, Any]] | None = None,
    limit: int = 30,
) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for sym in all_krw:
        row = pass_bollinger_squeeze_one(exchange, sym, cfg, tickers_cache=tickers_map)
        if row:
            out.append(row)
    out.sort(key=lambda r: float(r.get("width_pct") or 999))
    return out[:limit]
