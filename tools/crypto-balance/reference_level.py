"""감시 기준가: 기간 고가 또는 구간 미들포인트 — 봇·대시보드 공통."""

from __future__ import annotations

from typing import Any

from reference_high import normalize_drop_reference_high, reference_high_for_drop
from reference_midpoint import normalize_midpoint_window, reference_midpoint_for_window


def reference_price_kind(scen: dict[str, Any]) -> str:
    k = str(scen.get("reference_price_kind") or "high").strip().lower()
    return "midpoint" if k == "midpoint" else "high"


def ref_memo_key(scen: dict[str, Any], symbol: str) -> tuple[Any, ...]:
    if reference_price_kind(scen) == "midpoint":
        mw = normalize_midpoint_window(scen.get("midpoint_window"))
        return ("midpoint", symbol, mw)
    ref_lbl = normalize_drop_reference_high(scen.get("drop_reference_high"))
    return ("high", symbol, ref_lbl)


def reference_level_for_drop(
    exchange: Any,
    symbol: str,
    ticker: dict[str, Any],
    scen: dict[str, Any],
) -> tuple[float, str]:
    if reference_price_kind(scen) == "midpoint":
        mw = normalize_midpoint_window(scen.get("midpoint_window"))
        v = reference_midpoint_for_window(exchange, symbol, mw, ticker)
        return v, f"미들:{mw}"
    ref_lbl = normalize_drop_reference_high(scen.get("drop_reference_high"))
    v = reference_high_for_drop(exchange, symbol, ref_lbl, ticker)
    return v, ref_lbl


def cache_ref_high(
    exchange: Any,
    symbol: str,
    ticker: dict[str, Any],
    scen: dict[str, Any],
    ref_high_memo: dict[tuple[Any, ...], float],
) -> float:
    key = ref_memo_key(scen, symbol)
    if key not in ref_high_memo:
        v, _ = reference_level_for_drop(exchange, symbol, ticker, scen)
        ref_high_memo[key] = v
    return ref_high_memo[key]


def drop_ref_label_for_scenario(scen: dict[str, Any]) -> str:
    """로그·체결 사유용 짧은 라벨."""
    if reference_price_kind(scen) == "midpoint":
        mw = normalize_midpoint_window(scen.get("midpoint_window"))
        return f"미들:{mw}"
    return normalize_drop_reference_high(scen.get("drop_reference_high"))
