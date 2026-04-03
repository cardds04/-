#!/usr/bin/env python3
"""
실시간 모니터링 웹 대시보드.

main.py 가 같은 디렉터리에서 실행되며 status.json 을 갱신할 때 브라우저에서 확인합니다.

  uvicorn dashboard:app --host 127.0.0.1 --port 8765

또는: python dashboard.py

개발 시 자동 재시작: ./dev_dashboard.sh  (또는 DASHBOARD_RELOAD=1 python3 dashboard.py)
"""

from __future__ import annotations

import json
import os
import random
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any

import ccxt
from dotenv import load_dotenv
from fastapi import FastAPI, Query, Request
from fastapi.responses import FileResponse, JSONResponse
from starlette.middleware.gzip import GZipMiddleware

from exchange_helper import UpbitExchange, list_krw_market_symbols
from pending_market_confirm import execute_immediate_buy
from reference_high import normalize_drop_reference_high, reference_high_for_drop
from reference_midpoint import normalize_midpoint_window, reference_midpoint_for_window
from scenario_performance import build_scenario_performance_list, invalidate_krw_price_cache
from scenarios import (
    active_enabled_scenarios,
    add_scenario,
    assign_watch_symbols_per_loop,
    effective_buy_krw,
    effective_watch_symbols,
    get_dashboard_default_scenario_id,
    default_symbol_for_manual_buy,
    describe_effective_buy_krw,
    get_scenario_by_id,
    load_scenarios_list,
    load_trader_runtime_state,
    manual_order_auto_buy_text,
    manual_order_auto_sell_text,
    manual_order_watch_summary,
    migrate_if_needed,
    patch_scenario,
    remove_scenario,
    save_scenarios_list,
    save_trader_runtime_state,
    set_dashboard_default_scenario_id,
    validate_scenario_dict,
    validate_scenario_patch,
)


def _resolve_symbol_for_manual_buy(scen: dict[str, Any], body_symbol: Any) -> str:
    """즉시 매수 종목: 본문 symbol 이 있으면 그것, 없으면 감시 목록 첫 종목 또는 trading_symbol."""
    raw = (body_symbol or "").strip().upper() if isinstance(body_symbol, str) else ""
    if raw:
        return validate_scenario_patch({"trading_symbol": raw})["trading_symbol"]
    ws = effective_watch_symbols(scen)
    if ws:
        return ws[0]
    ts = scen.get("trading_symbol") or "BTC/KRW"
    return validate_scenario_patch({"trading_symbol": str(ts)})["trading_symbol"]


def _sum_allocated_krw_from_scenarios() -> float:
    migrate_if_needed()
    total = 0.0
    for s in load_scenarios_list():
        ak = s.get("allocated_krw")
        if ak is None or ak == "":
            continue
        try:
            total += float(ak)
        except (TypeError, ValueError):
            continue
    return total
from strategy_config import load_strategy_config, save_strategy_config
from strategy_chat import process_chat_request, process_trader_chat_request
from trade_fifo import fifo_remaining_lots_for_symbol as _fifo_remaining_lots_for_symbol
from trade_fifo import merge_lots_by_scenario as _merge_lots_by_scenario
from trade_log import append_trade, compute_stats, read_trades
from trade_reason import (
    cond_summary_ko_trend_buy,
    reason_manual_dashboard_buy,
    reason_manual_dashboard_limit_buy,
)


def _enrich_holdings_attrib(
    holdings: list[dict[str, Any]], trades: list[dict[str, Any]], scenarios: list[dict[str, Any]]
) -> None:
    """각 코인 보유에 체결 이력(FIFO) 기준 시나리오 귀속·비중을 붙입니다."""
    sid_to = {str(s.get("id")): s for s in scenarios if s.get("id") is not None}

    def _preview(txt: Any, n: int = 500) -> str:
        s = str(txt or "").strip()
        if len(s) <= n:
            return s
        return s[: n] + "…"

    for h in holdings:
        c = str(h.get("currency") or "").strip().upper()
        if c == "KRW":
            h["attrib"] = None
            continue
        try:
            total = float(h.get("total") or 0)
        except (TypeError, ValueError):
            total = 0.0
        sym = f"{c}/KRW"
        raw = _fifo_remaining_lots_for_symbol(trades, sym)
        merged = _merge_lots_by_scenario(raw)
        sum_l = sum(float(x.get("qty") or 0) for x in merged)
        if total > sum_l + 1e-8:
            merged.append(
                {
                    "scenario_id": "",
                    "scenario_name": "기록·외부 매수",
                    "qty": total - sum_l,
                }
            )
        for m in merged:
            q = float(m.get("qty") or 0)
            m["share_pct"] = round(100.0 * q / total, 1) if total > 1e-12 else 0.0
            sid = str(m.get("scenario_id") or "").strip()
            sc = sid_to.get(sid) if sid else None
            if sc:
                if not m.get("scenario_name"):
                    m["scenario_name"] = str(sc.get("name") or "").strip() or "—"
                m["strategy_text_preview"] = _preview(sc.get("strategy_text"))
                m["trader_style_preview"] = _preview(sc.get("trader_style"), 200)
                img = sc.get("avatar_image_data")
                m["avatar_image_data"] = img if isinstance(img, str) and img.startswith("data:image/") else None
            else:
                m["trader_style_preview"] = ""
                m["avatar_image_data"] = None
                if sid and not m.get("scenario_name"):
                    m["scenario_name"] = "(삭제된 시나리오)"
                    m["strategy_text_preview"] = ""
                elif not sid and str(m.get("scenario_name") or "") == "기록·외부 매수":
                    m["strategy_text_preview"] = (
                        "봇 체결 기록으로 설명되지 않는 잔여 수량입니다. "
                        "외부 입금·직접 매수·기록 이전 보유 등일 수 있습니다."
                    )
                else:
                    m["strategy_text_preview"] = ""
        merged.sort(key=lambda x: float(x.get("qty") or 0), reverse=True)
        h["attrib"] = merged


def _round_target_price_krw(p: float) -> float:
    if p >= 1:
        return round(p, 0)
    if p >= 0.01:
        return round(p, 4)
    return round(p, 8)


def _enrich_holdings_targets(
    holdings: list[dict[str, Any]],
    scenarios: list[dict[str, Any]],
    fallback_scenario_id: str | None = None,
) -> None:
    """
    평단 × 시나리오 익절/손절 비율로 목표가(원) 추정.
    귀속(attrib) 수량이 가장 큰 트레이더 설정을 쓰고, 없으면 쿼리로 준 scenario_id(선택 썸네일)로 대체합니다.
    """
    sid_to = {str(s.get("id")): s for s in scenarios if s.get("id") is not None}
    fb = str(fallback_scenario_id or "").strip()

    for h in holdings:
        c = str(h.get("currency") or "").strip().upper()
        if c == "KRW":
            h["targets"] = None
            continue
        ab = h.get("avg_buy_krw")
        try:
            abf = float(ab) if ab is not None and ab != "" else None
        except (TypeError, ValueError):
            abf = None
        if abf is None or abf <= 0:
            h["targets"] = {
                "tp_krw": None,
                "sl_krw": None,
                "basis": "no_avg",
                "scenario_name": None,
                "scenario_id": None,
            }
            continue

        attrib = list(h.get("attrib") or [])
        ranked = sorted(
            [x for x in attrib if str(x.get("scenario_id") or "").strip()],
            key=lambda x: float(x.get("qty") or 0),
            reverse=True,
        )
        primary_sid = str(ranked[0].get("scenario_id") or "").strip() if ranked else ""

        scen = sid_to.get(primary_sid) if primary_sid else None
        basis = "attrib"
        if scen is None and fb and fb in sid_to:
            scen = sid_to[fb]
            basis = "selected"

        if scen is None:
            h["targets"] = {
                "tp_krw": None,
                "sl_krw": None,
                "basis": "no_scenario",
                "scenario_name": None,
                "scenario_id": None,
            }
            continue

        rise = float(scen.get("rise_from_entry_pct") or 0.05)
        sl_raw = scen.get("stop_loss_from_entry_pct")
        tp = _round_target_price_krw(abf * (1.0 + rise))
        slv: float | None = None
        if sl_raw is not None and str(sl_raw).strip() != "":
            try:
                slp = float(sl_raw)
                slv = _round_target_price_krw(abf * (1.0 - slp))
            except (TypeError, ValueError):
                slv = None

        try:
            tot_q = float(h.get("total") or 0)
        except (TypeError, ValueError):
            tot_q = 0.0
        exp_profit: float | None = None
        if tot_q > 0:
            exp_profit = round((tp - abf) * tot_q, 0)

        h["targets"] = {
            "tp_krw": tp,
            "sl_krw": slv,
            "expected_profit_krw": exp_profit,
            "rise_from_entry_pct": rise,
            "stop_loss_from_entry_pct": float(sl_raw) if sl_raw is not None else None,
            "scenario_id": str(scen.get("id") or ""),
            "scenario_name": str(scen.get("name") or "—"),
            "basis": basis,
        }

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

load_dotenv()

from runtime_credentials import apply_runtime_credentials, credentials_status, save_runtime_credentials

apply_runtime_credentials()

BASE_DIR = Path(__file__).resolve().parent
STATUS_PATH = BASE_DIR / "status.json"
STATIC_DIR = BASE_DIR / "static"

# 공개 KRW 마켓 전종목 시세 (대시보드 목록용, 짧게 캐시)
_KRW_MARKET_CACHE: dict[str, Any] = {"ts": 0.0, "rows": [], "err": None, "change_ref": "24h"}
# 24h 티커 경로: 짧으면 클라 폴링마다 캐시 미스로 전종목 fetch_tickers 반복 → 부하·지연
_KRW_MARKET_TTL_SEC = 28.0
_KRW_MARKET_TTL_OHLCV_SEC = 45.0
_KRW_REF_HIGH_BATCH_MAX = 80
_ALLOWED_KRW_CHANGE_REF = frozenset({"24h", "12h", "6h", "3h", "1h"})
_KRW_CHANGE_REF_HOURS = {"24h": 24, "12h": 12, "6h": 6, "3h": 3, "1h": 1}

app = FastAPI(title="업비트 봇 콘솔", docs_url=None, redoc_url=None)
# 시나리오 JSON에 프로필 이미지(base64)가 있으면 응답이 매우 커짐 → gzip으로 전송량 축소
app.add_middleware(GZipMiddleware, minimum_size=800)

_MANUAL_LIMIT_MIN_KRW = 5000.0


def _float_safe(v: Any) -> float:
    try:
        if v is None:
            return 0.0
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def _ccxt_upbit_public():
    """공개 시세용(키 불필요). 네트워크 지연 대비 타임아웃."""
    ms = int(os.getenv("UPBIT_PUBLIC_TIMEOUT_MS", "45000"))
    return ccxt.upbit({"enableRateLimit": True, "timeout": ms})


# 차트·반복 폴링마다 fetch_ohlcv 를 때리면 업비트 속도 제한·타임아웃으로 502 가 잦음 → 짧게 캐시
_OHLCV_EX: Any = None
_OHLCV_EX_LOCK = threading.Lock()
_OHLCV_CACHE: dict[tuple[str, str, int], tuple[float, list[Any]]] = {}
_OHLCV_CACHE_LOCK = threading.Lock()
_OHLCV_CACHE_MAX_KEYS = 64
_OHLCV_CACHE_TTL_SEC = float(os.getenv("OHLCV_CACHE_TTL_SEC", "12"))


def _upbit_public_exchange_singleton() -> Any:
    """load_markets 는 1회만 (요청마다 새 ccxt 인스턴스를 만들지 않음)."""
    global _OHLCV_EX
    with _OHLCV_EX_LOCK:
        if _OHLCV_EX is None:
            ex = _ccxt_upbit_public()
            ex.load_markets()
            _OHLCV_EX = ex
        return _OHLCV_EX


def _ohlcv_cached_get(key: tuple[str, str, int]) -> list[Any] | None:
    now = time.time()
    with _OHLCV_CACHE_LOCK:
        hit = _OHLCV_CACHE.get(key)
        if hit and now - hit[0] < _OHLCV_CACHE_TTL_SEC:
            return hit[1]
    return None


def _ohlcv_cached_set(key: tuple[str, str, int], ohlcv: list[Any]) -> None:
    now = time.time()
    with _OHLCV_CACHE_LOCK:
        if len(_OHLCV_CACHE) >= _OHLCV_CACHE_MAX_KEYS:
            oldest = min(_OHLCV_CACHE, key=lambda k: _OHLCV_CACHE[k][0])
            _OHLCV_CACHE.pop(oldest, None)
        _OHLCV_CACHE[key] = (now, ohlcv)


def _krw_market_rows_fresh() -> tuple[list[dict[str, Any]], str | None]:
    """공개 CCXT 업비트로 KRW 마켓 전체 시세. (rows, error)."""
    try:
        ex = _ccxt_upbit_public()
        ex.load_markets()
        syms = list_krw_market_symbols(ex)
        tickers = ex.fetch_tickers(syms)
    except Exception as e:
        return [], str(e)

    rows: list[dict[str, Any]] = []
    for sym in syms:
        t = tickers.get(sym)
        if not isinstance(t, dict):
            continue
        last = _float_safe(t.get("last"))
        if last <= 0:
            continue
        high_24h = _float_safe(t.get("high"))
        base = sym.split("/")[0] if "/" in sym else sym
        qv = _float_safe(t.get("quoteVolume"))
        op = _float_safe(t.get("open"))
        pct: float | None = None
        if op > 0:
            pct = (last - op) / op * 100.0
        else:
            raw_pct = t.get("percentage")
            if raw_pct is not None:
                try:
                    p = float(raw_pct)
                    # CCXT/업비트에 따라 소수 비율(0.01≈1%)로 올 때가 있음
                    pct = p * 100.0 if abs(p) < 1.0 else p
                except (TypeError, ValueError):
                    pct = None
        rows.append(
            {
                "symbol": sym,
                "base": base,
                "last": last,
                "high_24h": high_24h if high_24h > 0 else None,
                "change_pct": pct,
                "volume_krw": qv,
            }
        )
    rows.sort(key=lambda r: -_float_safe(r.get("volume_krw")))
    return rows, None


def _normalize_krw_change_ref(raw: str | None) -> str:
    t = (raw or "24h").strip().lower()
    return t if t in _ALLOWED_KRW_CHANGE_REF else "24h"


def _rolling_pct_from_1h_candles(ohlcv: list, hours: int, last: float) -> float | None:
    """1시간봉 종가 기준: 약 `hours`시간 전 종가 대비 현재가 등락률(%)."""
    if hours < 1 or not ohlcv:
        return None
    n = len(ohlcv)
    idx = -(hours + 1)
    if abs(idx) > n:
        return None
    try:
        ref_close = float(ohlcv[idx][4])
    except (IndexError, TypeError, ValueError):
        return None
    if ref_close <= 0:
        return None
    return (last - ref_close) / ref_close * 100.0


def _worker_krw_ohlcv_batch(entries: list[tuple[str, float]], hours: int) -> dict[str, float | None]:
    """배치당 CCXT 인스턴스 하나로 심볼별 1h OHLCV 순차 조회 (레이트리밋·연결 부하 완화)."""
    out: dict[str, float | None] = {}
    if hours < 1 or hours > 48 or not entries:
        return out
    need = max(30, hours + 5)
    lim = min(200, need)
    try:
        ex = _ccxt_upbit_public()
    except Exception:
        for sym, _ in entries:
            out[sym] = None
        return out
    for sym, last in entries:
        try:
            ohlcv = ex.fetch_ohlcv(sym, "1h", limit=lim)
            out[sym] = _rolling_pct_from_1h_candles(ohlcv, hours, last)
        except Exception:
            out[sym] = None
    return out


def _apply_rolling_change_pct_from_1h(rows: list[dict[str, Any]], hours: int) -> None:
    """티커 기반 change_pct 를 1시간봉 롤링 등락률로 덮어씁니다 (24h 제외 시)."""
    if hours < 1 or hours > 48:
        return
    entries: list[tuple[str, float]] = []
    for r in rows:
        sym = r.get("symbol")
        last = r.get("last")
        if not sym or last is None:
            continue
        try:
            lf = float(last)
        except (TypeError, ValueError):
            continue
        if lf <= 0:
            continue
        entries.append((str(sym), lf))
    if not entries:
        return
    batch_size = max(8, min(40, int(os.getenv("KRW_OHLCV_BATCH", "28"))))
    max_workers = max(2, min(8, int(os.getenv("KRW_OHLCV_WORKERS", "6"))))
    batches = [entries[i : i + batch_size] for i in range(0, len(entries), batch_size)]
    pct_by_sym: dict[str, float | None] = {}
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        futs = [pool.submit(_worker_krw_ohlcv_batch, b, hours) for b in batches]
        for fut in as_completed(futs):
            pct_by_sym.update(fut.result())
    for r in rows:
        sym = r.get("symbol")
        if sym in pct_by_sym:
            r["change_pct"] = pct_by_sym[sym]


@app.get("/api/krw-market")
def api_krw_market(change_ref: str | None = None):
    """KRW 마켓 전종목 시세(공개 API). change_ref: 24h(티커) / 12h·6h·3h·1h(1시간봉 롤링)."""
    cref = _normalize_krw_change_ref(change_ref)
    now = time.monotonic()
    cache = _KRW_MARKET_CACHE
    ttl = _KRW_MARKET_TTL_SEC if cref == "24h" else _KRW_MARKET_TTL_OHLCV_SEC
    if (
        cache["rows"]
        and str(cache.get("change_ref") or "24h") == cref
        and (now - float(cache["ts"])) < ttl
    ):
        return {
            "ok": True,
            "rows": cache["rows"],
            "cached": True,
            "error": cache.get("err"),
            "change_ref": cref,
        }
    rows, err = _krw_market_rows_fresh()
    if err and not rows:
        return JSONResponse(
            {"ok": False, "rows": [], "error": err, "change_ref": cref},
            status_code=502,
        )
    hours = _KRW_CHANGE_REF_HOURS.get(cref, 24)
    if cref != "24h" and rows:
        _apply_rolling_change_pct_from_1h(rows, hours)
    cache["ts"] = now
    cache["rows"] = rows
    cache["err"] = None if rows else err
    cache["change_ref"] = cref
    return {"ok": True, "rows": rows, "cached": False, "error": None, "change_ref": cref}


@app.post("/api/krw-reference-highs")
async def api_krw_reference_highs(request: Request):
    """
    선택한 고가 기준 기간(ref)에 따른 종목별 기준 고가.
    배치당 최대 _KRW_REF_HIGH_BATCH_MAX 개 — 클라이언트가 나누어 호출합니다.
    """
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"ok": False, "error": "JSON 본문이 필요합니다."}, status_code=400)
    ref = normalize_drop_reference_high(body.get("ref"))
    kind = str(body.get("reference_price_kind") or "high").strip().lower()
    raw_syms = body.get("symbols")
    if not isinstance(raw_syms, list) or not raw_syms:
        return JSONResponse({"ok": False, "error": "symbols 배열이 필요합니다."}, status_code=400)
    symbols: list[str] = []
    for x in raw_syms[:_KRW_REF_HIGH_BATCH_MAX]:
        if isinstance(x, str) and x.strip():
            symbols.append(x.strip().upper())
    if not symbols:
        return JSONResponse({"ok": False, "error": "유효한 심볼이 없습니다."}, status_code=400)
    try:
        ex = _ccxt_upbit_public()
        ex.load_markets()
        try:
            tickers = ex.fetch_tickers(symbols)
        except Exception:
            tickers = {}
            for sym in symbols:
                try:
                    tickers[sym] = ex.fetch_ticker(sym)
                except Exception:
                    continue
        highs: dict[str, float] = {}
        if kind == "midpoint":
            mw = normalize_midpoint_window(body.get("midpoint_window"))
            for sym in symbols:
                t = tickers.get(sym)
                if not isinstance(t, dict):
                    continue
                try:
                    highs[sym] = float(reference_midpoint_for_window(ex, sym, mw, t))
                except Exception:
                    last = _float_safe(t.get("last"))
                    highs[sym] = last
            return {
                "ok": True,
                "ref": ref,
                "reference_price_kind": "midpoint",
                "midpoint_window": mw,
                "highs": highs,
            }
        for sym in symbols:
            t = tickers.get(sym)
            if not isinstance(t, dict):
                continue
            try:
                highs[sym] = float(reference_high_for_drop(ex, sym, ref, t))
            except Exception:
                last = _float_safe(t.get("last"))
                h = _float_safe(t.get("high"))
                highs[sym] = max(h if h > 0 else last, last)
        return {
            "ok": True,
            "ref": ref,
            "reference_price_kind": "high",
            "highs": highs,
        }
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=502)


_WATCH_MID1H_UP_BATCH_MAX = 40


@app.post("/api/watch/midpoint-up-1h")
async def api_watch_midpoint_up_1h(request: Request):
    """
    감시 종목 전용: 선택 구간(15m·1h·6h·24h) 미들포인트 대비 현재가가 min_pct%(기본 0.1) 이상 오른 심볼만 반환.
    본문 midpoint_window(기본 1h). (매수 기준 고가·거래 조건과 별개 — 표시용)
    """
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"ok": False, "error": "JSON 본문이 필요합니다."}, status_code=400)
    raw_syms = body.get("symbols")
    if not isinstance(raw_syms, list) or not raw_syms:
        return JSONResponse({"ok": False, "error": "symbols 배열이 필요합니다."}, status_code=400)
    try:
        min_pct = float(body.get("min_pct") if body.get("min_pct") is not None else 0.1)
    except (TypeError, ValueError):
        min_pct = 0.1
    if min_pct < 0 or min_pct > 50:
        min_pct = 0.1
    mw = normalize_midpoint_window(body.get("midpoint_window"))
    symbols: list[str] = []
    for x in raw_syms[:_WATCH_MID1H_UP_BATCH_MAX]:
        if isinstance(x, str) and x.strip():
            symbols.append(x.strip().upper())
    if not symbols:
        return JSONResponse({"ok": False, "error": "유효한 심볼이 없습니다."}, status_code=400)
    try:
        ex = _ccxt_upbit_public()
        ex.load_markets()
        try:
            tickers = ex.fetch_tickers(symbols)
        except Exception:
            tickers = {}
            for sym in symbols:
                try:
                    tickers[sym] = ex.fetch_ticker(sym)
                except Exception:
                    continue
        rows: list[dict[str, Any]] = []
        for sym in symbols:
            t = tickers.get(sym)
            if not isinstance(t, dict):
                continue
            try:
                mid = float(reference_midpoint_for_window(ex, sym, mw, t))
            except Exception:
                continue
            last = _float_safe(t.get("last"))
            if mid <= 1e-12 or last <= 1e-12:
                continue
            pct = (last - mid) / mid * 100.0
            if pct >= min_pct - 1e-9:
                rows.append(
                    {
                        "symbol": sym,
                        "mid_1h": mid,
                        "last": last,
                        "pct_vs_mid": round(pct, 4),
                    }
                )
        rows.sort(key=lambda r: float(r["pct_vs_mid"]), reverse=True)
        return {"ok": True, "min_pct": min_pct, "window": mw, "rows": rows}
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=502)


@app.get("/api/status")
def get_status():
    if not STATUS_PATH.is_file():
        return JSONResponse(
            {
                "ok": False,
                "message": "status.json 이 없습니다. 이 폴더에서 python main.py 로 봇을 먼저 실행하세요.",
            }
        )
    try:
        data = json.loads(STATUS_PATH.read_text(encoding="utf-8"))
        return JSONResponse(data)
    except (json.JSONDecodeError, OSError) as e:
        return JSONResponse(
            {"ok": False, "message": f"status.json 읽기 실패: {e}"},
            status_code=500,
        )


@app.get("/api/config")
def get_config():
    """레거시: 첫 시나리오를 flat dict 로."""
    return load_strategy_config()


@app.post("/api/config")
async def post_config(request: Request):
    try:
        body = await request.json()
        if not isinstance(body, dict):
            return JSONResponse({"ok": False, "error": "JSON 객체가 필요합니다."}, status_code=400)
        merged = save_strategy_config(body)
        return merged
    except ValueError as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=400)
    except json.JSONDecodeError:
        return JSONResponse({"ok": False, "error": "JSON 파싱 실패"}, status_code=400)


@app.get("/api/scenarios")
def get_scenarios(lite: bool = Query(False, description="true면 avatar_image_data 생략(폴링·요약용)")):
    migrate_if_needed()
    from chat_strategy_numeric import numeric_consistency_from_scenario

    rows = load_scenarios_list()
    # id 기준 고정 순서 — 새로고침 시 첫 트레이더·폴백 선택이 들쭉날쭉해지지 않게 함
    rows = sorted(rows, key=lambda s: str(s.get("id") or ""))
    out: list[dict[str, Any]] = []
    for s in rows:
        d = dict(s)
        d["strategy_numeric_consistency"] = numeric_consistency_from_scenario(s)
        if lite:
            d.pop("avatar_image_data", None)
            d.pop("strategy_text", None)
            d.pop("trader_style", None)
            d.pop("watch_symbols", None)
            d.pop("watch_preview_symbols", None)
            d.pop("buy_allocation_tiers", None)
            d.pop("volume_surge_chase", None)
            d.pop("bollinger_squeeze", None)
            d.pop("scalp_flash", None)
        out.append(d)
    default_sid = get_dashboard_default_scenario_id()
    return JSONResponse(
        {
            "scenarios": out,
            "default_scenario_id": default_sid,
        },
        headers={"Cache-Control": "no-store, max-age=0", "Pragma": "no-cache"},
    )


@app.post("/api/dashboard-default")
async def post_dashboard_default(request: Request):
    """대시보드에서 우선 사용할 기본 시나리오 id 저장 (즉시매수·초기 선택 등)."""
    try:
        body = await request.json()
        if not isinstance(body, dict):
            return JSONResponse({"ok": False, "error": "JSON 객체가 필요합니다."}, status_code=400)
    except json.JSONDecodeError:
        return JSONResponse({"ok": False, "error": "JSON 파싱 실패"}, status_code=400)
    sid = str(body.get("scenario_id") or "").strip()
    try:
        migrate_if_needed()
        saved = set_dashboard_default_scenario_id(sid)
        return {"ok": True, "default_scenario_id": saved}
    except ValueError as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=400)


@app.get("/api/scenarios/performance")
def get_scenarios_performance(refresh: bool = False):
    """시나리오별 매수/미실현·실현 손익 (trades.json + status.json). refresh=1 이면 시세 캐시 무효화."""
    try:
        if refresh:
            invalidate_krw_price_cache()
        return {"ok": True, "scenarios": build_scenario_performance_list()}
    except Exception as e:
        return JSONResponse({"ok": False, "message": str(e)}, status_code=500)


def _recent_trades_for_scenario(scenario_id: str, limit: int = 20) -> list[dict[str, Any]]:
    """trades.json 에서 해당 시나리오만 최신순으로 (업무 전략 모달 요약용)."""
    sid = scenario_id.strip()
    rows = read_trades()
    n = max(1, min(int(limit), 80))
    out: list[dict[str, Any]] = []
    for t in reversed(rows):
        if str(t.get("scenario_id") or "").strip() != sid:
            continue
        out.append(
            {
                "side": t.get("side"),
                "symbol": t.get("symbol"),
                "ts": t.get("ts"),
                "cost_krw": t.get("cost_krw"),
                "price": t.get("price"),
                "proceeds_krw": t.get("proceeds_krw"),
                "realized_pnl_krw": t.get("realized_pnl_krw"),
                "trade_reason_ko": t.get("trade_reason_ko"),
                "manual": t.get("manual"),
            }
        )
        if len(out) >= n:
            break
    return out


@app.get("/api/scenarios/{scenario_id}/work-strategy")
def get_scenario_work_strategy(scenario_id: str):
    """업무 전략 모달용 — 짧은 JSON + 해당 트레이더 최근 체결 요약."""
    migrate_if_needed()
    scen = get_scenario_by_id(scenario_id.strip())
    if not scen:
        return JSONResponse({"ok": False, "error": "시나리오를 찾을 수 없습니다."}, status_code=404)
    sid = str(scen.get("id") or scenario_id.strip())
    return {
        "ok": True,
        "scenario_id": sid,
        "name": scen.get("name") or "트레이더",
        "trader_style": str(scen.get("trader_style") or ""),
        "strategy_text": str(scen.get("strategy_text") or ""),
        "recent_trades": _recent_trades_for_scenario(sid),
    }


@app.get("/api/scenarios/{scenario_id}")
def get_one_scenario(scenario_id: str):
    """한 명만 조회 — 거래 조건 폼·저장 병합용 (프로필 사진 필드 제외)."""
    migrate_if_needed()
    from chat_strategy_numeric import numeric_consistency_from_scenario

    scen = get_scenario_by_id(scenario_id.strip())
    if not scen:
        return JSONResponse({"ok": False, "error": "시나리오를 찾을 수 없습니다."}, status_code=404)
    d = dict(scen)
    d.pop("avatar_image_data", None)
    d["strategy_numeric_consistency"] = numeric_consistency_from_scenario(scen)
    return JSONResponse(
        {"ok": True, "scenario": d},
        headers={"Cache-Control": "no-store, max-age=0", "Pragma": "no-cache"},
    )


@app.get("/api/credentials-status")
def api_credentials_status():
    """업비트·Gemini 키 설정 여부(값은 노출하지 않음)."""
    return credentials_status()


@app.post("/api/credentials")
async def api_credentials_save(request: Request):
    """
    API 키를 .runtime_credentials.json 에 저장하고 현재 프로세스 env 에 반영.
    JSON: upbit_api_key, upbit_secret, gemini_api_key, google_api_key (선택).
    빈 문자열이나 null이면 해당 항목만 파일에서 제거합니다.
    """
    try:
        body = await request.json()
        if not isinstance(body, dict):
            return JSONResponse({"ok": False, "error": "JSON 객체가 필요합니다."}, status_code=400)
    except json.JSONDecodeError:
        return JSONResponse({"ok": False, "error": "JSON 파싱 실패"}, status_code=400)

    key_map = {
        "upbit_api_key": "UPBIT_API_KEY",
        "upbit_secret": "UPBIT_SECRET",
        "gemini_api_key": "GEMINI_API_KEY",
        "google_api_key": "GOOGLE_API_KEY",
    }
    updates: dict[str, Any] = {}
    for js_k, env_k in key_map.items():
        if js_k not in body:
            continue
        updates[env_k] = body.get(js_k)

    save_runtime_credentials(updates)
    return {"ok": True, **credentials_status()}


@app.post("/api/scenarios/preview-watch")
async def post_preview_watch(request: Request):
    """
    현재 폼에 맞춰 이번 루프와 동일한 방식으로 감시 종목을 나눈 결과를 반환합니다.
    무작위 모드에서 '감시 적용' 버튼으로 감시 종목 칸을 채울 때 사용합니다.
    """
    try:
        body = await request.json()
        if not isinstance(body, dict):
            return JSONResponse({"ok": False, "error": "JSON 객체가 필요합니다."}, status_code=400)
        raw = body.get("scenarios")
        if not isinstance(raw, list):
            return JSONResponse({"ok": False, "error": "scenarios 배열이 필요합니다."}, status_code=400)
        scenarios: list[dict[str, Any]] = []
        for s in raw:
            if isinstance(s, dict):
                scenarios.append(validate_scenario_dict(s, require_id=True))
        if not scenarios:
            return JSONResponse({"ok": False, "error": "유효한 시나리오가 없습니다."}, status_code=400)
        active = active_enabled_scenarios(scenarios)
        if not active:
            active = scenarios
        ex = UpbitExchange()
        ex.load_markets()
        all_krw = ex.list_krw_symbols()
        rng = random.Random()
        rng.seed(time.time_ns() % (2**63))
        try:
            tickers_map = ex.exchange.fetch_tickers()
        except Exception:
            tickers_map = {}
        watch_by_id = assign_watch_symbols_per_loop(
            active, all_krw, rng, tickers_map, ex.exchange
        )
        return {
            "ok": True,
            "watch_by_id": watch_by_id,
            "krw_market_count": len(all_krw),
        }
    except RuntimeError as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=503)
    except ValueError as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=400)
    except json.JSONDecodeError:
        return JSONResponse({"ok": False, "error": "JSON 파싱 실패"}, status_code=400)


@app.post("/api/scenarios")
async def post_scenarios(request: Request):
    try:
        body = await request.json()
        if not isinstance(body, dict) or "scenarios" not in body:
            return JSONResponse({"ok": False, "error": "scenarios 배열이 필요합니다."}, status_code=400)
        raw = body["scenarios"]
        if not isinstance(raw, list):
            return JSONResponse({"ok": False, "error": "scenarios 는 배열이어야 합니다."}, status_code=400)
        saved = save_scenarios_list(raw)
        return {"ok": True, "scenarios": saved}
    except ValueError as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=400)
    except json.JSONDecodeError:
        return JSONResponse({"ok": False, "error": "JSON 파싱 실패"}, status_code=400)


@app.patch("/api/scenarios/{scenario_id}")
async def patch_scenario_api(scenario_id: str, request: Request):
    try:
        body = await request.json()
        if not isinstance(body, dict):
            return JSONResponse({"ok": False, "error": "JSON 객체가 필요합니다."}, status_code=400)
        merged = patch_scenario(scenario_id, body)
        return {"ok": True, "scenario": merged}
    except ValueError as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=400)
    except json.JSONDecodeError:
        return JSONResponse({"ok": False, "error": "JSON 파싱 실패"}, status_code=400)


@app.get("/api/scenarios/{scenario_id}/manual-order-context")
async def get_manual_order_context(scenario_id: str):
    """즉시 시장가 매수 패널: 서버가 쓰는 금액·기본 심볼·감시 요약."""
    migrate_if_needed()
    scen = get_scenario_by_id(scenario_id)
    if not scen:
        return JSONResponse({"ok": False, "error": "시나리오를 찾을 수 없습니다."}, status_code=404)
    buy_krw, src = describe_effective_buy_krw(scen)
    default_sym = default_symbol_for_manual_buy(scen)
    st = load_trader_runtime_state(scenario_id, scen)
    vk = st.get("virtual_krw")
    alloc = scen.get("allocated_krw")
    bka = scen.get("buy_krw_amount")
    scenario_buy_krw_amount: float | None
    if bka is None or bka == "":
        scenario_buy_krw_amount = None
    else:
        try:
            scenario_buy_krw_amount = float(bka)
        except (TypeError, ValueError):
            scenario_buy_krw_amount = None
    return {
        "ok": True,
        "scenario_id": scenario_id,
        "scenario_name": str(scen.get("name") or "시나리오"),
        "trading_style": str(scen.get("trading_style") or "trend_follow"),
        "buy_krw": buy_krw,
        "buy_krw_source": src,
        "scenario_buy_krw_amount": scenario_buy_krw_amount,
        "default_symbol": default_sym,
        "watch_summary": manual_order_watch_summary(scen),
        "auto_buy_text": manual_order_auto_buy_text(scen),
        "auto_sell_text": manual_order_auto_sell_text(scen),
        "watch_random": bool(scen.get("watch_random")),
        "drop_from_high_pct": scen.get("drop_from_high_pct"),
        "buy_entry_mode": scen.get("buy_entry_mode"),
        "virtual_krw": vk,
        "allocated_krw": alloc,
        "trading_enabled": scen.get("trading_enabled", True),
    }


@app.post("/api/scenarios/{scenario_id}/market_buy_now")
async def post_market_buy_now(scenario_id: str, request: Request):
    """
    시장가 매수를 **즉시** 실행합니다. 본문 없이 POST 해도 됩니다.
    선택: symbol 예 BTC/KRW (없으면 감시 첫 종목 또는 trading_symbol).
    """
    try:
        body = await request.json()
        if not isinstance(body, dict):
            body = {}
    except json.JSONDecodeError:
        body = {}
    migrate_if_needed()
    scen = get_scenario_by_id(scenario_id)
    if not scen:
        return JSONResponse({"ok": False, "error": "시나리오를 찾을 수 없습니다."}, status_code=404)
    if not scen.get("enabled", True):
        return JSONResponse({"ok": False, "error": "비활성 트레이더입니다."}, status_code=400)
    try:
        symbol = _resolve_symbol_for_manual_buy(scen, body.get("symbol"))
        buy_krw = float(effective_buy_krw(scen))
        drp = scen.get("drop_from_high_pct")
        summary_ko = (
            cond_summary_ko_trend_buy(
                buy_entry_mode=str(scen.get("buy_entry_mode") or "drop_from_high"),
                drop_reference_high=str(scen.get("drop_reference_high") or "24h"),
                drop_from_high_pct=float(drp) if drp is not None else None,
            )
            + " · 대시보드 시장가"
        )
        body_out, status = execute_immediate_buy(
            scenario_id,
            scen,
            symbol=symbol,
            buy_krw=buy_krw,
            summary_ko=summary_ko,
            kind="market",
            ex=None,
        )
        return JSONResponse(body_out, status_code=status)
    except RuntimeError as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=503)
    except ValueError as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=400)


@app.post("/api/scenarios/{scenario_id}/limit_buy_below_market")
async def post_limit_buy_below_market(scenario_id: str, request: Request):
    """
    시장가(최근 체결) 대비 X%p 아래 호가에 지정가 매수 1건.
    JSON: below_market_pct (퍼센트포인트, 예: 1.5 = 1.5% 하락), symbol 선택.
    """
    try:
        body = await request.json()
        if not isinstance(body, dict):
            body = {}
    except json.JSONDecodeError:
        body = {}
    raw_pct = body.get("below_market_pct")
    try:
        below_pct = float(raw_pct)
    except (TypeError, ValueError):
        return JSONResponse(
            {"ok": False, "error": "below_market_pct 는 숫자(퍼센트포인트)여야 합니다."},
            status_code=400,
        )
    if below_pct < 0.01 or below_pct > 20.0:
        return JSONResponse(
            {
                "ok": False,
                "error": "시장가 대비 하락은 0.01 ~ 20 (%p) 사이여야 합니다.",
            },
            status_code=400,
        )
    migrate_if_needed()
    scen = get_scenario_by_id(scenario_id)
    if not scen:
        return JSONResponse({"ok": False, "error": "시나리오를 찾을 수 없습니다."}, status_code=404)
    if not scen.get("enabled", True):
        return JSONResponse({"ok": False, "error": "비활성 트레이더입니다."}, status_code=400)
    try:
        symbol = _resolve_symbol_for_manual_buy(scen, body.get("symbol"))
        st = load_trader_runtime_state(scenario_id, scen)
        positions: dict[str, Any] = dict(st["positions"])
        virtual_krw = st["virtual_krw"]
        ex = UpbitExchange()
        ex.load_markets()
        bal = ex.fetch_balance()
        krw_free = UpbitExchange.free_quote(bal, "KRW")
        buy_krw = float(effective_buy_krw(scen))
        if buy_krw < _MANUAL_LIMIT_MIN_KRW:
            return JSONResponse(
                {
                    "ok": False,
                    "error": (
                        "매수 금액이 5,000원 미만입니다. 순위별 매수 금액·비율 또는 "
                        ".env BUY_KRW_AMOUNT 를 확인하세요."
                    ),
                },
                status_code=400,
            )
        if virtual_krw is not None and float(virtual_krw) + 1e-6 < buy_krw:
            return JSONResponse(
                {
                    "ok": False,
                    "error": (
                        f"부여(가상) KRW 부족: 필요 {buy_krw:,.0f}원, 남음 {float(virtual_krw):,.2f}원"
                    ),
                },
                status_code=400,
            )
        if krw_free + 1e-6 < buy_krw:
            return JSONResponse(
                {
                    "ok": False,
                    "error": f"KRW 부족: 필요 약 {buy_krw:,.0f}원, 사용가능 {krw_free:,.2f}원",
                },
                status_code=400,
            )
        ticker = ex.fetch_ticker(symbol)
        last = float(ticker.get("last") or 0)
        if last <= 0:
            return JSONResponse({"ok": False, "error": "현재가를 가져올 수 없습니다."}, status_code=400)
        try:
            orders_pb = ex.limit_buy_krw_pullback(
                symbol,
                last_price=last,
                total_krw=buy_krw,
                offsets_pct_points=[below_pct],
                min_krw_per_order=_MANUAL_LIMIT_MIN_KRW,
            )
        except InsufficientFunds as e:
            return JSONResponse({"ok": False, "error": f"매수 실패(잔고): {e}"}, status_code=400)
        except InvalidOrder as e:
            return JSONResponse({"ok": False, "error": f"매수 실패(거절): {e}"}, status_code=400)
        except ExchangeError as e:
            return JSONResponse({"ok": False, "error": f"거래소 오류: {e}"}, status_code=502)
        if not orders_pb:
            return JSONResponse(
                {
                    "ok": False,
                    "error": "지정가 주문이 접수되지 않았습니다(최소 주문 금액·호가 단위를 확인하세요).",
                },
                status_code=400,
            )
        oid = ",".join(str(o.get("id") or "") for o in orders_pb if o.get("id") is not None)
        limit_px = last * (1.0 - below_pct / 100.0)
        if virtual_krw is not None:
            virtual_krw = max(0.0, float(virtual_krw) - buy_krw)
        save_trader_runtime_state(scenario_id, positions=positions, virtual_krw=virtual_krw)
        drp = scen.get("drop_from_high_pct")
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
                "manual": True,
                "cond_summary_ko": (
                    f"즉시 지정가 · 시장가 대비 {below_pct:g}%p 하락"
                ),
                "trade_reason_ko": reason_manual_dashboard_limit_buy(
                    scenario_name=str(scen.get("name") or "시나리오"),
                    scenario_id=scenario_id,
                    symbol=symbol,
                    buy_krw=buy_krw,
                    below_market_pct=below_pct,
                ),
            }
        )
        return {
            "ok": True,
            "symbol": symbol,
            "buy_krw": buy_krw,
            "below_market_pct": below_pct,
            "last_price": last,
            "limit_price_approx": limit_px,
            "order_ids": [o.get("id") for o in orders_pb if o.get("id") is not None],
        }
    except RuntimeError as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=503)
    except ValueError as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=400)


@app.post("/api/holdings/market_sell")
async def post_holdings_market_sell(request: Request):
    """보유 코인 전량 시장가 매도(대시보드). JSON: { \"currency\": \"BTC\", \"confirm\": true }"""
    try:
        body = await request.json()
        if not isinstance(body, dict):
            body = {}
    except json.JSONDecodeError:
        body = {}
    if body.get("confirm") is not True:
        return JSONResponse(
            {"ok": False, "error": "즉시 매도는 JSON에 confirm: true 가 필요합니다."},
            status_code=400,
        )
    currency = str(body.get("currency") or "").strip().upper()
    if not currency or currency == "KRW":
        return JSONResponse({"ok": False, "error": "매도할 코인 코드가 필요합니다."}, status_code=400)
    symbol = f"{currency}/KRW"
    try:
        from exchange_helper import UpbitExchange, avg_buy_krw_per_unit_from_balance

        ex = UpbitExchange()
        ex.load_markets()
        bal = ex.fetch_balance()
        avg_buy_map = avg_buy_krw_per_unit_from_balance(bal)
        free_map = bal.get("free") if isinstance(bal.get("free"), dict) else {}
        try:
            base_free = float(free_map.get(currency) or 0)
        except (TypeError, ValueError):
            base_free = 0.0
        if base_free <= 1e-12:
            return JSONResponse(
                {"ok": False, "error": f"{currency} 사용가능 수량이 없습니다."},
                status_code=400,
            )
        ep_raw = avg_buy_map.get(currency)
        try:
            ep_before = float(ep_raw) if ep_raw is not None else None
        except (TypeError, ValueError):
            ep_before = None
        ticker = ex.fetch_ticker(symbol)
        last = float(ticker.get("last") or 0)
        order = ex.market_sell_base(symbol, base_free)
        avg_sell = UpbitExchange.average_fill_price(order)
        if avg_sell is None:
            avg_sell = last
        avg_sell_f = float(avg_sell)
        proceeds = float(order.get("cost") or (avg_sell_f * base_free))
        pnl = None
        if ep_before is not None and ep_before > 0:
            pnl = (avg_sell_f - ep_before) * base_free
        sid_log = ""
        sname_log = "대시보드 즉시매도"
        raw_sid = body.get("scenario_id")
        if raw_sid is not None and str(raw_sid).strip():
            scen = get_scenario_by_id(str(raw_sid).strip())
            if scen and scen.get("id"):
                sid_log = str(scen.get("id"))
                sname_log = str(scen.get("name") or "시나리오")
        reason_tail = (
            f"트레이더 「{sname_log}」에 귀속"
            if sid_log
            else "시나리오 미선택 — 상단에서 트레이더를 고른 뒤 매도하면 체결 내역에 표시됩니다"
        )
        append_trade(
            {
                "side": "sell",
                "scenario_id": sid_log,
                "scenario_name": sname_log if sid_log else "대시보드 즉시매도",
                "symbol": symbol,
                "price": avg_sell_f,
                "amount_base": base_free,
                "proceeds_krw": proceeds,
                "entry_price": ep_before,
                "realized_pnl_krw": pnl,
                "order_id": str(order.get("id") or ""),
                "manual": True,
                "dashboard_sell": True,
                "cond_summary_ko": "수동 매도(보유)",
                "trade_reason_ko": (
                    f"{symbol} 대시보드에서 수동으로 시장가 전량 매도했습니다. ({reason_tail})"
                ),
            }
        )
        return {
            "ok": True,
            "symbol": symbol,
            "sold_base": base_free,
            "proceeds_krw": proceeds,
            "order_id": order.get("id"),
            "fill_price": avg_sell_f,
        }
    except RuntimeError as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=503)
    except InsufficientFunds as e:
        return JSONResponse({"ok": False, "error": f"매도 실패(잔고): {e}"}, status_code=400)
    except InvalidOrder as e:
        return JSONResponse({"ok": False, "error": f"매도 실패(거절): {e}"}, status_code=400)
    except ExchangeError as e:
        return JSONResponse({"ok": False, "error": f"거래소 오류: {e}"}, status_code=502)
    except Exception as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=502)


@app.post("/api/scenarios/add")
async def post_scenario_add(request: Request):
    try:
        body = await request.json()
        if not isinstance(body, dict):
            return JSONResponse({"ok": False, "error": "JSON 객체가 필요합니다."}, status_code=400)
        one = add_scenario(body)
        return {"ok": True, "scenario": one}
    except ValueError as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=400)
    except json.JSONDecodeError:
        return JSONResponse({"ok": False, "error": "JSON 파싱 실패"}, status_code=400)


@app.post("/api/scenario-add")
async def post_scenario_add_plain(request: Request):
    """트레이더 추가 — 경로 `/api/scenarios/add` 와 동일 동작, 프록시 호환용."""
    try:
        body = await request.json()
        if not isinstance(body, dict):
            return JSONResponse({"ok": False, "error": "JSON 객체가 필요합니다."}, status_code=400)
        one = add_scenario(body)
        return {"ok": True, "scenario": one}
    except ValueError as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=400)
    except json.JSONDecodeError:
        return JSONResponse({"ok": False, "error": "JSON 파싱 실패"}, status_code=400)


@app.delete("/api/scenarios/{scenario_id}")
def delete_scenario_api(scenario_id: str):
    try:
        rest = remove_scenario(scenario_id)
        return {"ok": True, "scenarios": rest}
    except ValueError as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=400)


@app.post("/api/scenarios/{scenario_id}/remove")
def post_scenario_remove(scenario_id: str):
    """해고(시나리오 삭제). DELETE 가 막히는 프록시·환경 대비용 POST."""
    try:
        rest = remove_scenario(scenario_id)
        return {"ok": True, "scenarios": rest}
    except ValueError as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=400)


@app.post("/api/scenario-remove")
async def post_scenario_remove_body(request: Request):
    """해고(시나리오 삭제). 경로 파라미터 없이 JSON으로만 보내 프록시·캐시 이슈를 피합니다."""
    try:
        body = await request.json()
    except json.JSONDecodeError:
        return JSONResponse({"ok": False, "error": "JSON 본문이 필요합니다."}, status_code=400)
    if not isinstance(body, dict):
        return JSONResponse({"ok": False, "error": "JSON 객체가 필요합니다."}, status_code=400)
    sid = body.get("scenario_id") or body.get("id")
    if not sid or not str(sid).strip():
        return JSONResponse({"ok": False, "error": "scenario_id 가 필요합니다."}, status_code=400)
    try:
        rest = remove_scenario(str(sid).strip())
        return {"ok": True, "scenarios": rest}
    except ValueError as e:
        return JSONResponse({"ok": False, "error": str(e)}, status_code=400)


@app.get("/api/trades")
def api_trades(limit: int = 80):
    rows = read_trades()
    return {"trades": rows[-limit:]}


@app.get("/api/trades/by-scenario")
def api_trades_by_scenario(limit_per: int = 80):
    """시나리오별 최근 체결(최신순, 시나리오당 최대 limit_per). 매수만 연속이면 매도가 밀리지 않게 기본값을 넉넉히 둠."""
    rows = read_trades()
    n = max(1, min(int(limit_per), 200))
    by_id: dict[str, list[dict[str, Any]]] = {}
    for t in reversed(rows):
        sid = str(t.get("scenario_id") or "").strip()
        if not sid:
            continue
        lst = by_id.setdefault(sid, [])
        if len(lst) < n:
            lst.append(t)
    return {"ok": True, "by_id": by_id}


@app.get("/api/stats")
def api_stats():
    return compute_stats()


@app.get("/api/chat/meta")
def api_chat_meta():
    """Gemini 채팅 사용 가능 여부(키 존재 여부만, 값은 노출하지 않음)."""
    try:
        from llm_strategy_chat import is_llm_chat_configured

        return {"ok": True, "llm_enabled": is_llm_chat_configured()}
    except ImportError:
        return {"ok": True, "llm_enabled": False}


@app.post("/api/chat")
async def api_chat(request: Request):
    """전략 상담 + 대화로 전략 수정 (GEMINI_API_KEY 등 설정 시 Gemini + 도구, 아니면 규칙 기반)."""
    try:
        body = await request.json()
        if not isinstance(body, dict):
            return JSONResponse({"ok": False, "reply": "JSON 객체가 필요합니다."}, status_code=400)
    except json.JSONDecodeError:
        return JSONResponse({"ok": False, "reply": "JSON 형식이 올바르지 않습니다."}, status_code=400)
    try:
        out = process_chat_request(body)
        return {"ok": True, "reply": out["reply"], "applied": out.get("applied", False)}
    except Exception as e:
        return JSONResponse({"ok": False, "reply": f"답변 생성 중 오류: {e}"}, status_code=500)


@app.post("/api/chat/trader")
async def api_chat_trader(request: Request):
    """퀀트트레이더 1명과 개별 대화. 도구 없이 텍스트만; 전략 초안은 ```strategy``` / ```style``` 블록."""
    try:
        body = await request.json()
        if not isinstance(body, dict):
            return JSONResponse({"ok": False, "reply": "JSON 객체가 필요합니다."}, status_code=400)
    except json.JSONDecodeError:
        return JSONResponse({"ok": False, "reply": "JSON 형식이 올바르지 않습니다."}, status_code=400)
    try:
        out = process_trader_chat_request(body)
        return {"ok": True, "reply": out["reply"], "applied": out.get("applied", False)}
    except Exception as e:
        return JSONResponse({"ok": False, "reply": f"답변 생성 중 오류: {e}"}, status_code=500)


@app.get("/api/balance")
def api_balance(scenario_id: str | None = None):
    """업비트 계정 잔고(키 필요). 시세·원화 평가액·총자산 포함.
    scenario_id: 썸네일로 선택한 트레이더 id — 귀속 없을 때 익절/손절 목표가 계산에 사용.
    """
    try:
        from exchange_helper import UpbitExchange, avg_buy_krw_per_unit_from_balance

        ex = UpbitExchange()
        bal = ex.fetch_balance()
        avg_buy_map = avg_buy_krw_per_unit_from_balance(bal)
        totals = bal.get("total") if isinstance(bal.get("total"), dict) else {}
        free_map = bal.get("free") if isinstance(bal.get("free"), dict) else {}
        holdings: list[dict[str, Any]] = []
        for currency, amount in totals.items():
            try:
                tot = float(amount or 0)
            except (TypeError, ValueError):
                continue
            fr = 0.0
            if currency in free_map:
                try:
                    fr = float(free_map.get(currency) or 0)
                except (TypeError, ValueError):
                    fr = 0.0
            if tot <= 1e-12 and fr <= 1e-12:
                continue
            holdings.append({"currency": currency, "free": fr, "total": tot})

        for h in holdings:
            c = str(h["currency"])
            if c == "KRW":
                h["avg_buy_krw"] = None
            else:
                h["avg_buy_krw"] = avg_buy_map.get(c)

        crypto_syms = [f"{str(h['currency'])}/KRW" for h in holdings if str(h["currency"]) != "KRW"]
        tickers_map: dict[str, Any] = {}
        if crypto_syms:
            try:
                tickers_map = ex.exchange.fetch_tickers(crypto_syms)
            except Exception:
                tickers_map = {}

        total_assets_krw = 0.0
        partial_total = False
        for h in holdings:
            c = str(h["currency"])
            t = float(h["total"])
            if c == "KRW":
                h["price_krw"] = 1.0
                h["value_krw"] = t
                total_assets_krw += t
            else:
                sym = f"{c}/KRW"
                ticker = tickers_map.get(sym) if isinstance(tickers_map, dict) else None
                last: float | None = None
                if isinstance(ticker, dict) and ticker.get("last") is not None:
                    try:
                        last = float(ticker["last"])
                    except (TypeError, ValueError):
                        last = None
                if last is None:
                    try:
                        ticker_one = ex.fetch_ticker(sym)
                        last = float(ticker_one.get("last") or 0)
                    except Exception:
                        last = None
                if last is not None and last > 0:
                    h["price_krw"] = last
                    h["value_krw"] = t * last
                    total_assets_krw += float(h["value_krw"])
                else:
                    h["price_krw"] = None
                    h["value_krw"] = None
                    partial_total = True
            ab = h.get("avg_buy_krw")
            if ab is not None and isinstance(ab, (int, float)) and float(ab) > 0 and t > 0:
                h["cost_basis_krw"] = float(t) * float(ab)
            else:
                h["cost_basis_krw"] = None

        def _sort_key(x: dict[str, Any]) -> float:
            v = x.get("value_krw")
            if v is None:
                return -1.0
            return float(v)

        holdings.sort(key=_sort_key, reverse=True)

        krw_free = 0.0
        for h in holdings:
            if str(h.get("currency")) == "KRW":
                try:
                    krw_free = float(h.get("free") or 0)
                except (TypeError, ValueError):
                    krw_free = 0.0
                break

        sum_allocated_krw = _sum_allocated_krw_from_scenarios()
        available_after_alloc_krw = max(0.0, krw_free - sum_allocated_krw)

        migrate_if_needed()
        scen_list = load_scenarios_list()
        _enrich_holdings_attrib(holdings, read_trades(), scen_list)
        _enrich_holdings_targets(holdings, scen_list, scenario_id)

        return {
            "ok": True,
            "holdings": holdings,
            "total_assets_krw": total_assets_krw,
            "partial_total": partial_total,
            "krw_free": krw_free,
            "sum_allocated_krw": sum_allocated_krw,
            "available_after_alloc_krw": available_after_alloc_krw,
        }
    except RuntimeError as e:
        return JSONResponse({"ok": False, "message": str(e)}, status_code=503)
    except Exception as e:
        return JSONResponse({"ok": False, "message": str(e)}, status_code=502)


@app.get("/api/ohlcv")
def api_ohlcv(symbol: str = "BTC/KRW", timeframe: str = "1h", limit: int = 48):
    """공개 캔들 (API 키 불필요). 차트용."""
    try:
        lim = max(10, min(200, int(limit)))
        sym = str(symbol or "").strip() or "BTC/KRW"
        tf = str(timeframe or "").strip() or "1h"
        cache_key = (sym, tf, lim)
        cached = _ohlcv_cached_get(cache_key)
        if cached is not None:
            return {"ok": True, "symbol": sym, "timeframe": tf, "ohlcv": cached}
        ex = _upbit_public_exchange_singleton()
        ohlcv = ex.fetch_ohlcv(sym, tf, limit=lim)
        _ohlcv_cached_set(cache_key, ohlcv)
        return {"ok": True, "symbol": sym, "timeframe": tf, "ohlcv": ohlcv}
    except Exception as e:
        # 업비트·네트워크 일시 오류 — 502 는 프록시 Bad Gateway 와 혼동되므로 503
        return JSONResponse({"ok": False, "message": str(e)}, status_code=503)


# 루트에 StaticFiles(html=True) 를 쓰면 일부 환경에서 /api/ POST 가 정적 처리로 떨어질 수 있어,
# index 만 명시적으로 제공합니다 (static 폴더에는 index.html 만 둠).
if STATIC_DIR.is_dir():
    _INDEX_HTML = STATIC_DIR / "index.html"

    @app.get("/")
    def dashboard_index_root() -> FileResponse:
        return FileResponse(_INDEX_HTML)

    @app.get("/index.html")
    def dashboard_index_named() -> FileResponse:
        return FileResponse(_INDEX_HTML)


def main() -> None:
    import uvicorn

    host = os.getenv("DASHBOARD_HOST", "127.0.0.1")
    port = int(os.getenv("DASHBOARD_PORT", "8765"))
    reload = os.getenv("DASHBOARD_RELOAD", "").strip().lower() in ("1", "true", "yes", "on")

    if reload:
        # status.json 은 main.py 가 루프마다 갱신하므로 *.json 을 감시하면
        # 서버가 끊임없이 재시작되어 /api/krw-market·잔고 등이 실패하기 쉽다.
        uvicorn.run(
            "dashboard:app",
            host=host,
            port=port,
            reload=True,
            reload_dirs=[str(BASE_DIR)],
            reload_includes=["*.py", "*.html"],
            app_dir=str(BASE_DIR),
        )
    else:
        uvicorn.run(app, host=host, port=port, reload=False)


if __name__ == "__main__":
    main()
