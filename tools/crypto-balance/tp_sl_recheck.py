"""메인 루프 주기와 무관하게 익절·손절 구간을 주기적으로 재확인(TP_SL 기본 30초, 손절 기본 8초와 min)."""

from __future__ import annotations

import logging
import os
import threading
import time
from typing import Any

from ccxt.base.errors import RateLimitExceeded

from exchange_helper import UpbitExchange, avg_buy_krw_per_unit_from_balance
from scenarios import (
    active_enabled_scenarios,
    get_dashboard_default_scenario_id,
    load_scenarios_list,
    load_trader_runtime_state,
    prune_expired_sold_rebuy_cooldown,
    prune_expired_watch_exclude_after_sell,
    record_sell_rebuy_cooldown,
    record_watch_exclude_after_sell,
    save_trader_runtime_state,
)
from strategy import (
    normalize_stop_loss_frac,
    scenario_included_in_tp_sl_recheck,
    stop_loss_price_epsilon,
    sync_position_highest_price,
    trailing_stop_sell_triggered,
)
from trade_fifo import resolve_scenario_id_for_krw_holding
from trade_log import append_trade, read_trades
from trade_reason import cond_summary_ko_trend_sell, sell_reason_trend_follow_auto


def _recheck_wait_seconds() -> tuple[float, float]:
    """
    (실제 스레드 대기 초, TP_SL_RECHECK_SEC 설정값).
    STOP_LOSS_RECHECK_SEC 미설정 시 기본 8초와 TP_SL 중 짧은 쪽(손절·익절 재확인 촘촘화).
    0이면 TP 간격만 쓰고 싶을 때: STOP_LOSS_RECHECK_SEC=0 (또는 TP와 동일한 큰 값).
    """
    try:
        tp = float(os.getenv("TP_SL_RECHECK_SEC", "30").strip() or "30")
    except ValueError:
        tp = 30.0
    if tp <= 0:
        return (0.0, tp)
    raw_sl = os.getenv("STOP_LOSS_RECHECK_SEC")
    if raw_sl is None or str(raw_sl).strip() == "":
        sl = 8.0
    else:
        try:
            sl = float(str(raw_sl).strip())
        except ValueError:
            return (tp, tp)
        if sl <= 0:
            return (tp, tp)
    w = min(tp, sl)
    return (max(1.0, w), tp)


def get_tp_sl_recheck_wait_seconds() -> tuple[float, float]:
    """대기 간격(초)과 TP_SL_RECHECK_SEC 설정값 — 로그·문서용."""
    return _recheck_wait_seconds()


def _conservative_price_for_sl(ticker: dict[str, Any], last: float) -> float:
    """손절 판단: 체결가(last)만 보면 호가가 이미 손절 아래인데 놓칠 수 있어 bid 가 있으면 더 낮은 쪽 사용."""
    try:
        lv = float(last)
    except (TypeError, ValueError):
        return 0.0
    br = ticker.get("bid")
    if br is None:
        return lv
    try:
        bv = float(br)
    except (TypeError, ValueError):
        return lv
    if bv <= 0:
        return lv
    return min(lv, bv)


def run_tp_sl_recheck_scan(
    ex: UpbitExchange,
    active: list[dict[str, Any]],
    bal: dict[str, Any],
    *,
    log: logging.Logger,
) -> dict[str, Any]:
    """
    시나리오 상태의 평단(entry_price)이 있으면 그것으로, 없으면 업비트 잔고 평단(avg_krw_buy_price)으로
    익절·손절을 판단한다. 상태에 종목이 없어도 거래소에 잔고가 있고 FIFO·대시보드 기본 트레이더로
    귀속되면 같은 규칙으로 매도한다(대시보드 「내 보유 코인」 목표가와 맞춤).
    trading_enabled 가 꺼진 시나리오는 건너뜀. 쿨다운은 무시.
    손절은 티커 bid 가 있으면 min(last, bid)로 재확인해, 체결가만으로는 손절선을 통과한 것처럼 보일 때도
    실제 매도 호가가 이미 손절 아래인 경우를 잡는다.
    """
    wait_sec, _tp_cfg = _recheck_wait_seconds()
    if wait_sec <= 0:
        return bal
    label_sec = max(1, int(round(wait_sec)))

    work_bal = bal
    avg_map = avg_buy_krw_per_unit_from_balance(work_bal)
    trades = read_trades()
    fb_sid = get_dashboard_default_scenario_id()
    sid_to_scen = {str(s.get("id")): s for s in active if s.get("id") is not None}

    jobs: list[
        tuple[
            dict[str, Any],
            str,
            str,
            dict[str, dict[str, Any]],
            list[float | None],
            dict[str, float],
            dict[str, float],
            str,
            dict[str, Any],
            float,
            float,
            float | None,
        ]
    ] = []
    keys_done: set[tuple[str, str]] = set()
    scenario_snapshots: dict[
        str,
        tuple[
            dict[str, dict[str, Any]],
            list[float | None],
            dict[str, float],
            dict[str, float],
        ],
    ] = {}

    def _snapshot(
        sid: str, scen: dict[str, Any]
    ) -> tuple[
        dict[str, dict[str, Any]],
        list[float | None],
        dict[str, float],
        dict[str, float],
    ]:
        if sid not in scenario_snapshots:
            st = load_trader_runtime_state(sid, scen)
            sold = dict(st.get("sold_rebuy_cooldown_until") or {})
            prune_expired_sold_rebuy_cooldown(sold)
            wex = dict(st.get("watch_exclude_after_sell_until") or {})
            prune_expired_watch_exclude_after_sell(wex)
            scenario_snapshots[sid] = (dict(st["positions"]), [st["virtual_krw"]], sold, wex)
        return scenario_snapshots[sid]

    for scen in active:
        if not scenario_included_in_tp_sl_recheck(scen):
            continue
        sid = str(scen.get("id") or "")
        if not sid:
            continue
        sname = str(scen.get("name") or "시나리오")
        rise = float(scen.get("rise_from_entry_pct") or 0.05)
        sl_f = normalize_stop_loss_frac(scen.get("stop_loss_from_entry_pct"))

        positions, vk_box, sold_cd, watch_excl = _snapshot(sid, scen)

        for symbol, sym_p in list(positions.items()):
            base, _quote = UpbitExchange.base_and_quote(symbol)
            base_row = work_bal.get(base)
            if not isinstance(base_row, dict):
                continue
            base_free = float(base_row.get("free") or 0)
            if base_free <= 1e-12:
                continue

            entry_f: float | None = None
            ep_raw = sym_p.get("entry_price")
            if ep_raw is not None:
                try:
                    v = float(ep_raw)
                    if v > 0:
                        entry_f = v
                except (TypeError, ValueError):
                    pass
            if entry_f is None:
                av = avg_map.get(base)
                if av is not None and av > 0:
                    entry_f = float(av)
            if entry_f is None or entry_f <= 0:
                continue

            if (sid, symbol) in keys_done:
                continue
            keys_done.add((sid, symbol))
            jobs.append(
                (
                    scen,
                    sid,
                    sname,
                    positions,
                    vk_box,
                    sold_cd,
                    watch_excl,
                    symbol,
                    sym_p,
                    entry_f,
                    rise,
                    sl_f,
                )
            )

    for code, row in work_bal.items():
        if code == "info" or not isinstance(row, dict):
            continue
        cur = str(code).upper()
        if cur == "KRW":
            continue
        symbol = f"{cur}/KRW"
        try:
            free = float(row.get("free") or 0)
            total = float(row.get("total") or free)
        except (TypeError, ValueError):
            continue
        if free <= 1e-12:
            continue
        avg = avg_map.get(cur)
        if avg is None or avg <= 0:
            continue

        rid = resolve_scenario_id_for_krw_holding(trades, symbol, total, fb_sid)
        if not rid or rid not in sid_to_scen:
            continue
        scen = sid_to_scen[rid]
        if not scenario_included_in_tp_sl_recheck(scen):
            continue
        if (rid, symbol) in keys_done:
            continue

        rise = float(scen.get("rise_from_entry_pct") or 0.05)
        sl_f = normalize_stop_loss_frac(scen.get("stop_loss_from_entry_pct"))
        positions, vk_box, sold_cd, watch_excl = _snapshot(rid, scen)
        sym_p = positions.setdefault(symbol, {"entry_price": None, "last_trade_ts": None})
        sname = str(scen.get("name") or "시나리오")
        keys_done.add((rid, symbol))
        jobs.append(
            (
                scen,
                rid,
                sname,
                positions,
                vk_box,
                sold_cd,
                watch_excl,
                symbol,
                sym_p,
                float(avg),
                rise,
                sl_f,
            )
        )

    if not jobs:
        return work_bal

    symbols_need = sorted({j[7] for j in jobs})
    try:
        price_map = ex.fetch_tickers_for_symbols(symbols_need)
    except Exception as e:
        log.warning("익절·손절 재확인 배치 티커 실패: %s", e)
        price_map = {}

    any_sold = False
    for (
        scen,
        sid,
        sname,
        positions,
        vk_box,
        sold_cd,
        watch_excl,
        symbol,
        sym_p,
        entry_f,
        rise,
        sl_f,
    ) in jobs:
        ticker = price_map.get(symbol)
        if not isinstance(ticker, dict) or ticker.get("last") is None:
            continue
        last = float(ticker["last"] or 0)
        if last <= 0:
            continue
        px_sl = _conservative_price_for_sl(ticker, last)

        if sync_position_highest_price(sym_p, last, float(entry_f)):
            save_trader_runtime_state(
                sid,
                positions=positions,
                virtual_krw=vk_box[0],
                pending_market_buys=[],
                sold_rebuy_cooldown_until=sold_cd,
                watch_exclude_after_sell_until=watch_excl,
            )

        price_eps = stop_loss_price_epsilon(float(entry_f))
        take_profit = entry_f * (1.0 + rise)
        hit_tp = last + price_eps >= take_profit
        hit_sl = False
        if sl_f is not None:
            stop_line = entry_f * (1.0 - sl_f)
            hit_sl = px_sl <= stop_line + price_eps

        hp_raw = sym_p.get("highest_price")
        hp_f = (
            float(hp_raw)
            if isinstance(hp_raw, (int, float)) and float(hp_raw) > 0
            else None
        )
        ts_cfg = scen.get("trailing_stop") if isinstance(scen.get("trailing_stop"), dict) else None
        hit_trail = trailing_stop_sell_triggered(
            last=last,
            entry_price=float(entry_f),
            highest_price=hp_f,
            trailing_stop=ts_cfg,
        )

        if not hit_tp and not hit_sl and not hit_trail:
            continue

        te = bool(scen.get("trading_enabled", True))
        if hit_tp and not te:
            continue
        if hit_trail and not te:
            continue

        base, _quote = UpbitExchange.base_and_quote(symbol)
        base_row = work_bal.get(base)
        if not isinstance(base_row, dict):
            continue
        base_free = float(base_row.get("free") or 0)
        if base_free <= 1e-12:
            continue

        sold = base_free
        ep_before = entry_f
        if hit_sl:
            kind = "손절"
            tl_exit_code = ""
        elif hit_trail:
            kind = "트레일링"
            tl_exit_code = "trail"
        else:
            kind = "익절"
            tl_exit_code = ""
        order = ex.market_sell_base_with_retries(
            symbol,
            base_free,
            log_=log,
            context=f"[{sname} | {symbol}] 주기 {kind}",
        )
        if order is not None:
            any_sold = True
            avg_sell = UpbitExchange.average_fill_price(order)
            if avg_sell is None:
                avg_sell = last
            proceeds = float(order.get("cost") or (float(avg_sell) * sold))
            pnl = (float(avg_sell) - float(ep_before)) * sold

            sym_p["entry_price"] = None
            sym_p["last_trade_ts"] = time.time()
            sym_p.pop("tl_loss_armed", None)
            sym_p.pop("highest_price", None)
            positions[symbol] = sym_p
            if vk_box[0] is not None:
                vk_box[0] = float(vk_box[0]) + proceeds
            record_sell_rebuy_cooldown(sold_cd, symbol)
            record_watch_exclude_after_sell(watch_excl, symbol)
            save_trader_runtime_state(
                sid,
                positions=positions,
                virtual_krw=vk_box[0],
                pending_market_buys=[],
                sold_rebuy_cooldown_until=sold_cd,
                watch_exclude_after_sell_until=watch_excl,
            )

            base_reason = sell_reason_trend_follow_auto(
                scenario_name=sname,
                scenario_id=sid,
                symbol=symbol,
                scenario=scen,
                entry_price=ep_before,
                sell_price=float(avg_sell),
                tl_code=tl_exit_code,
            )
            trade_reason_ko = f"【약 {label_sec}초 주기 익절·손절 재확인】\n\n" + base_reason

            append_trade(
                {
                    "side": "sell",
                    "scenario_id": sid,
                    "scenario_name": sname,
                    "symbol": symbol,
                    "price": float(avg_sell),
                    "amount_base": sold,
                    "proceeds_krw": proceeds,
                    "entry_price": ep_before,
                    "realized_pnl_krw": pnl,
                    "order_id": str(order.get("id") or ""),
                    "cond_summary_ko": cond_summary_ko_trend_sell(scen),
                    "trade_reason_ko": trade_reason_ko,
                }
            )

            log.info(
                "[%s | %s] 주기 익절·손절 재확인 → 시장가 매도 (%s, 현재가·체결 참고 %.0f원, 주문 %s)",
                sname,
                symbol,
                kind,
                float(avg_sell),
                str(order.get("id") or ""),
            )

    if any_sold:
        try:
            work_bal = ex.fetch_balance()
        except Exception as e:
            log.warning("익절·손절 재확인: 매도 후 잔고 갱신 실패: %s", e)

    return work_bal


def _tp_sl_recheck_thread_main(ex: UpbitExchange, log: logging.Logger, stop: threading.Event) -> None:
    while not stop.is_set():
        wait_sec, _tp = _recheck_wait_seconds()
        if wait_sec <= 0:
            if stop.wait(timeout=60.0):
                return
            continue
        try:
            scenarios = load_scenarios_list()
            active = active_enabled_scenarios(scenarios)
            if active:
                bal = ex.fetch_balance()
                run_tp_sl_recheck_scan(ex, active, bal, log=log)
        except RateLimitExceeded as e:
            log.warning("익절·손절 재확인 스레드 요청 한도: %s — 다음 주기까지 대기", e)
        except Exception as e:
            log.warning("익절·손절 재확인 스레드 오류: %s", e)
        if stop.wait(timeout=wait_sec):
            return


def start_tp_sl_recheck_daemon(ex: UpbitExchange, log: logging.Logger) -> threading.Event:
    """TP_SL_RECHECK_SEC>0 일 때만 의미 있음. 스레드는 즉시 1회 스캔 후 대기(STOP_LOSS_RECHECK_SEC 기본 8초와 min)."""
    stop = threading.Event()
    t = threading.Thread(
        target=_tp_sl_recheck_thread_main,
        args=(ex, log, stop),
        daemon=True,
        name="tp-sl-recheck",
    )
    t.start()
    return stop
