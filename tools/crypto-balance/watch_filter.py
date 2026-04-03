"""KRW 마켓 심볼 목록을 감시 스타일(watch_pool_style)에 따라 정렬·필터."""

from __future__ import annotations

from typing import Any

WATCH_POOL_STYLES = frozenset(
    {
        "all",
        "high_volume_krw",
        "low_volatility",
        "high_volatility",
        "low_price",
        "low_volume_niche",
    }
)


def _quote_krw_ohlcv_row(row: list[Any]) -> float:
    try:
        close = float(row[4])
        vol = float(row[5])
        return max(0.0, vol * close)
    except (IndexError, TypeError, ValueError):
        return 0.0


def _volume_surge_ratio_for_symbol(exchange: Any, symbol: str) -> tuple[str, float] | None:
    try:
        ohlcv = exchange.fetch_ohlcv(symbol, "15m", limit=12)
    except Exception:
        return None
    if not ohlcv or len(ohlcv) < 6:
        return None
    completed = ohlcv[:-1]
    if len(completed) < 5:
        return None
    prev4 = completed[-5:-1]
    v1h = sum(_quote_krw_ohlcv_row(r) for r in prev4)
    v15 = _quote_krw_ohlcv_row(completed[-1])
    if v1h <= 1e-9:
        return None
    exp = v1h / 4.0
    if exp <= 1e-9:
        return None
    return (symbol, v15 / exp)


def filter_krw_symbols_by_volume_surge(
    symbols: list[str],
    exchange: Any,
    min_ratio: float,
    *,
    max_workers: int = 1,
) -> list[str]:
    """거래량 급등비 필터. API 한도를 위해 순차 조회(max_workers 는 호환용)."""
    del max_workers
    if not symbols or exchange is None or min_ratio <= 0:
        return list(symbols)
    scored: list[tuple[str, float]] = []
    for sym in symbols:
        try:
            r = _volume_surge_ratio_for_symbol(exchange, sym)
        except Exception:
            continue
        if r is None:
            continue
        sym_r, ratio = r
        if ratio >= min_ratio:
            scored.append((sym_r, ratio))
    scored.sort(key=lambda x: -x[1])
    return [x[0] for x in scored]


def _f(v: Any) -> float:
    try:
        if v is None:
            return 0.0
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def filter_krw_symbols_by_style(
    symbols: list[str],
    tickers: dict[str, dict[str, Any]],
    style: str,
    *,
    low_price_max_krw: float = 5000.0,
) -> list[str]:
    """
    symbols: 후보 심볼 (보통 아직 다른 트레이더에 배정되지 않은 KRW 마켓).
    tickers: ccxt fetch_tickers() 결과 (심볼 키).
    반환: 스타일에 맞게 정렬된 심볼 목록(호출 측에서 셔플 후 슬라이스).
    """
    style = (style or "all").strip().lower()
    if style == "all" or not style:
        return list(symbols)
    if style not in WATCH_POOL_STYLES:
        return list(symbols)

    scored: list[tuple[str, float]] = []
    for sym in symbols:
        t = tickers.get(sym)
        if not isinstance(t, dict):
            continue
        last = _f(t.get("last"))
        high = _f(t.get("high"))
        low = _f(t.get("low"))
        qv = _f(t.get("quoteVolume"))
        if last <= 0:
            continue

        if style == "high_volume_krw":
            scored.append((sym, qv))
        elif style == "low_volatility":
            rng = (high - low) / last
            scored.append((sym, rng))
        elif style == "high_volatility":
            rng = (high - low) / last
            scored.append((sym, rng))
        elif style == "low_price":
            scored.append((sym, last))
        elif style == "low_volume_niche":
            scored.append((sym, qv))

    if not scored:
        return list(symbols)

    if style == "high_volume_krw":
        scored.sort(key=lambda x: -x[1])
    elif style == "low_volatility":
        scored.sort(key=lambda x: x[1])
    elif style == "high_volatility":
        scored.sort(key=lambda x: -x[1])
    elif style == "low_price":
        scored.sort(key=lambda x: x[1])
        cheap = [x for x in scored if x[1] <= low_price_max_krw and x[1] > 0]
        if len(cheap) >= 10:
            return [x[0] for x in cheap]
        n = max(10, min(len(scored), len(scored) // 3 + 1))
        return [x[0] for x in scored[:n]]
    elif style == "low_volume_niche":
        scored.sort(key=lambda x: x[1])

    return [x[0] for x in scored]
