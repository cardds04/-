#!/usr/bin/env python3
"""
업비트 자동매매 루프 (실거래).

시나리오(퀀트트레이더)마다 watch_symbols 로 감시할 KRW 마켓 종목을 두고,
strategy.evaluate_signal 에 따라 종목별로 시장가 주문을 검토합니다.
allocated_krw 가 있으면 그 트레이더 전용 가상 KRW 풀 안에서만 매수합니다.
실행 전 .env 의 BUY_KRW_AMOUNT 등을 확인하세요.
"""

from __future__ import annotations

import json
import logging
import os
import random
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from ccxt.base.errors import (
    AuthenticationError,
    ExchangeError,
    ExchangeNotAvailable,
    InsufficientFunds,
    InvalidOrder,
    NetworkError,
    RateLimitExceeded,
    RequestTimeout,
)

from exchange_helper import UpbitExchange
from scenarios import (
    BUY_ENTRY_MODE_DROP,
    BUY_ENTRY_MODE_MIDPOINT_RISE,
    BUY_ENTRY_MODE_WATCH_SHARE,
    MIN_RANDOM_WATCH,
    TRADING_STYLE_TREND_FOLLOW,
    WATCH_POSITIVE_VS_REF_FIXED_PCT,
    active_enabled_scenarios,
    assign_watch_symbols_per_loop,
    buy_krw_for_tier,
    effective_buy_krw,
    global_loop_seconds,
    load_trader_runtime_state,
    load_scenarios_list,
    migrate_if_needed,
    save_trader_runtime_state,
    scenario_to_flat,
    symbol_tier_by_rise_rank_pct,
)
from reference_level import cache_ref_high, drop_ref_label_for_scenario
from reference_midpoint import normalize_midpoint_window, reference_midpoint_for_window
from strategy import drop_from_high_epsilon, evaluate_signal, time_limit_exit_signal
from trade_log import append_trade
from trade_reason import (
    buy_reason_trend_follow,
    cond_summary_ko_trend_buy,
    cond_summary_ko_trend_sell,
    sell_reason_trend_follow_auto,
)
from bb_squeeze_loop import run_bollinger_squeeze_scenario
from scalp_flash_loop import run_scalp_flash_scenario
from vsc_loop import run_volume_surge_chase_scenario

load_dotenv()

STATUS_PATH = Path(__file__).resolve().parent / "status.json"
BASE_DIR = Path(__file__).resolve().parent
# 평단 없음·자동매매 꺼짐 안내는 (시나리오, 심볼)당 프로세스에서 한 번만
_LOGGED_NO_ENTRY: set[tuple[str, str]] = set()
_LOGGED_TRADING_DISABLED: set[tuple[str, str]] = set()


def _balance_triple(bal: dict, code: str) -> tuple[float, float, float]:
    row = bal.get(code)
    if not isinstance(row, dict):
        return 0.0, 0.0, 0.0
    f = float(row.get("free") or 0)
    u = float(row.get("used") or 0)
    t = float(row.get("total") or 0)
    return f, u, t


def _write_status_json(path: Path, data: dict) -> None:
    """웹 대시보드용 스냅샷(원자적 덮어쓰기)."""
    payload = {**data, "updated_at": datetime.now(timezone.utc).isoformat()}
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    tmp.replace(path)


def _merge_status_error(last: dict | None, message: str) -> dict:
    out = dict(last) if last else {}
    out["ok"] = False
    out["last_error"] = message
    return out


MIN_MARKET_BUY_KRW = 5000.0


def _watch_positive_share_and_tiers(
    ex: UpbitExchange,
    scen: dict,
    symbols_loop: list[str],
    tickers: dict[str, dict],
    ref_high_memo: dict[tuple, float],
) -> tuple[float, int, int, dict[str, str]]:
    """감시 목록 플러스 비중(%) + 기준 고가 대비 상승률 순위 구간(상·중·하) per symbol."""
    n = len(symbols_loop)
    if n == 0:
        return 100.0, 0, 0, {}
    gate_pct = float(WATCH_POSITIVE_VS_REF_FIXED_PCT)
    pos = 0
    rise_map: dict[str, float] = {}
    for symbol in symbols_loop:
        if symbol not in tickers:
            tickers[symbol] = ex.fetch_ticker(symbol)
        t = tickers[symbol]
        last = float(t.get("last") or 0)
        rh = cache_ref_high(ex.exchange, symbol, t, scen, ref_high_memo)
        if rh is None or rh <= 1e-12:
            rise_map[symbol] = -1e18
            continue
        pct = (last - rh) / rh * 100.0
        rise_map[symbol] = pct
        if pct >= gate_pct:
            pos += 1
    total = len(symbols_loop)
    share = (pos / total) * 100.0 if total else 100.0
    tier_map = symbol_tier_by_rise_rank_pct(rise_map)
    return share, pos, total, tier_map


def _trade_hint_ko(
    *,
    sig: str,
    trading_enabled: bool,
    cooldown_active: bool,
    cooldown_remaining_sec: float,
    base_free: float,
    reference_high: float,
    last: float,
    drop: float | None,
    buy_krw: float,
    quote_free: float,
    virtual_krw: float | None,
    buy_gap_pct: float | None,
    drop_ref_label: str = "24h",
    buy_entry_mode: str = BUY_ENTRY_MODE_DROP,
    watch_positive_gate_pct: float = WATCH_POSITIVE_VS_REF_FIXED_PCT,
    midpoint_gate_level: float | None = None,
    midpoint_gate_min_pct: float | None = None,
) -> str:
    """대시보드용 한 줄 안내 — 체결이 없을 때 이유를 짐작할 수 있게 함."""
    drop_req_pct = (drop * 100.0) if drop is not None else None
    ref_ko = drop_ref_label if drop_ref_label else "24h"
    if not trading_enabled:
        return "체결 없음: 자동매매 OFF — 대시보드에서 업무시작을 눌러 주세요."
    if cooldown_active:
        return f"체결 없음: 쿨다운 중(약 {max(0.0, cooldown_remaining_sec):.0f}초 남음)."
    if base_free <= 1e-12 and virtual_krw is not None and virtual_krw + 1e-6 < buy_krw:
        return (
            "체결 없음: 이 트레이더 부여(가상) KRW가 1회 매수액보다 적습니다. "
            "부여 자산을 늘리거나 매수 금액을 낮추세요."
        )
    if base_free <= 1e-12 and quote_free + 1e-6 < buy_krw:
        return (
            "체결 없음: 계좌 KRW 사용 가능액이 1회 매수액보다 부족할 수 있습니다. 업비트 잔고를 확인하세요."
        )
    if sig == "BUY" and base_free <= 1e-12:
        return "매수 신호(BUY) — 이번·다음 루프에서 잔고가 맞으면 시장가 매수를 시도합니다. trading.log 도 확인하세요."
    if sig == "SELL" and base_free > 1e-12:
        return "매도 신호(SELL) — 잔고가 맞으면 시장가 매도를 시도합니다."
    if sig == "HOLD" and base_free <= 1e-12:
        if buy_entry_mode == BUY_ENTRY_MODE_WATCH_SHARE:
            if buy_gap_pct is not None and buy_gap_pct > 0.0001:
                return (
                    f"체결 없음: 시그널 HOLD — 기준 고가({ref_ko}) 대비 +{watch_positive_gate_pct:.2f}% 이상인 종목만 매수 검토하며, "
                    f"현재가가 그 기준가보다 약 {buy_gap_pct:.2f}%p 낮습니다."
                )
            return (
                f"체결 없음: 시그널 HOLD — 기준 고가({ref_ko}) 대비 +{watch_positive_gate_pct:.2f}% 이상일 때 매수가 검토됩니다."
            )
        if buy_entry_mode == BUY_ENTRY_MODE_MIDPOINT_RISE:
            if midpoint_gate_level is None or (midpoint_gate_min_pct is not None and float(midpoint_gate_min_pct) <= 1e-12):
                return (
                    "체결 없음: 시그널 HOLD — 미들 대비 상승(매수) %·구간이 비어 있거나 잘못되었습니다. 거래 조건을 저장하세요."
                )
            mgp = float(midpoint_gate_min_pct or 0.0)
            if buy_gap_pct is not None and buy_gap_pct > 0.0001:
                return (
                    f"체결 없음: 시그널 HOLD — 구간 미들 대비 +{mgp:.2f}%p 이상일 때 매수 검토하며, "
                    f"매수 기준가까지 약 {buy_gap_pct:.2f}%p 더 올라와야 BUY가 됩니다."
                )
            return (
                f"체결 없음: 시그널 HOLD — 구간 미들 대비 +{mgp:.2f}%p 이상 상승해야 매수가 검토됩니다."
            )
        if drop is None:
            return (
                "체결 없음: 시그널 HOLD — 기간 고가 대비 하락(매수) 조건이 꺼져 있습니다. "
                "거래 조건에서 하락 %를 입력하면 매수가 검토됩니다."
            )
        if buy_gap_pct is not None and buy_gap_pct > 0.0001:
            return (
                f"체결 없음: 시그널 HOLD — 현재가가 매수 기준가보다 위입니다. "
                f"설정은 기준 고가({ref_ko}) 대비 {drop_req_pct:.2f}% 하락 시 매수이며, "
                f"매수 기준가까지 약 {buy_gap_pct:.2f}%p 더 내려와야 BUY가 됩니다."
            )
        return (
            f"체결 없음: 시그널 HOLD — 기준 고가({ref_ko}) 대비 {drop_req_pct:.2f}% 이상 하락해야 매수가 검토됩니다."
        )
    if sig == "HOLD" and base_free > 1e-12:
        return "체결 없음: 시그널 HOLD — 익절(평단 대비 상승%) 조건이 맞으면 매도 신호가 납니다."
    return ""


def _build_status_snapshot(
    *,
    scenario_id: str,
    scenario_name: str,
    symbol: str,
    base: str,
    quote: str,
    last: float,
    high_24h: float,
    reference_high: float,
    drop_reference_high: str,
    entry_price: float | None,
    sig: str,
    interval: int,
    buy_krw: float,
    bal: dict,
    strategy_cfg: dict,
    trading_enabled: bool,
    cooldown_active: bool,
    cooldown_remaining_sec: float,
    virtual_krw: float | None = None,
    midpoint_gate_level: float | None = None,
    midpoint_gate_min_pct: float | None = None,
) -> dict:
    bem = str(strategy_cfg.get("buy_entry_mode") or BUY_ENTRY_MODE_DROP).strip().lower()
    if bem not in (
        BUY_ENTRY_MODE_DROP,
        BUY_ENTRY_MODE_WATCH_SHARE,
        BUY_ENTRY_MODE_MIDPOINT_RISE,
    ):
        bem = BUY_ENTRY_MODE_DROP
    drop_raw = strategy_cfg.get("drop_from_high_pct")
    drop = float(drop_raw) if drop_raw is not None else None
    rise = float(strategy_cfg.get("rise_from_entry_pct") or 0.05)
    sl_raw = strategy_cfg.get("stop_loss_from_entry_pct")
    stop_loss_pct: float | None = None
    if sl_raw is not None and float(sl_raw) > 0:
        stop_loss_pct = float(sl_raw)
    qf, qu, qt = _balance_triple(bal, quote)
    bf, bu, bt = _balance_triple(bal, base)
    buy_gap_pct: float | None = None
    mgl_snap = midpoint_gate_level
    mgp_snap = midpoint_gate_min_pct
    if bem == BUY_ENTRY_MODE_MIDPOINT_RISE and bf <= 1e-12:
        if mgl_snap is not None and float(mgl_snap) > 1e-12 and mgp_snap is not None and float(mgp_snap) > 1e-12:
            ml = float(mgl_snap)
            gate_pp = float(mgp_snap)
            th_mid_buy = ml * (1.0 + gate_pp / 100.0)
            eps_m = max(1e-12, abs(ml) * 1e-10)
            if last + eps_m < th_mid_buy:
                buy_gap_pct = round((th_mid_buy - last) / ml * 100.0, 4)
            else:
                buy_gap_pct = 0.0
    elif reference_high > 1e-12 and bf <= 1e-12:
        if bem == BUY_ENTRY_MODE_WATCH_SHARE:
            th_price = reference_high * (1.0 + WATCH_POSITIVE_VS_REF_FIXED_PCT / 100.0)
            if last + 1e-9 < th_price:
                buy_gap_pct = round((th_price - last) / reference_high * 100.0, 4)
            else:
                buy_gap_pct = 0.0
        elif drop is not None:
            bt_price = reference_high * (1.0 - drop)
            eps = drop_from_high_epsilon(reference_high)
            if last > bt_price + eps:
                buy_gap_pct = round((last - bt_price) / reference_high * 100.0, 4)
            else:
                buy_gap_pct = 0.0
    if bem == BUY_ENTRY_MODE_WATCH_SHARE:
        buy_trigger_price = reference_high * (1.0 + WATCH_POSITIVE_VS_REF_FIXED_PCT / 100.0)
    elif bem == BUY_ENTRY_MODE_MIDPOINT_RISE:
        if mgl_snap is not None and mgp_snap is not None and float(mgl_snap) > 1e-12 and float(mgp_snap) > 1e-12:
            buy_trigger_price = float(mgl_snap) * (1.0 + float(mgp_snap) / 100.0)
        else:
            buy_trigger_price = None
    else:
        buy_trigger_price = reference_high * (1.0 - drop) if drop is not None else None
    hint = _trade_hint_ko(
        sig=sig,
        trading_enabled=trading_enabled,
        cooldown_active=cooldown_active,
        cooldown_remaining_sec=cooldown_remaining_sec,
        base_free=bf,
        reference_high=reference_high,
        last=last,
        drop=drop,
        buy_krw=buy_krw,
        quote_free=qf,
        virtual_krw=virtual_krw,
        buy_gap_pct=buy_gap_pct,
        drop_ref_label=drop_reference_high,
        buy_entry_mode=bem,
        watch_positive_gate_pct=WATCH_POSITIVE_VS_REF_FIXED_PCT,
        midpoint_gate_level=mgl_snap,
        midpoint_gate_min_pct=mgp_snap,
    )
    ep = float(entry_price) if entry_price is not None and entry_price > 0 else None
    stop_loss_trigger = ep * (1.0 - stop_loss_pct) if ep is not None and stop_loss_pct else None
    return {
        "ok": True,
        "scenario_id": scenario_id,
        "scenario_name": scenario_name,
        "symbol": symbol,
        "base": base,
        "quote": quote,
        "last": last,
        "high_24h": high_24h,
        "reference_high": reference_high,
        "drop_reference_high": drop_reference_high,
        "buy_trigger_price": buy_trigger_price,
        "sell_trigger_price": ep * (1.0 + rise) if ep is not None else None,
        "stop_loss_trigger_price": stop_loss_trigger,
        "signal": sig,
        "entry_price": entry_price,
        "quote_free": qf,
        "quote_total": qt,
        "base_free": bf,
        "base_used": bu,
        "base_total": bt,
        "loop_seconds": interval,
        "buy_krw_amount": buy_krw,
        "strategy": strategy_cfg,
        "trading_enabled": trading_enabled,
        "cooldown_active": cooldown_active,
        "cooldown_remaining_sec": cooldown_remaining_sec,
        "last_error": None,
        "drop_from_high_required_pct": round(drop * 100.0, 4)
        if bem == BUY_ENTRY_MODE_DROP and drop is not None
        else None,
        "watch_positive_gate_pct": WATCH_POSITIVE_VS_REF_FIXED_PCT
        if bem == BUY_ENTRY_MODE_WATCH_SHARE
        else None,
        "midpoint_gate_level": mgl_snap if bem == BUY_ENTRY_MODE_MIDPOINT_RISE else None,
        "midpoint_gate_min_pct": mgp_snap if bem == BUY_ENTRY_MODE_MIDPOINT_RISE else None,
        "buy_gap_pct": buy_gap_pct,
        "trade_hint_ko": hint,
    }


def _setup_logging() -> logging.Logger:
    """trading.log 파일 + 터미널(표준출력) 동시 로깅."""
    level_name = os.getenv("LOG_LEVEL", "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)

    log_file = os.getenv("TRADING_LOG_FILE", "trading.log").strip()
    log_path = Path(log_file) if os.path.isabs(log_file) else BASE_DIR / log_file

    logger = logging.getLogger("upbit-bot")
    logger.setLevel(level)
    logger.handlers.clear()
    logger.propagate = False

    file_fmt = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    console_fmt = logging.Formatter(
        fmt="%(asctime)s │ %(message)s",
        datefmt="%H:%M:%S",
    )

    fh = logging.FileHandler(log_path, encoding="utf-8")
    fh.setLevel(level)
    fh.setFormatter(file_fmt)

    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(level)
    ch.setFormatter(console_fmt)

    logger.addHandler(fh)
    logger.addHandler(ch)

    return logger


def _balance_detail(bal: dict, base: str, quote: str) -> str:
    """잔고 한 줄 요약 (free / total)."""

    def triple(code: str) -> tuple[float, float, float]:
        row = bal.get(code)
        if not isinstance(row, dict):
            return 0.0, 0.0, 0.0
        f = float(row.get("free") or 0)
        u = float(row.get("used") or 0)
        t = float(row.get("total") or 0)
        return f, u, t

    qf, qu, qt = triple(quote)
    bf, bu, bt = triple(base)
    return (
        f"{quote} free={qf:,.2f} total={qt:,.2f} | "
        f"{base} free={bf:.8f} total={bt:.8f} (주문중 {bu:.8f})"
    )


def _tick_block(
    symbol: str,
    last: float,
    reference_high: float,
    ref_label: str,
    entry_price: float | None,
    sig: str,
    bal_line: str,
) -> str:
    return (
        f"─── 시세 · 잔고 · 시그널 ───\n"
        f"  [{symbol}]  현재가 {last:,.0f}  /  기준고가({ref_label}) {reference_high:,.0f}\n"
        f"  잔고  {bal_line}\n"
        f"  매수평단 {entry_price if entry_price is not None else '—'}  →  시그널 ** {sig} **"
    )


def _trade_buy_block(
    symbol: str,
    order_id: str | None,
    fill_price: float,
    spent_krw: float,
    bal_line: str,
) -> str:
    return (
        f"★ 매수 체결 ★\n"
        f"  심볼 {symbol}  주문ID {order_id}  추정체결가 {fill_price:,.0f}  지출약 {spent_krw:,.0f} KRW\n"
        f"  잔고  {bal_line}"
    )


def _trade_sell_block(
    symbol: str,
    order_id: str | None,
    sold_amount: float,
    bal_line: str,
) -> str:
    return (
        f"★ 매도 체결 ★\n"
        f"  심볼 {symbol}  주문ID {order_id}  매도수량 {sold_amount:.8f}\n"
        f"  잔고  {bal_line}"
    )


def main() -> None:
    migrate_if_needed()
    log = _setup_logging()

    try:
        sl0 = load_scenarios_list()
        buy_krw0 = effective_buy_krw(sl0[0])
    except (ValueError, IndexError) as e:
        log.error("시나리오 설정 오류: %s", e)
        sys.exit(1)

    log_path = Path(os.getenv("TRADING_LOG_FILE", "trading.log").strip())
    if not log_path.is_absolute():
        log_path = BASE_DIR / log_path

    if buy_krw0 < 5000:
        log.warning(
            "업비트 원화 시장가 매수는 보통 최소 5,000원 이상입니다. BUY_KRW_AMOUNT 를 확인하세요."
        )

    try:
        ex = UpbitExchange()
        ex.load_markets()
    except RuntimeError as e:
        log.error("%s", e)
        sys.exit(1)
    except AuthenticationError as e:
        log.error("API 키/시크릿이 거부되었습니다. .env 의 UPBIT_* 를 확인하세요. (%s)", e)
        sys.exit(1)
    except (RequestTimeout, NetworkError, ExchangeNotAvailable) as e:
        log.error("시작 시 거래소 연결 실패(타임아웃/네트워크). 잠시 후 다시 실행하세요. (%s: %s)", type(e).__name__, e)
        sys.exit(1)
    except ExchangeError as e:
        log.error("마켓 정보 로드 실패: %s", e)
        sys.exit(1)

    log.info(
        "봇 시작 (다중 시나리오) | 시나리오 %d개 | 로그 %s",
        len(sl0),
        log_path,
    )

    last_snapshot: dict | None = None

    while True:
        interval = max(1, int(os.getenv("LOOP_SECONDS") or "60"))
        try:
            scenarios = load_scenarios_list()
            active = active_enabled_scenarios(scenarios)
            skipped_dup: list[dict[str, str]] = []
            interval = (
                global_loop_seconds(active)
                if active
                else max(1, int(os.getenv("LOOP_SECONDS") or "60"))
            )

            if not active:
                log.warning("활성 시나리오가 없습니다.")
                last_snapshot = {
                    "ok": True,
                    "mode": "multi",
                    "loop_seconds": max(1, interval),
                    "scenarios": [],
                    "skipped_duplicates": skipped_dup,
                    "message": "활성 시나리오 없음",
                    "last_error": None,
                }
                _write_status_json(STATUS_PATH, last_snapshot)
                time.sleep(max(1, interval))
                continue

            bal = ex.fetch_balance()
            snapshots: list[dict] = []
            tickers: dict[str, dict] = {}

            all_krw = ex.list_krw_symbols()
            rng = random.Random()
            rng.seed(time.time_ns() % (2**63))
            try:
                tickers_map = ex.exchange.fetch_tickers()
            except Exception as e:
                log.warning("fetch_tickers 실패 — 감시 스타일 필터 없이 진행: %s", e)
                tickers_map = {}
            watch_by_sid = assign_watch_symbols_per_loop(
                active, all_krw, rng, tickers_map, ex.exchange
            )
            ref_high_memo: dict[tuple, float] = {}

            for scen in active:
                sid = str(scen.get("id") or "")
                sname = str(scen.get("name") or "시나리오")
                strat_flat = scenario_to_flat(scen)
                trading_enabled = bool(scen.get("trading_enabled", True))
                cooldown_sec = int(scen.get("cooldown_seconds_after_trade") or 0)

                st_full = load_trader_runtime_state(sid, scen)
                positions: dict[str, dict] = dict(st_full["positions"])
                virtual_krw = st_full["virtual_krw"]

                symbols_loop = watch_by_sid.get(sid) or []
                ts_loop = str(scen.get("trading_style") or "trend_follow").strip().lower()
                if ts_loop == "volume_surge_chase":
                    bal, positions, virtual_krw, tickers = run_volume_surge_chase_scenario(
                        ex=ex,
                        scen=scen,
                        sid=sid,
                        sname=sname,
                        strat_flat=strat_flat,
                        all_krw=all_krw,
                        tickers_map=tickers_map,
                        tickers=tickers,
                        ref_high_memo=ref_high_memo,
                        bal=bal,
                        positions=positions,
                        virtual_krw=virtual_krw,
                        trading_enabled=trading_enabled,
                        cooldown_sec=cooldown_sec,
                        interval=interval,
                        log=log,
                        snapshots=snapshots,
                        build_status_snapshot=_build_status_snapshot,
                    )
                    continue
                if ts_loop == "bollinger_squeeze":
                    bal, positions, virtual_krw, tickers = run_bollinger_squeeze_scenario(
                        ex=ex,
                        scen=scen,
                        sid=sid,
                        sname=sname,
                        strat_flat=strat_flat,
                        all_krw=all_krw,
                        tickers_map=tickers_map,
                        tickers=tickers,
                        ref_high_memo=ref_high_memo,
                        bal=bal,
                        positions=positions,
                        virtual_krw=virtual_krw,
                        trading_enabled=trading_enabled,
                        cooldown_sec=cooldown_sec,
                        interval=interval,
                        log=log,
                        snapshots=snapshots,
                        build_status_snapshot=_build_status_snapshot,
                    )
                    continue
                if ts_loop == "scalp_flash":
                    bal, positions, virtual_krw, tickers = run_scalp_flash_scenario(
                        ex=ex,
                        scen=scen,
                        sid=sid,
                        sname=sname,
                        strat_flat=strat_flat,
                        all_krw=all_krw,
                        tickers_map=tickers_map,
                        tickers=tickers,
                        ref_high_memo=ref_high_memo,
                        bal=bal,
                        positions=positions,
                        virtual_krw=virtual_krw,
                        trading_enabled=trading_enabled,
                        cooldown_sec=cooldown_sec,
                        interval=interval,
                        log=log,
                        snapshots=snapshots,
                        build_status_snapshot=_build_status_snapshot,
                    )
                    continue

                bem = str(scen.get("buy_entry_mode") or BUY_ENTRY_MODE_DROP).strip().lower()
                if bem not in (
                    BUY_ENTRY_MODE_DROP,
                    BUY_ENTRY_MODE_WATCH_SHARE,
                    BUY_ENTRY_MODE_MIDPOINT_RISE,
                ):
                    bem = BUY_ENTRY_MODE_DROP
                drp_scen = scen.get("drop_from_high_pct") if bem == BUY_ENTRY_MODE_DROP else None
                _share_raw = scen.get("buy_min_watch_positive_share_pct")
                apply_share_gate = False
                share_min_f = 0.0
                if bem == BUY_ENTRY_MODE_WATCH_SHARE and _share_raw is not None and _share_raw != "":
                    try:
                        share_min_f = float(_share_raw)
                        if 0 < share_min_f <= 100:
                            apply_share_gate = True
                    except (TypeError, ValueError):
                        pass
                watch_pos_share, watch_pos_count, watch_pos_total, tier_map = (
                    _watch_positive_share_and_tiers(ex, scen, symbols_loop, tickers, ref_high_memo)
                )
                _share_gate_logged = False
                if scen.get("watch_random") and len(symbols_loop) < MIN_RANDOM_WATCH:
                    log.warning(
                        "[%s] 랜덤 감시 종목이 %d개뿐입니다(최소 %d 권장). 마켓 풀·다른 트레이더 점유를 확인하세요.",
                        sname,
                        len(symbols_loop),
                        MIN_RANDOM_WATCH,
                    )
                for symbol in symbols_loop:
                    base, quote = UpbitExchange.base_and_quote(symbol)
                    if symbol not in tickers:
                        tickers[symbol] = ex.fetch_ticker(symbol)
                    ticker = tickers[symbol]
                    last = float(ticker["last"] or 0)
                    high_24h = float(ticker.get("high") or last)
                    # 고가가 현재가보다 낮게 오는 경우(갱신 지연 등) 매수 기준이 비정상적으로 낮아지지 않게 맞춤
                    high_24h = max(high_24h, last)

                    ref_lbl = drop_ref_label_for_scenario(scen)
                    ref_high = cache_ref_high(ex.exchange, symbol, ticker, scen, ref_high_memo)

                    sym_p = positions.get(symbol) or {
                        "entry_price": None,
                        "last_trade_ts": None,
                    }
                    entry = sym_p.get("entry_price")
                    entry_price: float | None = float(entry) if isinstance(entry, (int, float)) else None

                    base_row = bal.get(base) if isinstance(bal.get(base), dict) else {}
                    base_free = float((base_row or {}).get("free") or 0)

                    if base_free > 1e-12 and entry_price is None:
                        fallback = os.getenv("ENTRY_PRICE_FALLBACK")
                        if fallback:
                            try:
                                entry_price = float(fallback)
                            except ValueError:
                                log.warning("[%s] ENTRY_PRICE_FALLBACK 가 숫자가 아닙니다.", sname)
                            else:
                                sym_p["entry_price"] = entry_price
                                positions[symbol] = sym_p
                                save_trader_runtime_state(
                                    sid, positions=positions, virtual_krw=virtual_krw
                                )
                                log.warning(
                                    "[%s | %s] 보유만 있고 매수가 없음 — ENTRY_PRICE_FALLBACK=%s",
                                    sname,
                                    symbol,
                                    entry_price,
                                )
                        else:
                            _k = (sid, symbol)
                            if _k not in _LOGGED_NO_ENTRY:
                                _LOGGED_NO_ENTRY.add(_k)
                                log.warning(
                                    "[%s | %s] 보유만 있고 매수가 기록 없음 — ENTRY_PRICE_FALLBACK 권장",
                                    sname,
                                    symbol,
                                )

                    lt_raw = sym_p.get("last_trade_ts")
                    cd_active = False
                    cd_rem = 0.0
                    if cooldown_sec > 0 and lt_raw is not None:
                        elapsed = time.time() - float(lt_raw)
                        if elapsed < cooldown_sec:
                            cd_active = True
                            cd_rem = float(cooldown_sec) - elapsed

                    can_trade = trading_enabled and not cd_active

                    mgp: float | None = None
                    mgl: float | None = None
                    if bem == BUY_ENTRY_MODE_MIDPOINT_RISE:
                        raw_mg = scen.get("drop_midpoint_gate_min_pct")
                        if raw_mg is not None and str(raw_mg).strip() != "":
                            try:
                                mgp = float(raw_mg)
                                if mgp > 1e-12:
                                    mw = normalize_midpoint_window(
                                        scen.get("drop_midpoint_gate_window") or "1h"
                                    )
                                    mgl = reference_midpoint_for_window(
                                        ex.exchange, symbol, mw, ticker
                                    )
                                else:
                                    mgp = None
                            except (TypeError, ValueError):
                                mgp = None
                                mgl = None

                    tle_raw = scen.get("time_limit_exit")
                    tle = tle_raw if isinstance(tle_raw, dict) else {}
                    tle_enabled = bool(tle.get("enabled")) and ts_loop == TRADING_STYLE_TREND_FOLLOW
                    tl_code = ""
                    if base_free > 1e-12 and entry_price is not None and tle_enabled:
                        lth = float(tle.get("loss_branch_threshold_pct") or -0.0001)
                        pnl_frac_arm = float(last) / float(entry_price) - 1.0
                        if pnl_frac_arm <= lth:
                            newly_armed = not sym_p.get("tl_loss_armed")
                            sym_p["tl_loss_armed"] = True
                            positions[symbol] = sym_p
                            if newly_armed:
                                save_trader_runtime_state(
                                    sid, positions=positions, virtual_krw=virtual_krw
                                )
                        loss_armed = bool(sym_p.get("tl_loss_armed"))
                        sig, tl_code = time_limit_exit_signal(
                            last=last,
                            entry_price=float(entry_price),
                            base_free=base_free,
                            now_ts=time.time(),
                            entry_ts=float(lt_raw) if lt_raw is not None else None,
                            rise_from_entry_pct=float(scen.get("rise_from_entry_pct") or 0.05),
                            stop_loss_from_entry_pct=scen.get("stop_loss_from_entry_pct"),
                            tl=tle,
                            loss_armed=loss_armed,
                        )
                    else:
                        sig = evaluate_signal(
                            reference_high=ref_high,
                            last=last,
                            entry_price=entry_price,
                            base_free=base_free,
                            drop_from_high_pct=float(drp_scen) if drp_scen is not None else None,
                            rise_from_entry_pct=float(scen.get("rise_from_entry_pct") or 0.05),
                            stop_loss_from_entry_pct=scen.get("stop_loss_from_entry_pct"),
                            buy_using_watch_positive=(bem == BUY_ENTRY_MODE_WATCH_SHARE),
                            watch_positive_vs_ref_pct=WATCH_POSITIVE_VS_REF_FIXED_PCT,
                            buy_using_midpoint_rise_only=(bem == BUY_ENTRY_MODE_MIDPOINT_RISE),
                            midpoint_gate_level=mgl,
                            midpoint_gate_min_pct=mgp,
                        )

                    bal_line = _balance_detail(bal, base, quote)
                    vk_note = ""
                    if virtual_krw is not None:
                        vk_note = f" | 가상배정원화 {virtual_krw:,.0f}"
                    log.info(
                        "[%s | %s] %s%s",
                        sname,
                        symbol,
                        _tick_block(symbol, last, ref_high, ref_lbl, entry_price, sig, bal_line).replace(
                            "\n", " / "
                        ),
                        vk_note,
                    )

                    latest_bal = bal

                    if sig == "BUY" and base_free <= 1e-12 and not can_trade:
                        _k = (sid, symbol)
                        if not trading_enabled:
                            if _k not in _LOGGED_TRADING_DISABLED:
                                _LOGGED_TRADING_DISABLED.add(_k)
                                log.warning(
                                    "[%s | %s] 매수 신호지만 자동매매(trading_enabled)가 꺼져 있어 주문을 보내지 않습니다. "
                                    "대시보드에서 업무시작을 눌러 주세요.",
                                    sname,
                                    symbol,
                                )
                        elif cd_active:
                            log.info(
                                "[%s | %s] 매수 신호지만 쿨다운 %.0f초 남음 — 주문 생략",
                                sname,
                                symbol,
                                cd_rem,
                            )
                    elif sig == "SELL" and base_free > 1e-12 and not can_trade:
                        _k = (sid, symbol)
                        if not trading_enabled:
                            if _k not in _LOGGED_TRADING_DISABLED:
                                _LOGGED_TRADING_DISABLED.add(_k)
                                log.warning(
                                    "[%s | %s] 매도 신호지만 자동매매(trading_enabled)가 꺼져 있어 주문을 보내지 않습니다. "
                                    "대시보드에서 업무시작을 눌러 주세요.",
                                    sname,
                                    symbol,
                                )
                        elif cd_active:
                            log.info(
                                "[%s | %s] 매도 신호지만 쿨다운 %.0f초 남음 — 주문 생략",
                                sname,
                                symbol,
                                cd_rem,
                            )

                    if sig == "BUY" and base_free <= 1e-12 and can_trade:
                        tier = tier_map.get(symbol, "middle")
                        krw_free = UpbitExchange.free_quote(bal, quote)
                        buy_krw = buy_krw_for_tier(
                            scen,
                            tier,
                            quote_free_krw=krw_free,
                            virtual_krw=virtual_krw,
                        )
                        if (
                            apply_share_gate
                            and watch_pos_total > 0
                            and watch_pos_share + 1e-9 < share_min_f
                        ):
                            if not _share_gate_logged:
                                log.info(
                                    "[%s] 감시 플러스 비중 %.2f%% (%d/%d, 기준 고가 대비 ≥%.4f%%) < 설정 %.2f%% — 이번 루프 매수 생략",
                                    sname,
                                    watch_pos_share,
                                    watch_pos_count,
                                    watch_pos_total,
                                    WATCH_POSITIVE_VS_REF_FIXED_PCT,
                                    share_min_f,
                                )
                                _share_gate_logged = True
                        elif buy_krw + 1e-9 < MIN_MARKET_BUY_KRW:
                            log.info(
                                "[%s | %s] %s 순위 매수액 %.0f원(최소 %.0f원 미만) — 생략",
                                sname,
                                symbol,
                                tier,
                                buy_krw,
                                MIN_MARKET_BUY_KRW,
                            )
                        elif virtual_krw is not None and virtual_krw < buy_krw:
                            log.warning(
                                "[%s | %s] 퀀트트레이더 부여 자산(가상 KRW) 부족 — 필요 %s, 남음 %s",
                                sname,
                                symbol,
                                f"{buy_krw:,.0f}",
                                f"{virtual_krw:,.2f}",
                            )
                        elif krw_free < buy_krw:
                            log.warning(
                                "[%s | %s] KRW 부족 — 필요 약 %s, 사용가능 %s",
                                sname,
                                symbol,
                                f"{buy_krw:,.0f}",
                                f"{krw_free:,.2f}",
                            )
                        else:
                            try:
                                order = ex.market_buy_krw(symbol, buy_krw)
                            except InsufficientFunds as e:
                                log.error("[%s | %s] 매수 실패(잔고): %s", sname, symbol, e)
                            except InvalidOrder as e:
                                log.error("[%s | %s] 매수 실패(거절): %s", sname, symbol, e)
                            except (RequestTimeout, NetworkError, ExchangeNotAvailable) as e:
                                log.warning("[%s | %s] 매수 네트워크 오류: %s", sname, symbol, e)
                            except ExchangeError as e:
                                log.error("[%s | %s] 매수 실패: %s", sname, symbol, e)
                            else:
                                avg = UpbitExchange.average_fill_price(order)
                                fill = avg if avg is not None else last
                                sym_p["entry_price"] = fill
                                sym_p["last_trade_ts"] = time.time()
                                positions[symbol] = sym_p
                                if virtual_krw is not None:
                                    virtual_krw = max(0.0, float(virtual_krw) - buy_krw)
                                save_trader_runtime_state(
                                    sid, positions=positions, virtual_krw=virtual_krw
                                )

                                filled_amt = float(order.get("filled") or 0)
                                if filled_amt <= 0:
                                    filled_amt = buy_krw / max(fill, 1e-12)
                                append_trade(
                                    {
                                        "side": "buy",
                                        "scenario_id": sid,
                                        "scenario_name": sname,
                                        "symbol": symbol,
                                        "price": fill,
                                        "amount_base": filled_amt,
                                        "cost_krw": buy_krw,
                                        "order_id": str(order.get("id") or ""),
                                        "cond_summary_ko": cond_summary_ko_trend_buy(
                                            buy_entry_mode=bem,
                                            drop_reference_high=ref_lbl,
                                            drop_from_high_pct=float(drp_scen)
                                            if drp_scen is not None
                                            else None,
                                        ),
                                        "trade_reason_ko": buy_reason_trend_follow(
                                            scenario_name=sname,
                                            scenario_id=sid,
                                            symbol=symbol,
                                            buy_entry_mode=bem,
                                            drop_reference_high=ref_lbl,
                                            reference_high=mgl
                                            if bem == BUY_ENTRY_MODE_MIDPOINT_RISE and mgl is not None
                                            else ref_high,
                                            last=last,
                                            drop_from_high_pct=float(drp_scen)
                                            if drp_scen is not None
                                            else None,
                                            tier=tier,
                                            buy_krw=buy_krw,
                                            watch_positive_gate_pct=WATCH_POSITIVE_VS_REF_FIXED_PCT,
                                            midpoint_gate_min_pct=mgp
                                            if bem == BUY_ENTRY_MODE_MIDPOINT_RISE
                                            else None,
                                        ),
                                    }
                                )

                                bal = ex.fetch_balance()
                                latest_bal = bal
                                bal_line_after = _balance_detail(bal, base, quote)
                                log.info(
                                    _trade_buy_block(
                                        symbol,
                                        str(order.get("id"))
                                        if order.get("id") is not None
                                        else None,
                                        fill,
                                        buy_krw,
                                        bal_line_after,
                                    )
                                )

                    elif sig == "SELL" and base_free > 1e-12 and can_trade:
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
                            sym_p.pop("tl_loss_armed", None)
                            positions[symbol] = sym_p
                            if virtual_krw is not None:
                                virtual_krw = float(virtual_krw) + proceeds
                            save_trader_runtime_state(
                                sid, positions=positions, virtual_krw=virtual_krw
                            )

                            sell_reason_ko = sell_reason_trend_follow_auto(
                                scenario_name=sname,
                                scenario_id=sid,
                                symbol=symbol,
                                scenario=scen,
                                entry_price=ep_before,
                                sell_price=float(avg_sell),
                                tl_code=tl_code if tle_enabled else "",
                            )
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
                                    "trade_reason_ko": sell_reason_ko,
                                }
                            )

                            bal = ex.fetch_balance()
                            latest_bal = bal
                            bal_line_after = _balance_detail(bal, base, quote)
                            log.info(
                                _trade_sell_block(
                                    symbol,
                                    str(order.get("id"))
                                    if order.get("id") is not None
                                    else None,
                                    sold,
                                    bal_line_after,
                                )
                            )

                    sym_row = positions.get(symbol) or sym_p
                    e_st = sym_row.get("entry_price")
                    ep_snap: float | None = float(e_st) if isinstance(e_st, (int, float)) else None
                    lt_f = sym_row.get("last_trade_ts")
                    cooldown_active_snap = False
                    cooldown_remaining_snap = 0.0
                    if cooldown_sec > 0 and lt_f is not None:
                        elapsed = time.time() - float(lt_f)
                        if elapsed < cooldown_sec:
                            cooldown_active_snap = True
                            cooldown_remaining_snap = float(cooldown_sec) - elapsed

                    tier_snap = tier_map.get(symbol, "middle")
                    krw_snap_free = UpbitExchange.free_quote(latest_bal, quote)
                    buy_krw_snap = buy_krw_for_tier(
                        scen,
                        tier_snap,
                        quote_free_krw=krw_snap_free,
                        virtual_krw=virtual_krw,
                    )
                    snap = _build_status_snapshot(
                        scenario_id=sid,
                        scenario_name=sname,
                        symbol=symbol,
                        base=base,
                        quote=quote,
                        last=last,
                        high_24h=high_24h,
                        reference_high=ref_high,
                        drop_reference_high=ref_lbl,
                        entry_price=ep_snap,
                        sig=sig,
                        interval=interval,
                        buy_krw=buy_krw_snap,
                        bal=latest_bal,
                        strategy_cfg=strat_flat,
                        trading_enabled=trading_enabled,
                        cooldown_active=cooldown_active_snap,
                        cooldown_remaining_sec=cooldown_remaining_snap,
                        virtual_krw=virtual_krw,
                        midpoint_gate_level=mgl if bem == BUY_ENTRY_MODE_MIDPOINT_RISE else None,
                        midpoint_gate_min_pct=mgp if bem == BUY_ENTRY_MODE_MIDPOINT_RISE else None,
                    )
                    snap["virtual_krw"] = virtual_krw
                    snap["buy_tier"] = tier_snap
                    snapshots.append(snap)

            last_snapshot = {
                "ok": True,
                "mode": "multi",
                "loop_seconds": interval,
                "scenarios": snapshots,
                "skipped_duplicates": skipped_dup,
                "last_error": None,
            }
            _write_status_json(STATUS_PATH, last_snapshot)

        except KeyboardInterrupt:
            log.info("사용자 종료 (KeyboardInterrupt)")
            sys.exit(0)
        except RateLimitExceeded as e:
            log.warning("API 요청 한도 초과 — 잠시 대기 후 재시도합니다. (%s)", e)
            _write_status_json(STATUS_PATH, _merge_status_error(last_snapshot, f"RateLimit: {e}"))
        except AuthenticationError as e:
            log.error("API 인증 실패 — 키·권한·IP 제한을 확인하세요. (%s)", e)
            _write_status_json(STATUS_PATH, _merge_status_error(last_snapshot, f"Authentication: {e}"))
        except (RequestTimeout, NetworkError, ExchangeNotAvailable) as e:
            log.warning(
                "시세/잔고 조회 중 네트워크 오류(%s): %s — 다음 주기까지 대기",
                type(e).__name__,
                e,
            )
            _write_status_json(
                STATUS_PATH,
                _merge_status_error(last_snapshot, f"{type(e).__name__}: {e}"),
            )
        except ExchangeError as e:
            log.error("시세/잔고 조회 실패(거래소 오류): %s — 다음 주기까지 대기", e)
            _write_status_json(STATUS_PATH, _merge_status_error(last_snapshot, f"Exchange: {e}"))
        except Exception as e:
            log.exception("예상치 못한 오류 — 다음 주기까지 대기")
            _write_status_json(STATUS_PATH, _merge_status_error(last_snapshot, f"{type(e).__name__}: {e}"))

        time.sleep(max(1, interval))


if __name__ == "__main__":
    main()
