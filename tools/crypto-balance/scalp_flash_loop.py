"""초단타(scalp_flash) — 거래대금 상위·24h 상승 감시, 3h/6h·15m 조건 매수, 익절·손절."""

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

from exchange_helper import UpbitExchange
from pending_market_confirm import execute_immediate_buy
from reference_high import reference_high_for_drop
from reference_level import cache_ref_high, drop_ref_label_for_scenario
from scalp_flash import build_scalp_watch_symbols, scalp_buy_conditions_ok
from scenarios import (
    TRADING_STYLE_SCALP_FLASH,
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


def run_scalp_flash_scenario(
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
    sf = scen.get("scalp_flash") if isinstance(scen.get("scalp_flash"), dict) else {}
    if not sf:
        return bal, positions, virtual_krw, tickers

    rise_pct = float(sf.get("rise_from_entry_pct") or scen.get("rise_from_entry_pct") or 0.005)
    sl_pct = sf.get("stop_loss_from_entry_pct")
    buy_krw_v = float(sf.get("buy_krw") or 10000)
    vol_n = int(sf.get("volume_top_n") or 20)
    min_24h = float(sf.get("min_24h_rise_pct") or 2.0)
    sp_36 = float(sf.get("high_3h_vs_6h_min_spread_pct") or 0.1)
    drop15 = float(sf.get("min_drop_from_15m_high_pct") or 0.07)
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
        watch_preview: list[str] | None = None,
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
        snap["buy_tier"] = "scalp_flash"
        snap["trading_style"] = TRADING_STYLE_SCALP_FLASH
        if watch_preview is not None:
            snap["scalp_watch_symbols"] = watch_preview
        snapshots.append(snap)

    latest_bal = bal

    watch_list = build_scalp_watch_symbols(
        tickers_map,
        all_krw,
        volume_top_n=vol_n,
        min_24h_rise_pct=min_24h,
    )

    held_syms = [
        sym
        for sym, p in positions.items()
        if isinstance(p, dict) and p.get("entry_price") is not None
    ]

    for symbol in held_syms:
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
                            "초단타 모드 — 익절·손절 시그널 SELL 후 시장가 매도."
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
            watch_preview=watch_list,
        )

    snap_symbol = str(scen.get("trading_symbol") or "BTC/KRW")
    if watch_list:
        snap_symbol = watch_list[0]

    for symbol in watch_list:
        sym_p = positions.get(symbol) or {"entry_price": None, "last_trade_ts": None}
        if sym_p.get("entry_price") is not None:
            continue

        base, quote = UpbitExchange.base_and_quote(symbol)
        ticker = ex.ensure_ticker(symbol, tickers_map=tickers_map, cache=tickers)
        last = float(ticker["last"] or 0)
        high_24h = max(float(ticker.get("high") or last), last)

        rk3 = (symbol, "3h")
        rk6 = (symbol, "6h")
        rk15 = (symbol, "15m")
        if rk3 not in ref_high_memo:
            ref_high_memo[rk3] = reference_high_for_drop(ex.exchange, symbol, "3h", ticker)
        if rk6 not in ref_high_memo:
            ref_high_memo[rk6] = reference_high_for_drop(ex.exchange, symbol, "6h", ticker)
        if rk15 not in ref_high_memo:
            ref_high_memo[rk15] = reference_high_for_drop(ex.exchange, symbol, "15m", ticker)
        h3 = ref_high_memo[rk3]
        h6 = ref_high_memo[rk6]
        h15 = ref_high_memo[rk15]

        ref_high = cache_ref_high(ex.exchange, symbol, ticker, scen, ref_high_memo)

        base_row = bal.get(base) if isinstance(bal.get(base), dict) else {}
        base_free = float((base_row or {}).get("free") or 0)
        entry_price: float | None = None

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

        ok_buy = scalp_buy_conditions_ok(
            h3=h3,
            h6=h6,
            h15=h15,
            last=last,
            high_3h_vs_6h_min_spread_pct=sp_36,
            min_drop_from_15m_high_pct=drop15,
        )

        if base_free <= 1e-12 and can_trade and ok_buy:
            reb_blk, reb_rem = sold_symbol_rebuy_blocked(sold_rebuy_cooldown, symbol)
            if reb_blk:
                log_skip_buy_post_sell_rebuy_cooldown(sname, symbol, reb_rem, log_=log)
            else:
                buy_krw = buy_krw_v
                if buy_krw + 1e-9 < MIN_MARKET_BUY_KRW:
                    log.info(
                        "[%s | %s] 초단타 매수액 %.0f원(최소 %.0f원 미만) — 생략",
                        sname,
                        symbol,
                        buy_krw,
                        MIN_MARKET_BUY_KRW,
                    )
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
                        res_sf, _ = execute_immediate_buy(
                            sid,
                            scen,
                            symbol=symbol,
                            buy_krw=float(buy_krw),
                            summary_ko="초단타(스캘프) 시장가 매수",
                            kind="market",
                            ex=ex,
                        )
                        if res_sf.get("ok"):
                            st_sync = load_trader_runtime_state(sid, scen)
                            positions.clear()
                            positions.update(dict(st_sync["positions"]))
                            virtual_krw = st_sync["virtual_krw"]
                            _save_state()
                            log.info(
                                "[%s | %s] 초단타 시장가 즉시 매수 (%.0f원)",
                                sname,
                                symbol,
                                buy_krw,
                            )
                            sig = "BOUGHT"
                        else:
                            log.warning(
                                "[%s | %s] 초단타 시장가 매수 실패: %s",
                                sname,
                                symbol,
                                res_sf.get("error"),
                            )

        if sig == "HOLD" and ok_buy and not sold_symbol_rebuy_blocked(sold_rebuy_cooldown, symbol)[0]:
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
            watch_preview=watch_list,
        )
        snap_symbol = symbol

    if not watch_list and not held_syms:
        log.info("[%s] 초단타: 감시 종목 없음(거래대금·24h 등락 필터)", sname)
        t0 = ex.ensure_ticker(snap_symbol, tickers_map=tickers_map, cache=tickers)
        last0 = float(t0["last"] or 0)
        h24 = max(float(t0.get("high") or last0), last0)
        rh0 = cache_ref_high(ex.exchange, snap_symbol, t0, scen, ref_high_memo)
        b0, q0 = UpbitExchange.base_and_quote(snap_symbol)
        br0 = bal.get(b0) if isinstance(bal.get(b0), dict) else {}
        bf0 = float((br0 or {}).get("free") or 0)
        sp0 = positions.get(snap_symbol) or {"entry_price": None, "last_trade_ts": None}
        _push_snap(
            snap_symbol,
            "HOLD",
            last0,
            rh0,
            h24,
            bf0,
            b0,
            q0,
            sp0,
            bal,
            watch_preview=[],
        )

    return bal, positions, virtual_krw, tickers
