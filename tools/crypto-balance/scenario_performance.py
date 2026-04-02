"""시나리오별 체결 이력 + status.json 스냅샷 기반 손익 요약."""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

from scenarios import load_scenarios_list, migrate_if_needed
from trade_log import read_trades

BASE_DIR = Path(__file__).resolve().parent
STATUS_PATH = BASE_DIR / "status.json"

# 공개 시세 캐시 (폴백용, 과도한 호출 방지)
_KRW_LAST_TS = 0.0
_KRW_LAST_BY_SYM: dict[str, float] = {}
_KRW_LAST_TTL_SEC = 5.0


def invalidate_krw_price_cache() -> None:
    """다음 조회 시 시세를 다시 가져옵니다(대시보드 수동 새로고침용)."""
    global _KRW_LAST_TS, _KRW_LAST_BY_SYM
    _KRW_LAST_TS = 0.0
    _KRW_LAST_BY_SYM.clear()


def _cumulative_pnl_metrics(
    *,
    unreal_krw: float | None,
    unreal_pct: float | None,
    realized_sum: float,
    allocated_krw: Any,
) -> tuple[float, float | None]:
    """미실현 + 실현 누적 손익, 수익률(부여 자산 기준 우선, 없으면 미실현% 폴백)."""
    u = float(unreal_krw) if unreal_krw is not None else 0.0
    cum_pnl = u + float(realized_sum)
    cum_pct: float | None = None
    if allocated_krw is not None and str(allocated_krw).strip() != "":
        try:
            a = float(allocated_krw)
            if a > 0:
                cum_pct = cum_pnl / a * 100.0
        except (TypeError, ValueError):
            pass
    if cum_pct is None and unreal_pct is not None:
        cum_pct = float(unreal_pct)
    return cum_pnl, cum_pct


def _fifo_remaining_qty_cost_by_symbol(
    scenario_id: str, trades: list[dict[str, Any]]
) -> dict[str, tuple[float, float]]:
    """시나리오별 심볼마다 FIFO 매도 반영 후 (남은 수량, 남은 매수금액 원화)."""
    rel = [t for t in trades if str(t.get("scenario_id") or "") == scenario_id]
    rel.sort(key=lambda x: str(x.get("ts") or ""))
    lots: dict[str, list[dict[str, float]]] = {}
    for t in rel:
        sym = str(t.get("symbol") or "").strip().upper()
        if not sym:
            continue
        side = str(t.get("side", "")).lower()
        if side == "buy":
            amt = float(t.get("amount_base") or 0)
            cost = float(t.get("cost_krw") or 0)
            if amt <= 1e-12:
                continue
            lots.setdefault(sym, []).append({"qty": amt, "cost_krw": cost})
        elif side == "sell":
            sell_amt = float(t.get("amount_base") or 0)
            if sell_amt <= 1e-12:
                continue
            sl = lots.setdefault(sym, [])
            while sell_amt > 1e-12 and sl:
                first = sl[0]
                q = float(first["qty"])
                if q <= 1e-12:
                    sl.pop(0)
                    continue
                take = min(q, sell_amt)
                cost_take = float(first["cost_krw"]) * (take / q) if q > 1e-12 else 0.0
                first["qty"] = q - take
                first["cost_krw"] = float(first["cost_krw"]) - cost_take
                sell_amt -= take
                if first["qty"] <= 1e-12:
                    sl.pop(0)
    out: dict[str, tuple[float, float]] = {}
    for sym, chunk in lots.items():
        q = sum(float(x["qty"]) for x in chunk)
        c = sum(float(x["cost_krw"]) for x in chunk)
        if q > 1e-12 and c > 1e-9:
            out[sym] = (q, c)
    return out


def _fetch_krw_last_prices(symbols: list[str]) -> dict[str, float]:
    """심볼별 현재가(KRW). 공개 CCXT."""
    if not symbols:
        return {}
    global _KRW_LAST_TS, _KRW_LAST_BY_SYM
    now = time.monotonic()
    uniq = sorted(set(symbols))
    if _KRW_LAST_BY_SYM and (now - _KRW_LAST_TS) < _KRW_LAST_TTL_SEC:
        return {s: _KRW_LAST_BY_SYM[s] for s in uniq if s in _KRW_LAST_BY_SYM}
    try:
        import ccxt

        ex = ccxt.upbit({"enableRateLimit": True, "timeout": 45000})
        ex.load_markets()
        tickers = ex.fetch_tickers(uniq)
        m: dict[str, float] = {}
        for sym in uniq:
            t = tickers.get(sym)
            if isinstance(t, dict) and t.get("last") is not None:
                m[sym] = float(t["last"])
        _KRW_LAST_BY_SYM = m
        _KRW_LAST_TS = now
        return {s: m[s] for s in uniq if s in m}
    except Exception:
        return {s: _KRW_LAST_BY_SYM[s] for s in uniq if s in _KRW_LAST_BY_SYM}


def _unrealized_from_trades_estimate(
    scenario_id: str, trades: list[dict[str, Any]]
) -> dict[str, Any] | None:
    """
    봇 스냅샷이 없거나 불완전할 때: 체결 이력 FIFO + 현재가로 미실현·수익률 추정.
    """
    pos = _fifo_remaining_qty_cost_by_symbol(scenario_id, trades)
    if not pos:
        return None
    syms = list(pos.keys())
    lasts = _fetch_krw_last_prices(syms)
    if not lasts:
        return None
    mv = 0.0
    cb = 0.0
    for sym, (qty, cost) in pos.items():
        lp = lasts.get(sym)
        if lp is None or lp <= 0:
            continue
        mv += qty * lp
        cb += cost
    if cb <= 1e-9:
        return None
    unreal = mv - cb
    return {
        "mark_value_krw": mv,
        "cost_basis_krw": cb,
        "unrealized_pnl_krw": unreal,
        "unrealized_pnl_pct": (unreal / cb * 100.0) if cb > 1e-9 else None,
    }


def _load_status() -> dict[str, Any] | None:
    if not STATUS_PATH.is_file():
        return None
    try:
        data = json.loads(STATUS_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else None
    except (json.JSONDecodeError, OSError):
        return None


def _pick_last_buy(buys: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not buys:
        return None
    return max(buys, key=lambda t: str(t.get("ts") or ""))


def _pick_last_sell(sells: list[dict[str, Any]]) -> dict[str, Any] | None:
    if not sells:
        return None
    return max(sells, key=lambda t: str(t.get("ts") or ""))


def build_scenario_performance_list() -> list[dict[str, Any]]:
    """대시보드용: 시나리오마다 매수/매도 요약·미실현·실현 손익."""
    migrate_if_needed()
    scenarios = load_scenarios_list()
    trades = read_trades()
    status = _load_status()
    by_snap: dict[str, list[dict[str, Any]]] = {}
    if status and status.get("mode") == "multi" and isinstance(status.get("scenarios"), list):
        for s in status["scenarios"]:
            sid = s.get("scenario_id")
            if sid is not None:
                k = str(sid)
                by_snap.setdefault(k, []).append(s)

    out: list[dict[str, Any]] = []
    for scen in scenarios:
        sid = str(scen.get("id") or "")
        sts = by_snap.get(sid) or []
        st = sts[0] if sts else None
        rel = [t for t in trades if str(t.get("scenario_id") or "") == sid]
        buys = [t for t in rel if str(t.get("side", "")).lower() == "buy"]
        sells = [t for t in rel if str(t.get("side", "")).lower() == "sell"]
        last_buy = _pick_last_buy(buys)
        last_sell = _pick_last_sell(sells)
        realized_sum = 0.0
        for t in sells:
            p = t.get("realized_pnl_krw")
            if p is not None:
                realized_sum += float(p)

        last_price = st.get("last") if st else None
        entry_price = st.get("entry_price") if st else None
        base_free = float(st.get("base_free") or 0) if st else 0.0
        signal = st.get("signal") if st else None

        mark_value: float | None = None
        cost_basis: float | None = None
        unreal_krw: float | None = None
        unreal_pct: float | None = None
        if len(sts) > 1:
            mv_sum = 0.0
            cb_sum = 0.0
            for t in sts:
                lp = t.get("last")
                ep = t.get("entry_price")
                bf = float(t.get("base_free") or 0)
                if lp is not None and ep is not None and bf > 1e-12:
                    mv_sum += float(lp) * bf
                    cb_sum += float(ep) * bf
            if cb_sum > 1e-9:
                mark_value = mv_sum
                cost_basis = cb_sum
                unreal_krw = mv_sum - cb_sum
                unreal_pct = (unreal_krw / cost_basis * 100.0) if cost_basis > 1e-9 else None
                last_price = None
                entry_price = None
                base_free = 0.0
        elif (
            st is not None
            and last_price is not None
            and entry_price is not None
            and base_free > 1e-12
        ):
            lp = float(last_price)
            ep = float(entry_price)
            mark_value = lp * base_free
            cost_basis = ep * base_free
            unreal_krw = mark_value - cost_basis
            unreal_pct = (unreal_krw / cost_basis * 100.0) if cost_basis > 1e-9 else None

        unreal_source: str | None = None
        if unreal_krw is not None and unreal_pct is not None:
            unreal_source = "snapshot"
        if unreal_krw is None or unreal_pct is None:
            est = _unrealized_from_trades_estimate(sid, trades)
            if est is not None:
                unreal_krw = est["unrealized_pnl_krw"]
                unreal_pct = est["unrealized_pnl_pct"]
                mark_value = est["mark_value_krw"]
                cost_basis = est["cost_basis_krw"]
                unreal_source = "trades_estimate"

        def _buy_public(b: dict[str, Any] | None) -> dict[str, Any] | None:
            if not b:
                return None
            return {
                "ts": b.get("ts"),
                "price": b.get("price"),
                "cost_krw": b.get("cost_krw"),
                "amount_base": b.get("amount_base"),
                "symbol": b.get("symbol"),
            }

        def _sell_public(s: dict[str, Any] | None) -> dict[str, Any] | None:
            if not s:
                return None
            return {
                "ts": s.get("ts"),
                "price": s.get("price"),
                "proceeds_krw": s.get("proceeds_krw"),
                "amount_base": s.get("amount_base"),
                "realized_pnl_krw": s.get("realized_pnl_krw"),
            }

        cum_pnl, cum_pct = _cumulative_pnl_metrics(
            unreal_krw=unreal_krw,
            unreal_pct=unreal_pct,
            realized_sum=realized_sum,
            allocated_krw=scen.get("allocated_krw"),
        )

        out.append(
            {
                "id": sid,
                "name": scen.get("name"),
                "symbol": scen.get("trading_symbol"),
                "watch_symbols": scen.get("watch_symbols") or [],
                "watch_random": bool(scen.get("watch_random", False)),
                "watch_random_count": scen.get("watch_random_count") or 12,
                "watch_pool_style": scen.get("watch_pool_style") or "all",
                "enabled": bool(scen.get("enabled", True)),
                "trading_enabled": bool(scen.get("trading_enabled", True)),
                "status_online": len(sts) > 0,
                "signal": signal,
                "last_price": last_price,
                "entry_price": entry_price,
                "base_free": base_free,
                "last_buy": _buy_public(last_buy),
                "last_sell": _sell_public(last_sell),
                "mark_value_krw": mark_value,
                "cost_basis_krw": cost_basis,
                "unrealized_pnl_krw": unreal_krw,
                "unrealized_pnl_pct": unreal_pct,
                "unrealized_source": unreal_source,
                "realized_pnl_sum_krw": realized_sum,
                "cumulative_pnl_krw": cum_pnl,
                "cumulative_pnl_pct": cum_pct,
            }
        )
    return out
