"""체결 이력 FIFO 귀속 (대시보드 보유 표시·익절/손절 재확인 시나리오 매칭 공통)."""

from __future__ import annotations

from typing import Any


def fifo_remaining_lots_for_symbol(trades: list[dict[str, Any]], sym: str) -> list[dict[str, Any]]:
    """해당 심볼(BTC/KRW 등)에 대해 매도를 FIFO로 차감한 뒤 남은 매수 lot."""
    want = sym.strip().upper()
    lst = [t for t in trades if str(t.get("symbol") or "").strip().upper() == want]
    lst.sort(key=lambda x: str(x.get("ts") or ""))
    lots: list[dict[str, Any]] = []
    for t in lst:
        side = str(t.get("side", "")).lower()
        if side == "buy":
            try:
                amt = float(t.get("amount_base") or 0)
            except (TypeError, ValueError):
                amt = 0.0
            if amt <= 1e-12:
                continue
            sid = str(t.get("scenario_id") or "").strip()
            sname = str(t.get("scenario_name") or "").strip()
            lots.append({"scenario_id": sid, "scenario_name": sname, "qty": amt})
        elif side == "sell":
            try:
                sell_amt = float(t.get("amount_base") or 0)
            except (TypeError, ValueError):
                sell_amt = 0.0
            while sell_amt > 1e-12 and lots:
                first = lots[0]
                q = float(first["qty"])
                take = min(q, sell_amt)
                first["qty"] = q - take
                sell_amt -= take
                if first["qty"] <= 1e-12:
                    lots.pop(0)
    return lots


def merge_lots_by_scenario(lots: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """같은 시나리오로 남은 수량을 합산."""
    acc: dict[str, dict[str, Any]] = {}
    for lot in lots:
        sid = str(lot.get("scenario_id") or "").strip()
        key = sid if sid else "__none__"
        if key not in acc:
            acc[key] = {
                "scenario_id": sid,
                "scenario_name": str(lot.get("scenario_name") or "").strip(),
                "qty": 0.0,
            }
        acc[key]["qty"] += float(lot.get("qty") or 0)
    return list(acc.values())


def resolve_scenario_id_for_krw_holding(
    trades: list[dict[str, Any]],
    symbol: str,
    total_qty: float,
    fallback_scenario_id: str | None,
) -> str | None:
    """
    대시보드 _enrich_holdings_targets 와 동일: FIFO 잔여 중 시나리오 id가 있는 lot 중 수량 최대,
    전량이 체결 기록 밖(외부 매수 등)이면 대시보드 기본 트레이더 id.
    """
    merged = merge_lots_by_scenario(fifo_remaining_lots_for_symbol(trades, symbol))
    sum_l = sum(float(x.get("qty") or 0) for x in merged)
    ranked = sorted(
        [x for x in merged if str(x.get("scenario_id") or "").strip()],
        key=lambda x: float(x.get("qty") or 0),
        reverse=True,
    )
    if ranked:
        return str(ranked[0]["scenario_id"]).strip()
    fb = str(fallback_scenario_id or "").strip()
    if total_qty > sum_l + 1e-8 and fb:
        return fb
    return None
