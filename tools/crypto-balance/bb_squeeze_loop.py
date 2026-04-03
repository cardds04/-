"""볼린저 밴드 스퀴즈(trading_style=bollinger_squeeze) — 루프 한 시나리오 처리."""

from __future__ import annotations

import logging
import time
from typing import Any, Callable

from ccxt.base.errors import (
    ExchangeError,
    ExchangeNotAvailable,
    InsufficientFunds,
    InvalidOrder,
    NetworkError,
    RequestTimeout,
)

from bollinger_squeeze import list_bollinger_squeeze_candidates
from exchange_helper import UpbitExchange
from pending_market_confirm import execute_immediate_buy
from reference_level import cache_ref_high, drop_ref_label_for_scenario
from scenarios import (
    TRADING_STYLE_BOLLINGER_SQUEEZE,
    load_trader_runtime_state,
    log_skip_buy_post_sell_rebuy_cooldown,
    prune_expired_sold_rebuy_cooldown,
    record_sell_rebuy_cooldown,
    save_trader_runtime_state,
    sold_symbol_rebuy_blocked,
)
from strategy import evaluate_signal
from trade_log import append_trade

MIN_MARKET_BUY_KRW = 5000.0


def run_bollinger_squeeze_scenario(
    *,
    ex: UpbitExchange,
    scen: dict[str, Any],
    sid: str,
    sname: str,
    strat_flat: dict[str, Any],
    all_krw: list[str],
    tickers_map: dict[str, dict[str, Any]],
    tickers: dict[str, dict],
    ref_high_memo: dict[tuple, float],
    bal: dict,
    positions: dict[str, dict],
    virtual_krw: float | None,
    sold_rebuy_cooldown: dict[str, float],
    trading_enabled: bool,
    cooldown_sec: int,
    interval: int,
    log: logging.Logger,
    snapshots: list[dict],
    build_status_snapshot: Callable[..., dict],
) -> tuple[dict, dict[str, dict], float | None, dict[str, dict]]:
    """
    볼린저 스퀴즈: 보유 시 익절·손절만, 미보유 시 밴드 폭이 가장 좁은 후보 1종 매수.
    """
    bb = scen.get("bollinger_squeeze") if isinstance(scen.get("bollinger_squeeze"), dict) else {}
    if not bb:
        return bal, positions, virtual_krw, tickers

    rise_pct = float(bb.get("rise_from_entry_pct") or scen.get("rise_from_entry_pct") or 0.05)
    sl_pct = bb.get("stop_loss_from_entry_pct")
    buy_krw_v = float(bb.get("buy_krw") or 6000)
    ref_lbl = drop_ref_label_for_scenario(scen)
    prune_expired_sold_rebuy_cooldown(sold_rebuy_cooldown)

    def _save_state() -> None:
        save_trader_runtime_state(
            sid,
            positions=positions,
            virtual_krw=virtual_krw,
            pending_market_buys=[],
            sold_rebuy_cooldown_until=sold_rebuy_cooldown,
        )

    def _push_snap(
        symbol: str,
        sig: str,
        last: float,
        ref_high: float,
        high_24h: float,
        base_free: float,
        base: str,
        quote: str,
        sym_p: dict,
        latest_bal: dict,
        bb_candidates: list[dict[str, Any]] | None = None,
    ) -> None:
        ep_snap = sym_p.get("entry_price")
        ep_snap_f = float(ep_snap) if isinstance(ep_snap, (int, float)) else None
        lt_f = sym_p.get("last_trade_ts")
        cd_active = False
        cd_rem = 0.0
        if cooldown_sec > 0 and lt_f is not None:
            elapsed = time.time() - float(lt_f)
            if elapsed < cooldown_sec:
                cd_active = True
                cd_rem = float(cooldown_sec) - elapsed
        snap = build_status_snapshot(
            scenario_id=sid,
            scenario_name=sname,
            symbol=symbol,
            base=base,
            quote=quote,
            last=last,
            high_24h=high_24h,
            reference_high=ref_high,
            drop_reference_high=ref_lbl,
            entry_price=ep_snap_f,
            sig=sig,
            interval=interval,
            buy_krw=buy_krw_v,
            bal=latest_bal,
            strategy_cfg=strat_flat,
            trading_enabled=trading_enabled,
            cooldown_active=cd_active,
            cooldown_remaining_sec=cd_rem,
            virtual_krw=virtual_krw,
        )
        snap["virtual_krw"] = virtual_krw
        snap["buy_tier"] = "bollinger_squeeze"
        snap["trading_style"] = TRADING_STYLE_BOLLINGER_SQUEEZE
        if bb_candidates is not None:
            snap["bb_candidates"] = bb_candidates
        snapshots.append(snap)

    latest_bal = bal

    candidates_preview: list[dict[str, Any]] = list_bollinger_squeeze_candidates(
        ex.exchange, all_krw, bb, tickers_map=tickers_map, limit=30
    )

    held = [
        sym
        for sym, p in positions.items()
        if isinstance(p, dict) and p.get("entry_price") is not None
    ]

    if held:
        for symbol in held:
            base, quote = UpbitExchange.base_and_quote(symbol)
            ticker = ex.ensure_ticker(symbol, tickers_map=tickers_map, cache=tickers)
            last = float(ticker["last"] or 0)
            high_24h = max(float(ticker.get("high") or last), last)
            ref_high = cache_ref_high(ex.exchange, symbol, ticker, scen, ref_high_memo)

            base_row = bal.get(base) if isinstance(bal.get(base), dict) else {}
            base_free = float((base_row or {}).get("free") or 0)
            sym_p = positions.get(symbol) or {"entry_price": None, "last_trade_ts": None}
            entry = sym_p.get("entry_price")
            entry_price: float | None = float(entry) if isinstance(entry, (int, float)) else None

            lt_raw = sym_p.get("last_trade_ts")
            cd_active = False
            cd_rem = 0.0
            if cooldown_sec > 0 and lt_raw is not None:
                elapsed = time.time() - float(lt_raw)
                if elapsed < cooldown_sec:
                    cd_active = True
                    cd_rem = float(cooldown_sec) - elapsed

            can_trade = trading_enabled and not cd_active

            sig = evaluate_signal(
                reference_high=ref_high,
                last=last,
                entry_price=entry_price,
                base_free=base_free,
                drop_from_high_pct=None,
                rise_from_entry_pct=rise_pct,
                stop_loss_from_entry_pct=sl_pct,
                buy_using_watch_positive=False,
            )

            if sig == "SELL" and base_free > 1e-12 and can_trade:
                sold = base_free
                ep_before = entry_price
                try:
                    order = ex.market_sell_base(symbol, base_free)
                except InsufficientFunds as e:
                    log.error("[%s | %s] 매도 실패: %s", sname, symbol, e)
                except InvalidOrder as e:
                    log.error("[%s | %s] 매도 실패: %s", sname, symbol, e)
                except (RequestTimeout, NetworkError, ExchangeNotAvailable) as e:
                    log.warning("[%s | %s] 매도 네트워크 오류: %s", sname, symbol, e)
                except ExchangeError as e:
                    log.error("[%s | %s] 매도 실패: %s", sname, symbol, e)
                else:
                    avg_sell = UpbitExchange.average_fill_price(order)
                    if avg_sell is None:
                        avg_sell = last
                    proceeds = float(order.get("cost") or (float(avg_sell) * sold))
                    pnl = None
                    if ep_before is not None and ep_before > 0:
                        pnl = (float(avg_sell) - float(ep_before)) * sold

                    sym_p["entry_price"] = None
                    sym_p["last_trade_ts"] = time.time()
                    positions[symbol] = sym_p
                    if virtual_krw is not None:
                        virtual_krw = float(virtual_krw) + proceeds
                    record_sell_rebuy_cooldown(sold_rebuy_cooldown, symbol)
                    _save_state()

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
                            "trade_reason_ko": (
                                f"「{sname}」({sid}) · {symbol}\n"
                                "볼린저 스퀴즈 모드 — 익절·손절 시그널 SELL 후 시장가 매도."
                            ),
                        }
                    )

                    bal = ex.fetch_balance()
                    latest_bal = bal

            _push_snap(
                symbol,
                sig,
                last,
                ref_high,
                high_24h,
                base_free,
                base,
                quote,
                positions.get(symbol) or sym_p,
                latest_bal,
                bb_candidates=candidates_preview,
            )
        return bal, positions, virtual_krw, tickers

    best = str(candidates_preview[0]["symbol"]) if candidates_preview else None
    symbol = best if best else str(scen.get("trading_symbol") or "BTC/KRW")
    ticker = ex.ensure_ticker(symbol, tickers_map=tickers_map, cache=tickers)
    last = float(ticker["last"] or 0)
    high_24h = max(float(ticker.get("high") or last), last)
    ref_high = cache_ref_high(ex.exchange, symbol, ticker, scen, ref_high_memo)

    base, quote = UpbitExchange.base_and_quote(symbol)
    base_row = bal.get(base) if isinstance(bal.get(base), dict) else {}
    base_free = float((base_row or {}).get("free") or 0)
    sym_p = positions.get(symbol) or {"entry_price": None, "last_trade_ts": None}
    entry = sym_p.get("entry_price")
    entry_price: float | None = float(entry) if isinstance(entry, (int, float)) else None

    lt_raw = sym_p.get("last_trade_ts")
    cd_active = False
    cd_rem = 0.0
    if cooldown_sec > 0 and lt_raw is not None:
        elapsed = time.time() - float(lt_raw)
        if elapsed < cooldown_sec:
            cd_active = True
            cd_rem = float(cooldown_sec) - elapsed

    can_trade = trading_enabled and not cd_active
    sig = "HOLD"

    if not candidates_preview:
        log.info("[%s] 볼린저 스퀴즈: 조건 충족 종목 없음", sname)
    elif base_free > 1e-12 and entry_price is not None:
        sig = evaluate_signal(
            reference_high=ref_high,
            last=last,
            entry_price=entry_price,
            base_free=base_free,
            drop_from_high_pct=None,
            rise_from_entry_pct=rise_pct,
            stop_loss_from_entry_pct=sl_pct,
            buy_using_watch_positive=False,
        )
    elif base_free <= 1e-12 and can_trade and best is not None and candidates_preview:
        reb_blk, reb_rem = sold_symbol_rebuy_blocked(sold_rebuy_cooldown, symbol)
        if reb_blk:
            log_skip_buy_post_sell_rebuy_cooldown(sname, symbol, reb_rem, log_=log)
        else:
            buy_krw = buy_krw_v
            if buy_krw + 1e-9 < MIN_MARKET_BUY_KRW:
                log.info("[%s | %s] 볼린저 스퀴즈 매수액 %.0f원(최소 %.0f원 미만) — 생략", sname, symbol, buy_krw, MIN_MARKET_BUY_KRW)
            elif virtual_krw is not None and virtual_krw < buy_krw:
                log.warning(
                    "[%s | %s] 가상 KRW 부족 — 필요 %s, 남음 %s",
                    sname,
                    symbol,
                    f"{buy_krw:,.0f}",
                    f"{virtual_krw:,.2f}",
                )
            else:
                krw_free = UpbitExchange.free_quote(bal, quote)
                if krw_free < buy_krw:
                    log.warning(
                        "[%s | %s] KRW 부족 — 필요 약 %s, 사용가능 %s",
                        sname,
                        symbol,
                        f"{buy_krw:,.0f}",
                        f"{krw_free:,.2f}",
                    )
                else:
                    res_bb, _ = execute_immediate_buy(
                        sid,
                        scen,
                        symbol=symbol,
                        buy_krw=float(buy_krw),
                        summary_ko="볼린저 스퀴즈 시장가 매수",
                        kind="market",
                        ex=ex,
                    )
                    if res_bb.get("ok"):
                        st_sync = load_trader_runtime_state(sid, scen)
                        positions.clear()
                        positions.update(dict(st_sync["positions"]))
                        virtual_krw = st_sync["virtual_krw"]
                        _save_state()
                        log.info(
                            "[%s | %s] 볼린저 스퀴즈 시장가 즉시 매수 (%.0f원)",
                            sname,
                            symbol,
                            buy_krw,
                        )
                        sig = "BOUGHT"
                    else:
                        log.warning(
                            "[%s | %s] 볼린저 스퀴즈 시장가 매수 실패: %s",
                            sname,
                            symbol,
                            res_bb.get("error"),
                        )

    if (
        sig == "HOLD"
        and best is not None
        and base_free <= 1e-12
        and entry_price is None
        and not sold_symbol_rebuy_blocked(sold_rebuy_cooldown, symbol)[0]
    ):
        sig = "BUY"

    _push_snap(
        symbol,
        sig,
        last,
        ref_high,
        high_24h,
        base_free,
        base,
        quote,
        positions.get(symbol) or sym_p,
        latest_bal,
        bb_candidates=candidates_preview,
    )

    return bal, positions, virtual_krw, tickers
