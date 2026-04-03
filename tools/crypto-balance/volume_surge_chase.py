"""거래량 급등 추격(trading_style=volume_surge_chase) — 후보 선별."""

from __future__ import annotations

from typing import Any

from watch_filter import _volume_surge_ratio_for_symbol


def _minutes_from_lookback(lb: str) -> int:
    return {"1m": 1, "5m": 5, "10m": 10}.get((lb or "").strip().lower(), 5)


def _pct_rise_since_1m_closes(exchange: Any, symbol: str, minutes: int, last: float) -> float | None:
    """현재가(last) 대비 N분 전(완료 1분봉 기준) 상승률(%)."""
    need = minutes + 4
    try:
        ohlcv = exchange.fetch_ohlcv(symbol, "1m", limit=max(need, 24))
    except Exception:
        return None
    if not ohlcv or len(ohlcv) < minutes + 2:
        return None
    idx = -(minutes + 1)
    if abs(idx) > len(ohlcv):
        return None
    try:
        old_close = float(ohlcv[idx][4])
    except (IndexError, TypeError, ValueError):
        return None
    if old_close <= 1e-12:
        return None
    return (last - old_close) / old_close * 100.0


def _pass_volume_surge_filters(
    exchange: Any,
    symbol: str,
    cfg: dict[str, Any],
    tickers_cache: dict[str, dict[str, Any]],
) -> tuple[str, float, float] | None:
    """급등비·단기 상승률 조건을 모두 통과하면 (symbol, surge_ratio, rise_pct)."""
    min_sr = float(cfg.get("min_surge_ratio") or 1.2)
    minutes = _minutes_from_lookback(str(cfg.get("lookback") or "5m"))
    min_rise = float(cfg.get("min_rise_pct") or 1.0)

    sr_t = _volume_surge_ratio_for_symbol(exchange, symbol)
    if sr_t is None or sr_t[1] < min_sr:
        return None
    surge_ratio = float(sr_t[1])

    last: float | None = None
    t = tickers_cache.get(symbol)
    if isinstance(t, dict):
        try:
            last = float(t.get("last") or 0)
        except (TypeError, ValueError):
            last = None
    if last is None or last <= 0:
        try:
            tk = exchange.fetch_ticker(symbol)
            last = float(tk.get("last") or 0)
        except Exception:
            return None
    if last <= 0:
        return None

    rise = _pct_rise_since_1m_closes(exchange, symbol, minutes, last)
    if rise is None or rise < min_rise:
        return None
    return (symbol, surge_ratio, float(rise))


def list_volume_surge_chase_candidates(
    exchange: Any,
    symbols: list[str],
    cfg: dict[str, Any],
    *,
    tickers_map: dict[str, dict[str, Any]] | None = None,
    max_workers: int = 1,
    limit: int = 25,
) -> list[dict[str, Any]]:
    """
    조건 통과 종목을 급등비(surge_ratio) 내림차순으로 최대 limit 개.
    각 항목: symbol, surge_ratio, rise_pct (단기 상승률 %).

    업비트 요청 한도를 위해 후보 검사는 순차 실행한다(max_workers 는 호환용으로 무시).
    """
    del max_workers
    if not symbols or exchange is None:
        return []
    lim = max(1, min(int(limit), 50))
    tm = tickers_map if isinstance(tickers_map, dict) else {}
    rows: list[dict[str, Any]] = []
    for sym in symbols:
        try:
            r = _pass_volume_surge_filters(exchange, sym, cfg, tm)
        except Exception:
            continue
        if r is None:
            continue
        sym_r, srr, rise_p = r
        rows.append(
            {
                "symbol": sym_r,
                "surge_ratio": round(srr, 4),
                "rise_pct": round(rise_p, 4),
            }
        )
    rows.sort(key=lambda x: -float(x["surge_ratio"]))
    return rows[:lim]


def pick_best_volume_surge_chase_symbol(
    exchange: Any,
    symbols: list[str],
    cfg: dict[str, Any],
    *,
    tickers_map: dict[str, dict[str, Any]] | None = None,
    max_workers: int = 1,
) -> tuple[str | None, float | None]:
    """
    거래량 급등 비율·상승률을 통과한 심볼 중 surge ratio 가장 높은 하나.
    반환: (symbol, surge_ratio) 또는 (None, None).
    """
    lst = list_volume_surge_chase_candidates(
        exchange, symbols, cfg, tickers_map=tickers_map, max_workers=max_workers, limit=1
    )
    if not lst:
        return None, None
    x = lst[0]
    return str(x["symbol"]), float(x["surge_ratio"])
