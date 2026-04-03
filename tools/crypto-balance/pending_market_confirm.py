"""즉시 매수(시장가 / 눌림목 지정가). 매수 대기열은 사용하지 않습니다."""

from __future__ import annotations

import time
from typing import Any

try:
    from ccxt.base.errors import (
        ExchangeError,
        ExchangeNotAvailable,
        InsufficientFunds,
        InvalidOrder,
        NetworkError,
        RequestTimeout,
    )
except ImportError:
    ExchangeError = Exception  # type: ignore
    ExchangeNotAvailable = Exception  # type: ignore
    InsufficientFunds = Exception  # type: ignore
    InvalidOrder = Exception  # type: ignore
    NetworkError = Exception  # type: ignore
    RequestTimeout = Exception  # type: ignore

from exchange_helper import UpbitExchange
from scenarios import load_trader_runtime_state, save_trader_runtime_state
from trade_log import append_trade

MIN_PENDING_BUY_KRW = 5000.0


def _execute_buy_item(
    scenario_id: str,
    scen: dict[str, Any],
    item: dict[str, Any],
    *,
    ex_override: UpbitExchange | None = None,
) -> tuple[dict[str, Any], int]:
    try:
        symbol = str(item.get("symbol") or "").strip()
        buy_krw = float(item.get("buy_krw") or 0)
    except (TypeError, ValueError):
        return {"ok": False, "error": "매수 데이터가 올바르지 않습니다."}, 400
    if buy_krw < MIN_PENDING_BUY_KRW:
        return {
            "ok": False,
            "error": f"매수 금액이 최소 {MIN_PENDING_BUY_KRW:,.0f}원 미만입니다.",
        }, 400
    kind = str(item.get("kind") or "market").strip().lower()
    if kind not in ("market", "limit_pullback"):
        kind = "market"
    offs_pos: list[float] = []
    raw_off = item.get("offsets_pct_points")
    if isinstance(raw_off, list):
        for x in raw_off:
            try:
                fx = float(x)
                if fx > 0:
                    offs_pos.append(fx)
            except (TypeError, ValueError):
                pass
    if kind == "limit_pullback" and not offs_pos:
        return {"ok": False, "error": "눌림목 지정가 요청에 offsets 가 없습니다."}, 400
    n_leg = len(offs_pos)
    if kind == "limit_pullback" and buy_krw + 1e-9 < MIN_PENDING_BUY_KRW * max(1, n_leg):
        return {
            "ok": False,
            "error": (
                f"눌림목 분할 매수: 총액이 구간당 최소 {MIN_PENDING_BUY_KRW:,.0f}원×{max(1, n_leg)} 에 못 미칩니다."
            ),
        }, 400
    try:
        ex = ex_override if ex_override is not None else UpbitExchange()
        if ex_override is None:
            ex.load_markets()
        bal = ex.fetch_balance()
        krw_free = UpbitExchange.free_quote(bal, "KRW")
        st = load_trader_runtime_state(scenario_id, scen)
        virtual_krw = st["virtual_krw"]
        if virtual_krw is not None and float(virtual_krw) + 1e-6 < buy_krw:
            return {
                "ok": False,
                "error": (
                    f"부여(가상) KRW 부족: 필요 {buy_krw:,.0f}원, 남음 {float(virtual_krw):,.2f}원"
                ),
            }, 400
        if krw_free + 1e-6 < buy_krw:
            return {
                "ok": False,
                "error": f"KRW 부족: 필요 약 {buy_krw:,.0f}원, 사용가능 {krw_free:,.2f}원",
            }, 400
        ticker = ex.fetch_ticker(symbol)
        last = float(ticker.get("last") or 0)
        sum_ko = str(item.get("summary_ko") or "").strip()

        if kind == "limit_pullback":
            try:
                orders_pb = ex.limit_buy_krw_pullback(
                    symbol,
                    last_price=last,
                    total_krw=buy_krw,
                    offsets_pct_points=offs_pos,
                    min_krw_per_order=MIN_PENDING_BUY_KRW,
                )
            except InsufficientFunds as e:
                return {"ok": False, "error": f"매수 실패(잔고): {e}"}, 400
            except InvalidOrder as e:
                return {"ok": False, "error": f"매수 실패(거절): {e}"}, 400
            except (RequestTimeout, NetworkError, ExchangeNotAvailable) as e:
                return {"ok": False, "error": f"네트워크 오류: {e}"}, 502
            except ExchangeError as e:
                return {"ok": False, "error": f"거래소 오류: {e}"}, 502
            if not orders_pb:
                return {
                    "ok": False,
                    "error": "지정가 주문이 한 건도 나가지 않았습니다.",
                }, 400
            st2 = load_trader_runtime_state(scenario_id, scen)
            positions: dict[str, Any] = dict(st2["positions"])
            vk = st2["virtual_krw"]
            sym_p = positions.get(symbol) or {"entry_price": None, "last_trade_ts": None}
            sym_p["midpoint_pullback_pending"] = True
            sym_p["midpoint_pullback_placed_ts"] = time.time()
            positions[symbol] = sym_p
            if vk is not None:
                vk = max(0.0, float(vk) - buy_krw)
            save_trader_runtime_state(
                scenario_id, positions=positions, virtual_krw=vk, pending_market_buys=[]
            )
            oid = ",".join(
                str(o.get("id") or "") for o in orders_pb if o.get("id") is not None
            )
            pb_off_pct = float(offs_pos[0]) if offs_pos else 1.0
            cond_s = (sum_ko + " · 눌림목 지정가 접수") if sum_ko else "눌림목 지정가 접수"
            reason_s = (
                (sum_ko + f" · 눌림목 지정가(현재가 대비 {pb_off_pct:g}% 하락)")
                if sum_ko
                else f"눌림목 지정가(현재가 대비 {pb_off_pct:g}% 하락)"
            )
            append_trade(
                {
                    "side": "buy",
                    "scenario_id": scenario_id,
                    "scenario_name": str(scen.get("name") or "시나리오"),
                    "symbol": symbol,
                    "price": last,
                    "amount_base": 0.0,
                    "cost_krw": buy_krw,
                    "order_id": oid,
                    "cond_summary_ko": cond_s,
                    "trade_reason_ko": reason_s,
                }
            )
            return {
                "ok": True,
                "kind": "limit_pullback",
                "symbol": symbol,
                "buy_krw": buy_krw,
                "order_id": oid,
                "last_price": last,
            }, 200

        try:
            order = ex.market_buy_krw(symbol, buy_krw)
        except InsufficientFunds as e:
            return {"ok": False, "error": f"매수 실패(잔고): {e}"}, 400
        except InvalidOrder as e:
            return {"ok": False, "error": f"매수 실패(거절): {e}"}, 400
        except ExchangeError as e:
            return {"ok": False, "error": f"거래소 오류: {e}"}, 502
        fill_price = UpbitExchange.average_fill_price(order)
        fill = float(fill_price) if fill_price is not None else last
        st2 = load_trader_runtime_state(scenario_id, scen)
        positions = dict(st2["positions"])
        vk = st2["virtual_krw"]
        sym_p = positions.get(symbol) or {"entry_price": None, "last_trade_ts": None}
        sym_p["entry_price"] = fill
        sym_p["last_trade_ts"] = time.time()
        positions[symbol] = sym_p
        if vk is not None:
            vk = max(0.0, float(vk) - buy_krw)
        save_trader_runtime_state(
            scenario_id, positions=positions, virtual_krw=vk, pending_market_buys=[]
        )
        filled_amt = float(order.get("filled") or 0)
        if filled_amt <= 0:
            filled_amt = buy_krw / max(fill, 1e-12)
        cond_m = (sum_ko + " · 시장가 매수") if sum_ko else "시장가 매수"
        reason_m = (sum_ko + " · 시장가 매수 체결") if sum_ko else "시장가 매수 체결"
        append_trade(
            {
                "side": "buy",
                "scenario_id": scenario_id,
                "scenario_name": str(scen.get("name") or "시나리오"),
                "symbol": symbol,
                "price": fill,
                "amount_base": filled_amt,
                "cost_krw": buy_krw,
                "order_id": str(order.get("id") or ""),
                "cond_summary_ko": cond_m,
                "trade_reason_ko": reason_m,
            }
        )
        return {
            "ok": True,
            "kind": "market",
            "symbol": symbol,
            "buy_krw": buy_krw,
            "order_id": order.get("id"),
            "fill_price": fill,
        }, 200
    except RuntimeError as e:
        return {"ok": False, "error": str(e)}, 503
    except ValueError as e:
        return {"ok": False, "error": str(e)}, 400


def execute_immediate_buy(
    scenario_id: str,
    scen: dict[str, Any],
    *,
    symbol: str,
    buy_krw: float,
    summary_ko: str,
    kind: str = "market",
    offsets_pct_points: list[float] | None = None,
    ex: UpbitExchange | None = None,
) -> tuple[dict[str, Any], int]:
    """즉시 매수. ex 를 넘기면 루프에서 같은 인스턴스로 주문."""
    k = str(kind or "market").strip().lower()
    if k not in ("market", "limit_pullback"):
        k = "market"
    item: dict[str, Any] = {
        "symbol": symbol,
        "buy_krw": float(buy_krw),
        "summary_ko": summary_ko,
        "kind": k,
    }
    if k == "limit_pullback" and offsets_pct_points:
        item["offsets_pct_points"] = list(offsets_pct_points)
    return _execute_buy_item(scenario_id, scen, item, ex_override=ex)
