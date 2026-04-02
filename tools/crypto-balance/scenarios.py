"""시나리오(1개) 저장·상태·레거시 마이그레이션."""

from __future__ import annotations

import json
import logging
import os
import random
import re
import uuid
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

from reference_high import DROP_REFERENCE_HIGH_CHOICES, normalize_drop_reference_high
from reference_midpoint import MIDPOINT_WINDOW_CHOICES, normalize_midpoint_window
from watch_filter import WATCH_POOL_STYLES, filter_krw_symbols_by_style

BASE_DIR = Path(__file__).resolve().parent
SCENARIOS_PATH = BASE_DIR / "scenarios.json"
SCENARIOS_STATE_PATH = BASE_DIR / "scenarios_state.json"
LEGACY_STRATEGY_PATH = BASE_DIR / "strategy_config.json"

MAX_SCENARIOS = 1
MAX_WATCH_SYMBOLS = 40
MIN_RANDOM_WATCH = 10
# 플러스 판정: 기준 고가 대비 +이 %p 이상 (고정, UI에서 변경 불가)
WATCH_POSITIVE_VS_REF_FIXED_PCT = 0.5
BUY_ENTRY_MODE_DROP = "drop_from_high"
BUY_ENTRY_MODE_MIDPOINT_RISE = "midpoint_rise"
BUY_ENTRY_MODE_WATCH_SHARE = "watch_positive_share"
TRADING_STYLE_TREND_FOLLOW = "trend_follow"
TRADING_STYLE_VOLUME_SURGE_CHASE = "volume_surge_chase"
TRADING_STYLE_BOLLINGER_SQUEEZE = "bollinger_squeeze"
TRADING_STYLE_SCALP_FLASH = "scalp_flash"
# 프로필 사진(data URL) 최대 길이 — scenarios.json 크기 보호
MAX_AVATAR_IMAGE_DATA_CHARS = 600_000
_SYMBOL_RE = re.compile(r"^[A-Z0-9]+/KRW$")


def _new_id() -> str:
    return str(uuid.uuid4())


def default_scenario_dict(*, scenario_id: str | None = None, name: str = "기본") -> dict[str, Any]:
    sym = (os.getenv("TRADING_SYMBOL") or "BTC/KRW").strip().upper()
    return {
        "id": scenario_id or _new_id(),
        "name": name,
        "enabled": True,
        "trading_symbol": sym,
        "watch_symbols": [],
        "watch_random": True,
        "watch_random_count": 12,
        "watch_pool_style": "all",
        "trader_style": "",
        "allocated_krw": None,
        "strategy_text": "",
        "drop_from_high_pct": 0.03,
        "rise_from_entry_pct": 0.05,
        "drop_reference_high": "24h",
        "reference_price_kind": "high",
        "midpoint_window": "1h",
        "stop_loss_from_entry_pct": None,
        "trading_enabled": True,
        "cooldown_seconds_after_trade": 0,
        "loop_seconds": None,
        "buy_krw_amount": None,
        "buy_allocation_tiers": {},
        "buy_min_watch_positive_share_pct": None,
        "watch_positive_vs_ref_min_pct": WATCH_POSITIVE_VS_REF_FIXED_PCT,
        "buy_entry_mode": BUY_ENTRY_MODE_DROP,
        "drop_midpoint_gate_min_pct": None,
        "drop_midpoint_gate_window": "1h",
        "watch_midpoint_up_window": "1h",
        "watch_preview_symbols": [],
        "avatar_seed": "",
        "trader_age": None,
        "trader_mbti": "",
        "trader_career": "",
        "trader_rank": "",
        "avatar_image_data": None,
        "trader_gender": "",
        "trader_self_intro": "",
        "trading_style": TRADING_STYLE_TREND_FOLLOW,
        "volume_surge_chase": {},
        "bollinger_squeeze": {},
        "scalp_flash": {},
        "time_limit_exit": {},
    }


def _normalize_volume_surge_chase(raw: Any) -> dict[str, Any]:
    if raw is None or raw == "":
        raw = {}
    if not isinstance(raw, dict):
        raise ValueError("volume_surge_chase 는 객체여야 합니다.")
    min_sr = float(raw.get("min_surge_ratio") or 1.2)
    if min_sr < 1.0 or min_sr > 20.0:
        raise ValueError("volume_surge_chase.min_surge_ratio 는 1~20 사이입니다.")
    lb = str(raw.get("lookback") or "5m").strip().lower()
    if lb not in ("1m", "5m", "10m"):
        raise ValueError("volume_surge_chase.lookback 은 1m, 5m, 10m 입니다.")
    mrp = float(raw.get("min_rise_pct") or 1.0)
    if mrp < 0.1 or mrp > 50:
        raise ValueError("volume_surge_chase.min_rise_pct 는 0.1~50 입니다.")
    bk = float(raw.get("buy_krw") or 6000)
    if bk < 1000:
        raise ValueError("volume_surge_chase.buy_krw 는 1000 이상입니다.")
    rf = float(raw.get("rise_from_entry_pct") or 0.05)
    if not 0.0001 <= rf <= 2.0:
        raise ValueError("volume_surge_chase.rise_from_entry_pct 는 0.0001 ~ 2.0 사이여야 합니다.")
    sl_raw = raw.get("stop_loss_from_entry_pct")
    if sl_raw is None or sl_raw == "":
        slv = None
    else:
        slv = float(sl_raw)
        if slv <= 0 or slv < 0.0001:
            slv = None
        elif slv > 0.95:
            raise ValueError("volume_surge_chase.stop_loss_from_entry_pct 는 0.95 이하여야 합니다.")
    return {
        "min_surge_ratio": min_sr,
        "lookback": lb,
        "min_rise_pct": mrp,
        "buy_krw": bk,
        "rise_from_entry_pct": rf,
        "stop_loss_from_entry_pct": slv,
    }


def _normalize_bollinger_squeeze(raw: Any) -> dict[str, Any]:
    if raw is None or raw == "":
        raw = {}
    if not isinstance(raw, dict):
        raise ValueError("bollinger_squeeze 는 객체여야 합니다.")
    tf = str(raw.get("timeframe") or "1h").strip().lower()
    if tf not in ("15m", "1h", "4h"):
        raise ValueError("bollinger_squeeze.timeframe 은 15m, 1h, 4h 입니다.")
    period = int(raw.get("bb_period") or 20)
    if period < 5 or period > 50:
        raise ValueError("bollinger_squeeze.bb_period 는 5~50 입니다.")
    std_m = float(raw.get("bb_std_mult") or 2.0)
    if std_m < 1.0 or std_m > 3.5:
        raise ValueError("bollinger_squeeze.bb_std_mult 는 1.0~3.5 입니다.")
    smax = float(raw.get("squeeze_max_width_pct") or 4.0)
    if smax < 0.3 or smax > 25.0:
        raise ValueError("bollinger_squeeze.squeeze_max_width_pct 는 0.3~25 입니다.")
    breakout_only = raw.get("breakout_only")
    if breakout_only is None:
        breakout_only = True
    else:
        breakout_only = bool(breakout_only)
    bk = float(raw.get("buy_krw") or 6000)
    if bk < 1000:
        raise ValueError("bollinger_squeeze.buy_krw 는 1000 이상입니다.")
    rf = float(raw.get("rise_from_entry_pct") or 0.05)
    if not 0.0001 <= rf <= 2.0:
        raise ValueError("bollinger_squeeze.rise_from_entry_pct 는 0.0001 ~ 2.0 사이여야 합니다.")
    sl_raw = raw.get("stop_loss_from_entry_pct")
    if sl_raw is None or sl_raw == "":
        slv = None
    else:
        slv = float(sl_raw)
        if slv <= 0 or slv < 0.0001:
            slv = None
        elif slv > 0.95:
            raise ValueError("bollinger_squeeze.stop_loss_from_entry_pct 는 0.95 이하여야 합니다.")
    return {
        "timeframe": tf,
        "bb_period": period,
        "bb_std_mult": std_m,
        "squeeze_max_width_pct": smax,
        "breakout_only": breakout_only,
        "buy_krw": bk,
        "rise_from_entry_pct": rf,
        "stop_loss_from_entry_pct": slv,
    }


def _normalize_scalp_flash(raw: Any) -> dict[str, Any]:
    if raw is None or raw == "":
        raw = {}
    if not isinstance(raw, dict):
        raise ValueError("scalp_flash 는 객체여야 합니다.")
    n = int(raw.get("volume_top_n") or 20)
    if n < 5 or n > 50:
        raise ValueError("scalp_flash.volume_top_n 은 5~50 입니다.")
    min24 = float(raw.get("min_24h_rise_pct") or 2.0)
    if min24 < 0 or min24 > 50:
        raise ValueError("scalp_flash.min_24h_rise_pct 는 0~50 입니다.")
    sp = float(raw.get("high_3h_vs_6h_min_spread_pct") or 0.1)
    if sp < 0.01 or sp > 5.0:
        raise ValueError("scalp_flash.high_3h_vs_6h_min_spread_pct 는 0.01~5 입니다.")
    dr = float(raw.get("min_drop_from_15m_high_pct") or 0.07)
    if dr < 0.01 or dr > 5.0:
        raise ValueError("scalp_flash.min_drop_from_15m_high_pct 는 0.01~5 입니다.")
    bk = float(raw.get("buy_krw") or 10000)
    if bk < 1000:
        raise ValueError("scalp_flash.buy_krw 는 1000 이상입니다.")
    rf = float(raw.get("rise_from_entry_pct") or 0.005)
    if not 0.0001 <= rf <= 2.0:
        raise ValueError("scalp_flash.rise_from_entry_pct 는 0.0001 ~ 2.0 사이여야 합니다.")
    sl_raw = raw.get("stop_loss_from_entry_pct")
    if sl_raw is None or sl_raw == "":
        slv = None
    else:
        slv = float(sl_raw)
        if slv <= 0 or slv < 0.0001:
            slv = None
        elif slv > 0.95:
            raise ValueError("scalp_flash.stop_loss_from_entry_pct 는 0.95 이하여야 합니다.")
    return {
        "volume_top_n": n,
        "min_24h_rise_pct": min24,
        "high_3h_vs_6h_min_spread_pct": sp,
        "min_drop_from_15m_high_pct": dr,
        "buy_krw": bk,
        "rise_from_entry_pct": rf,
        "stop_loss_from_entry_pct": slv,
    }


def _normalize_time_limit_exit(raw: Any) -> dict[str, Any]:
    """대세추매(trend_follow) 전용 — 시간제한·빠른 익절·손실 구간 회복/강제 청산."""
    if raw is None or raw == "":
        raw = {}
    if not isinstance(raw, dict):
        raise ValueError("time_limit_exit 는 객체여야 합니다.")
    enabled = bool(raw.get("enabled", False))
    tdm = int(raw.get("target_deadline_minutes") or 30)
    if tdm < 1 or tdm > 1440:
        raise ValueError("time_limit_exit.target_deadline_minutes 는 1~1440 입니다.")
    qwm = int(raw.get("quick_take_window_minutes") or 5)
    if qwm < 1 or qwm > 120:
        raise ValueError("time_limit_exit.quick_take_window_minutes 는 1~120 입니다.")
    qtp = float(raw.get("quick_take_profit_pct") or 0.0003)
    if not 0.000001 <= qtp <= 0.02:
        raise ValueError("time_limit_exit.quick_take_profit_pct 는 0.0001% ~ 2% 범위(소수)입니다.")
    lth = float(raw.get("loss_branch_threshold_pct") or -0.0001)
    if lth >= 0 or lth < -0.5:
        raise ValueError("time_limit_exit.loss_branch_threshold_pct 는 음수(손실 구간)여야 합니다.")
    lrt = float(raw.get("loss_recovery_target_pct") or 0.0003)
    if not 0.000001 <= lrt <= 0.02:
        raise ValueError("time_limit_exit.loss_recovery_target_pct 는 0.0001% ~ 2% 범위(소수)입니다.")
    lfm = int(raw.get("loss_force_exit_minutes") or 10)
    if lfm < 1 or lfm > 1440:
        raise ValueError("time_limit_exit.loss_force_exit_minutes 는 1~1440 입니다.")
    return {
        "enabled": enabled,
        "target_deadline_minutes": tdm,
        "quick_take_window_minutes": qwm,
        "quick_take_profit_pct": qtp,
        "loss_branch_threshold_pct": lth,
        "loss_recovery_target_pct": lrt,
        "loss_force_exit_minutes": lfm,
    }


def _validate_watch_pool_style(s: str | None) -> str:
    t = (s or "all").strip().lower()
    if t not in WATCH_POOL_STYLES:
        raise ValueError(
            "watch_pool_style 은 "
            + ", ".join(sorted(WATCH_POOL_STYLES))
            + " 중 하나여야 합니다."
        )
    return t


def _validate_trading_symbol(ts: str | None) -> str:
    if not ts or not str(ts).strip():
        raise ValueError("trading_symbol 은 비울 수 없습니다. 예: BTC/KRW")
    t = str(ts).strip().upper()
    if not _SYMBOL_RE.match(t):
        raise ValueError("trading_symbol 은 업비트 KRW 마켓 형식이어야 합니다. 예: BTC/KRW")
    return t


def _normalize_avatar_image_data(raw: Any) -> str | None:
    """클라이언트에서 올린 data:image/...;base64,... 문자열."""
    if raw is None or raw == "":
        return None
    s = str(raw).strip()
    if not s.startswith("data:image/"):
        raise ValueError("프로필 사진은 이미지(data URL) 형식이어야 합니다.")
    if len(s) > MAX_AVATAR_IMAGE_DATA_CHARS:
        raise ValueError("프로필 사진이 너무 큽니다. 더 작은 이미지를 사용해 주세요.")
    return s


def symbol_tier_by_rise_rank_pct(symbol_to_pct_rise: dict[str, float]) -> dict[str, str]:
    """
    기준 고가 대비 상승률(%)이 큰 순으로 순위를 매기고,
    전체를 100칸에 대응시켜 상위(약 1~24)·중위(25~75)·하위(76~100) 구간으로 분류합니다.
    감시 종목 수 N에 맞게 경계가 비례합니다.
    """
    if not symbol_to_pct_rise:
        return {}
    rows = sorted(symbol_to_pct_rise.items(), key=lambda x: -x[1])
    n = len(rows)
    upper_end = max(1, (24 * n + 99) // 100)
    mid_end = max(upper_end, (75 * n + 99) // 100)
    out: dict[str, str] = {}
    for i, (sym, _) in enumerate(rows):
        r = i + 1
        if r <= upper_end:
            out[sym] = "upper"
        elif r <= mid_end:
            out[sym] = "middle"
        else:
            out[sym] = "lower"
    return out


def _normalize_buy_allocation_tiers(raw: Any) -> dict[str, Any]:
    """upper / middle / lower — 각각 { mode: krw|pct, value: number }."""
    if raw is None or raw == "":
        return {}
    if not isinstance(raw, dict):
        raise ValueError("buy_allocation_tiers 는 객체여야 합니다.")
    out: dict[str, Any] = {}
    for key in ("upper", "middle", "lower"):
        if key not in raw:
            continue
        t = raw[key]
        if t is None or t == {}:
            continue
        if not isinstance(t, dict):
            raise ValueError(f"buy_allocation_tiers.{key} 는 객체여야 합니다.")
        mode = str(t.get("mode") or "krw").lower()
        if mode not in ("krw", "pct"):
            raise ValueError(f"buy_allocation_tiers.{key}.mode 는 krw 또는 pct 입니다.")
        val = t.get("value")
        if val is None or val == "":
            out[key] = {"mode": mode, "value": 0.0}
            continue
        fv = float(val)
        if mode == "pct":
            if fv < 0 or fv > 100:
                raise ValueError(f"buy_allocation_tiers.{key} 비율은 0~100 입니다.")
        else:
            if fv < 0:
                raise ValueError(f"buy_allocation_tiers.{key} 금액은 0 이상입니다.")
        out[key] = {"mode": mode, "value": fv}
    return out


def buy_krw_for_tier(
    scenario: dict[str, Any],
    tier: str,
    *,
    quote_free_krw: float,
    virtual_krw: float | None,
) -> float:
    """
    순위 구간(upper/middle/lower)별 매수 원화.
    pct: 부여(가상) KRW가 있으면 그 잔액, 없으면 계좌 KRW 사용 가능액 기준.
    tiers 미설정 시 레거시 buy_krw_amount 또는 BUY_KRW_AMOUNT.
    """
    tiers = scenario.get("buy_allocation_tiers")
    if isinstance(tiers, dict) and tiers:
        tcfg = tiers.get(tier) or {}
        mode = str(tcfg.get("mode") or "krw").lower()
        val = float(tcfg.get("value") or 0)
        if mode == "pct":
            base = float(virtual_krw) if virtual_krw is not None else quote_free_krw
            return max(0.0, val * base / 100.0)
        return max(0.0, val)
    leg = scenario.get("buy_krw_amount")
    if leg is not None and str(leg).strip() != "":
        return max(0.0, float(leg))
    return max(0.0, float(os.getenv("BUY_KRW_AMOUNT") or "6000"))


def _normalize_watch_list(raw: Any) -> list[str]:
    if raw is None or raw == [] or raw == "":
        return []
    if not isinstance(raw, list):
        raise ValueError("watch_symbols 는 문자열 배열이어야 합니다.")
    out: list[str] = []
    for x in raw[:MAX_WATCH_SYMBOLS]:
        out.append(_validate_trading_symbol(str(x)))
    seen: set[str] = set()
    deduped: list[str] = []
    for s in out:
        if s not in seen:
            seen.add(s)
            deduped.append(s)
    return deduped


def effective_watch_symbols(scenario: dict[str, Any]) -> list[str]:
    """비어 있으면 trading_symbol 하나만 감시."""
    ws = _normalize_watch_list(scenario.get("watch_symbols"))
    if ws:
        return ws
    return [_validate_trading_symbol(scenario.get("trading_symbol"))]


def _validate_watch_disjoint(scenarios: list[dict[str, Any]]) -> None:
    """수동 감시 목록만 검사. watch_random 인 트레이더는 런타임에 풀에서 나뉘므로 저장 시 제외."""
    seen: set[str] = set()
    for s in scenarios:
        if not s.get("enabled", True):
            continue
        if s.get("watch_random"):
            continue
        for sym in effective_watch_symbols(s):
            if sym in seen:
                raise ValueError(
                    f"감시 종목 {sym} 이(가) 둘 이상의 퀀트트레이더에 지정되어 있습니다. "
                    "종목은 퀀트트레이더마다 서로 겹치지 않게 나누어 주세요."
                )
            seen.add(sym)


def _pick_trading_symbol_avoid_claimed(scenario: dict[str, Any], claimed: set[str]) -> None:
    """겹침이 없는 기본 종목을 고르고 claimed 에 반영."""
    for cand in (
        "BTC/KRW",
        "ETH/KRW",
        "XRP/KRW",
        "SOL/KRW",
        "ADA/KRW",
        "DOGE/KRW",
        "MATIC/KRW",
        "LINK/KRW",
        "DOT/KRW",
        "ATOM/KRW",
    ):
        if cand not in claimed:
            scenario["trading_symbol"] = cand
            claimed.add(cand)
            return
    sym = _validate_trading_symbol(os.getenv("TRADING_SYMBOL") or "BTC/KRW")
    scenario["trading_symbol"] = sym
    if sym not in claimed:
        claimed.add(sym)


def _dedupe_watch_overlap_across_scenarios(scenarios: list[dict[str, Any]]) -> None:
    """
    scenarios.json 순서(앞이 선순위) 기준으로 감시 종목을 한 번만 쓰게 맞춤.
    후순위 트레이더의 watch_symbols 에서 이미 앞에서 쓰인 종목을 제거한다.
    (enabled 이고 watch_random 이 아닌 트레이더만 서로 겹침 검사 대상.)
    """
    claimed: set[str] = set()
    for s in scenarios:
        if not s.get("enabled", True):
            continue
        if s.get("watch_random"):
            continue
        ws = list(s.get("watch_symbols") or [])
        if ws:
            new_ws: list[str] = []
            for sym in ws:
                if sym not in claimed:
                    new_ws.append(sym)
                    claimed.add(sym)
            s["watch_symbols"] = new_ws
            if new_ws:
                s["trading_symbol"] = new_ws[0]
            else:
                s["watch_symbols"] = []
                _pick_trading_symbol_avoid_claimed(s, claimed)
        else:
            sym = _validate_trading_symbol(s.get("trading_symbol"))
            if sym in claimed:
                s["watch_symbols"] = []
                _pick_trading_symbol_avoid_claimed(s, claimed)
            else:
                s["trading_symbol"] = sym
                claimed.add(sym)


def validate_scenario_dict(raw: dict[str, Any], *, require_id: bool = True) -> dict[str, Any]:
    """전체 시나리오 객체 검증(저장용)."""
    out: dict[str, Any] = {}
    if require_id:
        sid = raw.get("id")
        if not isinstance(sid, str) or not sid.strip():
            raise ValueError("시나리오 id 가 필요합니다.")
        out["id"] = sid.strip()
    nm = raw.get("name", "시나리오")
    out["name"] = str(nm).strip()[:80] if nm is not None else "시나리오"
    if not out["name"]:
        out["name"] = "시나리오"
    out["enabled"] = bool(raw.get("enabled", True))
    out["watch_random"] = bool(raw.get("watch_random", False))
    wrc_in = raw.get("watch_random_count")
    if wrc_in is None or wrc_in == "":
        out["watch_random_count"] = 12
    else:
        out["watch_random_count"] = max(MIN_RANDOM_WATCH, min(int(wrc_in), MAX_WATCH_SYMBOLS))
    wps_raw = raw.get("watch_pool_style")
    if isinstance(wps_raw, str) and wps_raw.strip().lower().startswith("vol_surge_"):
        wps_raw = "all"
    out["watch_pool_style"] = _validate_watch_pool_style(wps_raw)

    if out["watch_random"]:
        out["watch_symbols"] = []
        out["trading_symbol"] = _validate_trading_symbol(
            raw.get("trading_symbol") or os.getenv("TRADING_SYMBOL") or "BTC/KRW"
        )
        out["watch_preview_symbols"] = _normalize_watch_list(raw.get("watch_preview_symbols"))
    else:
        ws = _normalize_watch_list(raw.get("watch_symbols"))
        if ws:
            out["watch_symbols"] = ws
            out["trading_symbol"] = ws[0]
        else:
            out["watch_symbols"] = []
            out["trading_symbol"] = _validate_trading_symbol(raw.get("trading_symbol"))
        out["watch_preview_symbols"] = []
    ts = raw.get("trader_style")
    out["trader_style"] = str(ts).strip()[:4000] if ts is not None else ""
    ak = raw.get("allocated_krw")
    if ak is None or ak == "":
        out["allocated_krw"] = None
    else:
        av = float(ak)
        if av < 0 or av > 1e15:
            raise ValueError("allocated_krw 는 0 이상의 합리적인 값이어야 합니다.")
        out["allocated_krw"] = av
    stx = raw.get("strategy_text")
    out["strategy_text"] = str(stx).strip()[:4000] if stx is not None else ""

    aid = str(raw.get("avatar_seed") or "").strip()[:80]
    out["avatar_seed"] = aid if aid else str(out.get("id", "default"))[:80]
    tar = raw.get("trader_age")
    if tar is None or tar == "":
        out["trader_age"] = None
    else:
        try:
            ai = int(tar)
            out["trader_age"] = ai if 18 <= ai <= 99 else None
        except (TypeError, ValueError):
            out["trader_age"] = None
    mbti = str(raw.get("trader_mbti") or "").strip().upper()[:5]
    out["trader_mbti"] = mbti if (len(mbti) == 4 and mbti.isalpha()) else ""
    out["trader_career"] = str(raw.get("trader_career") or "").strip()[:500]
    out["trader_rank"] = str(raw.get("trader_rank") or "").strip()[:80]
    aim = raw.get("avatar_image_data")
    if aim is None or aim == "":
        out["avatar_image_data"] = None
    else:
        out["avatar_image_data"] = _normalize_avatar_image_data(aim)
    out["trader_gender"] = str(raw.get("trader_gender") or "").strip()[:20]
    out["trader_self_intro"] = str(raw.get("trader_self_intro") or "").strip()[:2000]

    ts = str(raw.get("trading_style") or TRADING_STYLE_TREND_FOLLOW).strip().lower()
    if ts not in (
        TRADING_STYLE_TREND_FOLLOW,
        TRADING_STYLE_VOLUME_SURGE_CHASE,
        TRADING_STYLE_BOLLINGER_SQUEEZE,
        TRADING_STYLE_SCALP_FLASH,
    ):
        ts = TRADING_STYLE_TREND_FOLLOW
    out["trading_style"] = ts

    if out["trading_style"] == TRADING_STYLE_VOLUME_SURGE_CHASE:
        vsc = _normalize_volume_surge_chase(raw.get("volume_surge_chase"))
        out["volume_surge_chase"] = vsc
        out["bollinger_squeeze"] = {}
        out["scalp_flash"] = {}
        out["rise_from_entry_pct"] = float(vsc["rise_from_entry_pct"])
        out["stop_loss_from_entry_pct"] = vsc.get("stop_loss_from_entry_pct")
        out["drop_from_high_pct"] = None
        out["buy_min_watch_positive_share_pct"] = None
        out["buy_entry_mode"] = BUY_ENTRY_MODE_DROP
        out["drop_reference_high"] = normalize_drop_reference_high(raw.get("drop_reference_high"))
        out["buy_krw_amount"] = None
    elif out["trading_style"] == TRADING_STYLE_BOLLINGER_SQUEEZE:
        bb = _normalize_bollinger_squeeze(raw.get("bollinger_squeeze"))
        out["bollinger_squeeze"] = bb
        out["volume_surge_chase"] = {}
        out["scalp_flash"] = {}
        out["rise_from_entry_pct"] = float(bb["rise_from_entry_pct"])
        out["stop_loss_from_entry_pct"] = bb.get("stop_loss_from_entry_pct")
        out["drop_from_high_pct"] = None
        out["buy_min_watch_positive_share_pct"] = None
        out["buy_entry_mode"] = BUY_ENTRY_MODE_DROP
        out["drop_reference_high"] = normalize_drop_reference_high(raw.get("drop_reference_high"))
        out["buy_krw_amount"] = None
    elif out["trading_style"] == TRADING_STYLE_SCALP_FLASH:
        sf = _normalize_scalp_flash(raw.get("scalp_flash"))
        out["scalp_flash"] = sf
        out["volume_surge_chase"] = {}
        out["bollinger_squeeze"] = {}
        out["rise_from_entry_pct"] = float(sf["rise_from_entry_pct"])
        out["stop_loss_from_entry_pct"] = sf.get("stop_loss_from_entry_pct")
        out["drop_from_high_pct"] = None
        out["buy_min_watch_positive_share_pct"] = None
        out["buy_entry_mode"] = BUY_ENTRY_MODE_DROP
        out["drop_reference_high"] = normalize_drop_reference_high(raw.get("drop_reference_high"))
        out["buy_krw_amount"] = None
    else:
        out["volume_surge_chase"] = {}
        out["bollinger_squeeze"] = {}
        out["scalp_flash"] = {}
        drp = raw.get("drop_from_high_pct")
        if drp is None or drp == "":
            out["drop_from_high_pct"] = None
        else:
            v = float(drp)
            if not 0.0001 <= v <= 0.95:
                raise ValueError("drop_from_high_pct 는 0.0001 ~ 0.95 사이이거나 비움(미사용)입니다.")
            out["drop_from_high_pct"] = v

        v2 = float(raw.get("rise_from_entry_pct") or 0.05)
        if not 0.0001 <= v2 <= 2.0:
            raise ValueError("rise_from_entry_pct 는 0.0001 ~ 2.0 사이여야 합니다.")
        out["rise_from_entry_pct"] = v2

        out["drop_reference_high"] = normalize_drop_reference_high(raw.get("drop_reference_high"))

        sl_raw = raw.get("stop_loss_from_entry_pct")
        if sl_raw is None or sl_raw == "":
            out["stop_loss_from_entry_pct"] = None
        else:
            slv = float(sl_raw)
            if slv <= 0 or slv < 0.0001:
                out["stop_loss_from_entry_pct"] = None
            elif slv > 0.95:
                raise ValueError("stop_loss_from_entry_pct 는 0.95 이하여야 합니다.")
            else:
                out["stop_loss_from_entry_pct"] = slv

    out["trading_enabled"] = bool(raw.get("trading_enabled", True))

    c = int(raw.get("cooldown_seconds_after_trade") or 0)
    if c < 0 or c > 86400:
        raise ValueError("cooldown_seconds_after_trade 는 0 ~ 86400 입니다.")
    out["cooldown_seconds_after_trade"] = c

    ls = raw.get("loop_seconds")
    out["loop_seconds"] = None if ls is None or ls == "" else int(ls)
    if out["loop_seconds"] is not None and out["loop_seconds"] < 1:
        raise ValueError("loop_seconds 는 1 이상이어야 합니다.")

    if out["trading_style"] not in (
        TRADING_STYLE_VOLUME_SURGE_CHASE,
        TRADING_STYLE_BOLLINGER_SQUEEZE,
        TRADING_STYLE_SCALP_FLASH,
    ):
        b = raw.get("buy_krw_amount")
        out["buy_krw_amount"] = None if b is None or b == "" else float(b)
        if out["buy_krw_amount"] is not None and out["buy_krw_amount"] < 1000:
            raise ValueError("buy_krw_amount 는 1000 이상을 권장합니다.")

        bms = raw.get("buy_min_watch_positive_share_pct")
        if bms is None or bms == "":
            out["buy_min_watch_positive_share_pct"] = None
        else:
            bmv = float(bms)
            if bmv < 0 or bmv > 100:
                raise ValueError("buy_min_watch_positive_share_pct 는 0 ~ 100 또는 비움입니다.")
            out["buy_min_watch_positive_share_pct"] = bmv

        bem_in = raw.get("buy_entry_mode")
        if bem_in is None or str(bem_in).strip() == "":
            drp0 = out.get("drop_from_high_pct")
            bms0 = out.get("buy_min_watch_positive_share_pct")
            try:
                bmv0 = float(bms0) if bms0 is not None else 0.0
            except (TypeError, ValueError):
                bmv0 = 0.0
            if bmv0 > 0 and drp0 is None:
                out["buy_entry_mode"] = BUY_ENTRY_MODE_WATCH_SHARE
            elif bmv0 > 0 and drp0 is not None:
                out["buy_entry_mode"] = BUY_ENTRY_MODE_DROP
                out["buy_min_watch_positive_share_pct"] = None
            else:
                out["buy_entry_mode"] = BUY_ENTRY_MODE_DROP
        else:
            bem = str(bem_in).strip().lower()
            if bem not in (
                BUY_ENTRY_MODE_DROP,
                BUY_ENTRY_MODE_MIDPOINT_RISE,
                BUY_ENTRY_MODE_WATCH_SHARE,
            ):
                raise ValueError(
                    "buy_entry_mode 는 "
                    + BUY_ENTRY_MODE_DROP
                    + ", "
                    + BUY_ENTRY_MODE_MIDPOINT_RISE
                    + " 또는 "
                    + BUY_ENTRY_MODE_WATCH_SHARE
                    + " 입니다."
                )
            out["buy_entry_mode"] = bem

        if out["buy_entry_mode"] == BUY_ENTRY_MODE_DROP:
            out["buy_min_watch_positive_share_pct"] = None
        elif out["buy_entry_mode"] == BUY_ENTRY_MODE_MIDPOINT_RISE:
            out["buy_min_watch_positive_share_pct"] = None
            out["drop_from_high_pct"] = None
        else:
            out["drop_from_high_pct"] = None
            out["drop_midpoint_gate_min_pct"] = None

        # 미들 게이트를 out 에 넣은 뒤 매수 방식별 검증 (전체 dict 끝에서 파싱하던 시점보다 앞서야 함)
        dmg_early = raw.get("drop_midpoint_gate_min_pct")
        if dmg_early is None or dmg_early == "":
            out["drop_midpoint_gate_min_pct"] = None
        else:
            try:
                g = float(dmg_early)
                if g < 0 or g > 5.0:
                    raise ValueError(
                        "drop_midpoint_gate_min_pct 는 0 ~ 5 (퍼센트포인트) 또는 비움입니다."
                    )
                out["drop_midpoint_gate_min_pct"] = None if g <= 0 else g
            except (TypeError, ValueError) as e:
                raise ValueError("drop_midpoint_gate_min_pct 값이 올바르지 않습니다.") from e
        out["drop_midpoint_gate_window"] = normalize_midpoint_window(
            raw.get("drop_midpoint_gate_window") or "1h"
        )

        if out["buy_entry_mode"] == BUY_ENTRY_MODE_WATCH_SHARE:
            bm = out.get("buy_min_watch_positive_share_pct")
            if bm is None or float(bm) <= 0:
                raise ValueError(
                    "감시 플러스 비중 매수 모드에서는 「감시 종목 중 플러스 비중 최소(%)」를 0보다 크게 입력해야 합니다."
                )
        elif out["buy_entry_mode"] == BUY_ENTRY_MODE_MIDPOINT_RISE:
            dg = out.get("drop_midpoint_gate_min_pct")
            if dg is None or float(dg) <= 0:
                raise ValueError(
                    "미들포인트 대비 상승 매수 모드에서는 미들 대비 상승(%)을 설정해야 합니다."
                )
        elif out.get("drop_from_high_pct") is None:
            raise ValueError(
                "기간 고가 대비 하락 매수 모드에서는 「기간 고가 대비 하락 (매수, %)」를 입력해야 합니다."
            )

    out["watch_positive_vs_ref_min_pct"] = WATCH_POSITIVE_VS_REF_FIXED_PCT
    if out["trading_style"] in (
        TRADING_STYLE_VOLUME_SURGE_CHASE,
        TRADING_STYLE_BOLLINGER_SQUEEZE,
        TRADING_STYLE_SCALP_FLASH,
    ):
        out["buy_allocation_tiers"] = {}
    else:
        out["buy_allocation_tiers"] = _normalize_buy_allocation_tiers(raw.get("buy_allocation_tiers"))

    rpk = str(raw.get("reference_price_kind") or "high").strip().lower()
    out["reference_price_kind"] = "midpoint" if rpk == "midpoint" else "high"
    out["midpoint_window"] = normalize_midpoint_window(raw.get("midpoint_window"))
    out["watch_midpoint_up_window"] = normalize_midpoint_window(
        raw.get("watch_midpoint_up_window")
    )

    dmg = raw.get("drop_midpoint_gate_min_pct")
    if dmg is None or dmg == "":
        out["drop_midpoint_gate_min_pct"] = None
    else:
        try:
            g = float(dmg)
            if g < 0 or g > 5.0:
                raise ValueError(
                    "drop_midpoint_gate_min_pct 는 0 ~ 5 (퍼센트포인트) 또는 비움입니다."
                )
            out["drop_midpoint_gate_min_pct"] = None if g <= 0 else g
        except (TypeError, ValueError) as e:
            raise ValueError("drop_midpoint_gate_min_pct 값이 올바르지 않습니다.") from e
    out["drop_midpoint_gate_window"] = normalize_midpoint_window(
        raw.get("drop_midpoint_gate_window") or "1h"
    )
    if out.get("trading_style") != TRADING_STYLE_TREND_FOLLOW:
        out["drop_midpoint_gate_min_pct"] = None
    elif out.get("buy_entry_mode") == BUY_ENTRY_MODE_WATCH_SHARE:
        out["drop_midpoint_gate_min_pct"] = None
    elif out.get("buy_entry_mode") == BUY_ENTRY_MODE_DROP:
        out["drop_midpoint_gate_min_pct"] = None
    out["time_limit_exit"] = _normalize_time_limit_exit(raw.get("time_limit_exit"))
    return out


def validate_scenario_patch(raw: dict[str, Any]) -> dict[str, Any]:
    """부분 업데이트용."""
    out: dict[str, Any] = {}
    if "name" in raw:
        n = str(raw.get("name") or "").strip()[:80]
        if n:
            out["name"] = n
    if "enabled" in raw:
        out["enabled"] = bool(raw["enabled"])
    if "trading_symbol" in raw:
        ts = raw["trading_symbol"]
        if ts is None or ts == "":
            raise ValueError("trading_symbol 을 비우면 안 됩니다.")
        out["trading_symbol"] = _validate_trading_symbol(ts)
    if "drop_from_high_pct" in raw:
        v = raw.get("drop_from_high_pct")
        if v is None or v == "":
            out["drop_from_high_pct"] = None
        else:
            fv = float(v)
            if not 0.0001 <= fv <= 0.95:
                raise ValueError("drop_from_high_pct 는 0.0001 ~ 0.95 사이이거나 비움(미사용)입니다.")
            out["drop_from_high_pct"] = fv
    if "rise_from_entry_pct" in raw:
        v = float(raw["rise_from_entry_pct"])
        if not 0.0001 <= v <= 2.0:
            raise ValueError("rise_from_entry_pct 는 0.0001 ~ 2.0 사이여야 합니다.")
        out["rise_from_entry_pct"] = v
    if "drop_reference_high" in raw:
        dr = str(raw.get("drop_reference_high") or "24h").strip().lower()
        if dr not in DROP_REFERENCE_HIGH_CHOICES:
            raise ValueError(
                "drop_reference_high 는 "
                + ", ".join(sorted(DROP_REFERENCE_HIGH_CHOICES))
                + " 중 하나여야 합니다."
            )
        out["drop_reference_high"] = dr
    if "reference_price_kind" in raw:
        k = str(raw.get("reference_price_kind") or "high").strip().lower()
        if k not in ("high", "midpoint"):
            raise ValueError("reference_price_kind 는 high 또는 midpoint 입니다.")
        out["reference_price_kind"] = k
    if "midpoint_window" in raw:
        mw = str(raw.get("midpoint_window") or "1h").strip().lower()
        if mw not in MIDPOINT_WINDOW_CHOICES:
            raise ValueError(
                "midpoint_window 는 "
                + ", ".join(sorted(MIDPOINT_WINDOW_CHOICES))
                + " 중 하나여야 합니다."
            )
        out["midpoint_window"] = mw
    if "watch_midpoint_up_window" in raw:
        out["watch_midpoint_up_window"] = normalize_midpoint_window(
            raw.get("watch_midpoint_up_window")
        )
    if "drop_midpoint_gate_min_pct" in raw:
        dmg = raw.get("drop_midpoint_gate_min_pct")
        if dmg is None or dmg == "":
            out["drop_midpoint_gate_min_pct"] = None
        else:
            g = float(dmg)
            if g < 0 or g > 5.0:
                raise ValueError(
                    "drop_midpoint_gate_min_pct 는 0 ~ 5 (퍼센트포인트) 또는 비움입니다."
                )
            out["drop_midpoint_gate_min_pct"] = None if g <= 0 else g
    if "drop_midpoint_gate_window" in raw:
        dmw = str(raw.get("drop_midpoint_gate_window") or "1h").strip().lower()
        if dmw not in MIDPOINT_WINDOW_CHOICES:
            raise ValueError(
                "drop_midpoint_gate_window 은 "
                + ", ".join(sorted(MIDPOINT_WINDOW_CHOICES))
                + " 중 하나여야 합니다."
            )
        out["drop_midpoint_gate_window"] = dmw
    if "stop_loss_from_entry_pct" in raw:
        sl_raw = raw.get("stop_loss_from_entry_pct")
        if sl_raw is None or sl_raw == "":
            out["stop_loss_from_entry_pct"] = None
        else:
            slv = float(sl_raw)
            if slv <= 0 or slv < 0.0001:
                out["stop_loss_from_entry_pct"] = None
            elif slv > 0.95:
                raise ValueError("stop_loss_from_entry_pct 는 0.95 이하여야 합니다.")
            else:
                out["stop_loss_from_entry_pct"] = slv
    if "trading_enabled" in raw:
        out["trading_enabled"] = bool(raw["trading_enabled"])
    if "cooldown_seconds_after_trade" in raw:
        c = int(raw["cooldown_seconds_after_trade"])
        if c < 0 or c > 86400:
            raise ValueError("cooldown_seconds_after_trade 는 0 ~ 86400 입니다.")
        out["cooldown_seconds_after_trade"] = c
    if "loop_seconds" in raw:
        ls = raw["loop_seconds"]
        out["loop_seconds"] = None if ls is None or ls == "" else int(ls)
        if out["loop_seconds"] is not None and out["loop_seconds"] < 1:
            raise ValueError("loop_seconds 는 1 이상이어야 합니다.")
    if "buy_krw_amount" in raw:
        b = raw["buy_krw_amount"]
        out["buy_krw_amount"] = None if b is None or b == "" else float(b)
        if out.get("buy_krw_amount") is not None and out["buy_krw_amount"] < 1000:
            raise ValueError("buy_krw_amount 는 1000 이상을 권장합니다.")
    if "buy_min_watch_positive_share_pct" in raw:
        bms = raw.get("buy_min_watch_positive_share_pct")
        if bms is None or bms == "":
            out["buy_min_watch_positive_share_pct"] = None
        else:
            bmv = float(bms)
            if bmv < 0 or bmv > 100:
                raise ValueError("buy_min_watch_positive_share_pct 는 0 ~ 100 또는 비움입니다.")
            out["buy_min_watch_positive_share_pct"] = bmv
    if "watch_positive_vs_ref_min_pct" in raw:
        out["watch_positive_vs_ref_min_pct"] = WATCH_POSITIVE_VS_REF_FIXED_PCT
    if "buy_entry_mode" in raw:
        bem = str(raw.get("buy_entry_mode") or "").strip().lower()
        if bem not in (
            BUY_ENTRY_MODE_DROP,
            BUY_ENTRY_MODE_MIDPOINT_RISE,
            BUY_ENTRY_MODE_WATCH_SHARE,
        ):
            raise ValueError(
                "buy_entry_mode 는 "
                + BUY_ENTRY_MODE_DROP
                + ", "
                + BUY_ENTRY_MODE_MIDPOINT_RISE
                + " 또는 "
                + BUY_ENTRY_MODE_WATCH_SHARE
                + " 입니다."
            )
        out["buy_entry_mode"] = bem
    if "buy_allocation_tiers" in raw:
        out["buy_allocation_tiers"] = _normalize_buy_allocation_tiers(raw.get("buy_allocation_tiers"))
    if "strategy_text" in raw:
        stx = raw.get("strategy_text")
        out["strategy_text"] = str(stx).strip()[:4000] if stx is not None else ""
    if "watch_symbols" in raw:
        ws = _normalize_watch_list(raw.get("watch_symbols"))
        out["watch_symbols"] = ws
        if ws:
            out["trading_symbol"] = ws[0]
    if "watch_random" in raw:
        out["watch_random"] = bool(raw["watch_random"])
        if out["watch_random"]:
            out["watch_symbols"] = []
    if "watch_random_count" in raw:
        wrc = raw.get("watch_random_count")
        if wrc is None or wrc == "":
            out["watch_random_count"] = 12
        else:
            out["watch_random_count"] = max(MIN_RANDOM_WATCH, min(int(wrc), MAX_WATCH_SYMBOLS))
    if "watch_pool_style" in raw:
        wps = raw.get("watch_pool_style")
        if isinstance(wps, str) and wps.strip().lower().startswith("vol_surge_"):
            wps = "all"
        out["watch_pool_style"] = _validate_watch_pool_style(wps)
    if "trading_style" in raw:
        ts = str(raw.get("trading_style") or "").strip().lower()
        if ts not in (
            TRADING_STYLE_TREND_FOLLOW,
            TRADING_STYLE_VOLUME_SURGE_CHASE,
            TRADING_STYLE_BOLLINGER_SQUEEZE,
            TRADING_STYLE_SCALP_FLASH,
        ):
            raise ValueError(
                "trading_style 은 "
                + TRADING_STYLE_TREND_FOLLOW
                + ", "
                + TRADING_STYLE_VOLUME_SURGE_CHASE
                + ", "
                + TRADING_STYLE_BOLLINGER_SQUEEZE
                + ", "
                + TRADING_STYLE_SCALP_FLASH
                + " 중 하나입니다."
            )
        out["trading_style"] = ts
    if "volume_surge_chase" in raw:
        out["volume_surge_chase"] = _normalize_volume_surge_chase(raw.get("volume_surge_chase"))
    if "bollinger_squeeze" in raw:
        out["bollinger_squeeze"] = _normalize_bollinger_squeeze(raw.get("bollinger_squeeze"))
    if "scalp_flash" in raw:
        out["scalp_flash"] = _normalize_scalp_flash(raw.get("scalp_flash"))
    if "time_limit_exit" in raw:
        out["time_limit_exit"] = _normalize_time_limit_exit(raw.get("time_limit_exit"))
    if "trader_style" in raw:
        ts = raw.get("trader_style")
        out["trader_style"] = str(ts).strip()[:4000] if ts is not None else ""
    if "allocated_krw" in raw:
        ak = raw.get("allocated_krw")
        if ak is None or ak == "":
            out["allocated_krw"] = None
        else:
            av = float(ak)
            if av < 0 or av > 1e15:
                raise ValueError("allocated_krw 는 0 이상의 합리적인 값이어야 합니다.")
            out["allocated_krw"] = av
    if "watch_preview_symbols" in raw:
        out["watch_preview_symbols"] = _normalize_watch_list(raw.get("watch_preview_symbols"))
    if "avatar_seed" in raw:
        a = str(raw.get("avatar_seed") or "").strip()[:80]
        if a:
            out["avatar_seed"] = a
    if "trader_age" in raw:
        tx = raw.get("trader_age")
        if tx is None or tx == "":
            out["trader_age"] = None
        else:
            try:
                ai = int(tx)
                out["trader_age"] = ai if 18 <= ai <= 99 else None
            except (TypeError, ValueError):
                out["trader_age"] = None
    if "trader_mbti" in raw:
        m = str(raw.get("trader_mbti") or "").strip().upper()[:5]
        out["trader_mbti"] = m if (len(m) == 4 and m.isalpha()) else ""
    if "trader_career" in raw:
        out["trader_career"] = str(raw.get("trader_career") or "").strip()[:500]
    if "trader_rank" in raw:
        out["trader_rank"] = str(raw.get("trader_rank") or "").strip()[:80]
    if "avatar_image_data" in raw:
        v = raw.get("avatar_image_data")
        if v is None or v == "":
            out["avatar_image_data"] = None
        else:
            out["avatar_image_data"] = _normalize_avatar_image_data(v)
    if "trader_gender" in raw:
        out["trader_gender"] = str(raw.get("trader_gender") or "").strip()[:20]
    if "trader_self_intro" in raw:
        out["trader_self_intro"] = str(raw.get("trader_self_intro") or "").strip()[:2000]
    return out


def migrate_if_needed() -> None:
    if SCENARIOS_PATH.is_file():
        return
    one = default_scenario_dict(name="기본")
    if LEGACY_STRATEGY_PATH.is_file():
        try:
            leg = json.loads(LEGACY_STRATEGY_PATH.read_text(encoding="utf-8"))
            if isinstance(leg, dict):
                if leg.get("trading_symbol"):
                    try:
                        one["trading_symbol"] = _validate_trading_symbol(leg.get("trading_symbol"))
                    except ValueError:
                        pass
                for k in (
                    "drop_from_high_pct",
                    "rise_from_entry_pct",
                    "trading_enabled",
                    "cooldown_seconds_after_trade",
                    "loop_seconds",
                    "buy_krw_amount",
                ):
                    if k in leg:
                        one[k] = leg[k]
        except (json.JSONDecodeError, OSError):
            pass
    save_scenarios_list([validate_scenario_dict(one, require_id=True)])


def _backup_corrupt_scenarios_file() -> None:
    """깨진 파일을 덮어쓰기 전에 보관."""
    try:
        if not SCENARIOS_PATH.is_file():
            return
        bak = SCENARIOS_PATH.with_suffix(".json.corrupt-backup")
        n = 1
        while bak.is_file():
            bak = SCENARIOS_PATH.with_name(f"scenarios.json.corrupt-backup.{n}")
            n += 1
        bak.write_bytes(SCENARIOS_PATH.read_bytes())
        log.info("문제가 있는 scenarios.json 을 %s(으)로 백업했습니다.", bak.name)
    except OSError:
        pass


def _seed_minimal_scenarios_file() -> list[dict[str, Any]]:
    """디스크에 최소 1개 시나리오 보장."""
    one = validate_scenario_dict(default_scenario_dict(name="기본"), require_id=True)
    save_scenarios_list([one])
    return [one]


def _dedupe_scenario_ids(scenarios: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for s in scenarios:
        d = dict(s)
        sid = str(d.get("id") or "").strip()
        if not sid:
            d["id"] = _new_id()
            sid = d["id"]
            log.warning("빈 id 시나리오에 새 id를 부여했습니다.")
        if sid in seen:
            log.warning("중복 시나리오 id %s — 새 id를 부여합니다.", sid)
            d["id"] = _new_id()
        seen.add(str(d["id"]))
        out.append(d)
    return out


def _collapse_scenarios_to_one(out: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """시나리오는 1개만 유지. default_scenario_id 우선, 없으면 첫 항목."""
    if len(out) <= 1:
        return out
    blob = _load_state_blob()
    pref = blob.get("default_scenario_id")
    chosen: dict[str, Any] | None = None
    if isinstance(pref, str) and pref.strip():
        p = pref.strip()
        for s in out:
            if str(s.get("id") or "") == p:
                chosen = s
                break
    if chosen is None:
        chosen = out[0]
    try:
        one = validate_scenario_dict(dict(chosen), require_id=True)
        save_scenarios_list([one])
        blob2 = _load_state_blob()
        blob2["default_scenario_id"] = one["id"]
        bi = blob2.get("by_id")
        if isinstance(bi, dict):
            oid = str(one["id"])
            blob2["by_id"] = {k: v for k, v in bi.items() if str(k) == oid}
        _save_state_blob(blob2)
        log.warning(
            "시나리오가 %d개 있어 1개로 축소했습니다. 유지 id=%s",
            len(out),
            one["id"],
        )
        return [one]
    except Exception as e:
        log.error("시나리오 다건→1건 축소 저장 실패: %s", e)
        return [validate_scenario_dict(dict(chosen), require_id=True)]


def _load_one_scenario_item(raw: Any, index: int) -> tuple[dict[str, Any], bool]:
    """한 건 로드. (검증 실패 시 id·이름만 살린 기본 시나리오로 복구, was_repair=True)."""
    if not isinstance(raw, dict):
        log.warning(
            "scenarios.json 항목 #%d 이 객체가 아닙니다. 새 시나리오로 대체합니다.",
            index + 1,
        )
        return (
            validate_scenario_dict(
                default_scenario_dict(name=f"복구 {index + 1}"), require_id=True
            ),
            True,
        )
    try:
        return validate_scenario_dict(raw, require_id=True), False
    except ValueError as e:
        log.warning(
            "scenarios.json 항목 #%d 검증 실패 (id=%s): %s — 기본 필드로 복구합니다.",
            index + 1,
            raw.get("id"),
            e,
        )
        sid_raw = raw.get("id")
        sid_ok = isinstance(sid_raw, str) and sid_raw.strip()
        name = raw.get("name")
        nm = str(name).strip()[:80] if name is not None else ""
        if not nm:
            nm = f"복구 {index + 1}"
        base = default_scenario_dict(scenario_id=sid_ok or None, name=nm)
        return validate_scenario_dict(base, require_id=True), True


def load_scenarios_list() -> list[dict[str, Any]]:
    """
    scenarios.json 로드. 한 항목만 깨져도 전체를 지우지 않고 해당 줄만 복구한다.
    빈 배열·깨진 JSON·잘못된 루트 타입은 기본 1개로 시드한다.
    """
    migrate_if_needed()
    try:
        raw_text = SCENARIOS_PATH.read_text(encoding="utf-8")
    except OSError:
        return _seed_minimal_scenarios_file()

    try:
        data = json.loads(raw_text)
    except json.JSONDecodeError as e:
        log.error("scenarios.json JSON 파싱 실패: %s", e)
        _backup_corrupt_scenarios_file()
        return _seed_minimal_scenarios_file()

    if not isinstance(data, list):
        log.error("scenarios.json 루트가 배열이 아닙니다.")
        _backup_corrupt_scenarios_file()
        return _seed_minimal_scenarios_file()

    if len(data) == 0:
        log.warning("scenarios.json 이 빈 배열입니다. 기본 시나리오 1개를 생성합니다.")
        return _seed_minimal_scenarios_file()

    out: list[dict[str, Any]] = []
    repaired_any = False
    for i, item in enumerate(data):
        d, was_repair = _load_one_scenario_item(item, i)
        if was_repair:
            repaired_any = True
        out.append(d)

    out = _dedupe_scenario_ids(out)
    if not out:
        log.warning("유효한 시나리오가 없습니다. 기본 1개를 생성합니다.")
        return _seed_minimal_scenarios_file()

    if len(out) > 1:
        out = _collapse_scenarios_to_one(out)
    elif repaired_any:
        try:
            save_scenarios_list(out)
        except ValueError as e:
            log.warning("복구된 시나리오를 디스크에 저장하지 못했습니다: %s", e)
    return out


def save_scenarios_list(scenarios: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if len(scenarios) < 1:
        raise ValueError("시나리오는 최소 1개 필요합니다.")
    if len(scenarios) > MAX_SCENARIOS:
        raise ValueError(f"시나리오는 최대 {MAX_SCENARIOS}개까지입니다.")
    seen: set[str] = set()
    normalized: list[dict[str, Any]] = []
    for s in scenarios:
        d = validate_scenario_dict(s, require_id=True)
        if d["id"] in seen:
            raise ValueError(f"중복된 시나리오 id: {d['id']}")
        seen.add(d["id"])
        normalized.append(d)
    _dedupe_watch_overlap_across_scenarios(normalized)
    normalized = [validate_scenario_dict(x, require_id=True) for x in normalized]
    _validate_watch_disjoint(normalized)
    tmp = SCENARIOS_PATH.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(normalized, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(SCENARIOS_PATH)
    return normalized


def get_scenario_by_id(scenario_id: str) -> dict[str, Any] | None:
    for s in load_scenarios_list():
        if s.get("id") == scenario_id:
            return dict(s)
    return None


def patch_scenario(scenario_id: str, patch: dict[str, Any]) -> dict[str, Any]:
    scenarios = load_scenarios_list()
    out_list: list[dict[str, Any]] = []
    found = False
    explicit_keys = set(patch.keys())
    partial = validate_scenario_patch(patch)
    if not partial:
        raise ValueError("변경할 필드가 없습니다.")
    if "strategy_text" in partial:
        from chat_strategy_numeric import extract_numeric_strategy_patch

        extra = extract_numeric_strategy_patch(partial["strategy_text"])
        merged_in = dict(partial)
        for k, v in extra.items():
            if k not in explicit_keys:
                merged_in[k] = v
        if merged_in != partial:
            partial = validate_scenario_patch(merged_in)
    for s in scenarios:
        if s.get("id") != scenario_id:
            out_list.append(s)
            continue
        found = True
        merged = {**s, **partial}
        # 직원 프로필 저장 시 성별이 비어 있으면 서버에서 남/여 중 무작위
        if "trader_career" in patch or "trader_self_intro" in patch:
            if not str(merged.get("trader_gender") or "").strip():
                merged["trader_gender"] = random.choice(("male", "female"))
        out_list.append(validate_scenario_dict(merged, require_id=True))
    if not found:
        raise ValueError(f"시나리오를 찾을 수 없습니다: {scenario_id}")
    saved = save_scenarios_list(out_list)
    for s in saved:
        if s.get("id") == scenario_id:
            return s
    raise RuntimeError("patch_scenario: internal error")


def add_scenario(new: dict[str, Any]) -> dict[str, Any]:
    scenarios = load_scenarios_list()
    if len(scenarios) >= MAX_SCENARIOS:
        raise ValueError(f"시나리오는 최대 {MAX_SCENARIOS}개까지입니다.")
    sid = new.get("id") or _new_id()
    base = default_scenario_dict(scenario_id=sid, name=str(new.get("name") or "새 시나리오"))
    body = {**base, **new, "id": sid}
    scenarios.append(validate_scenario_dict(body, require_id=True))
    save_scenarios_list(scenarios)
    return scenarios[-1]


def remove_scenario(scenario_id: str) -> list[dict[str, Any]]:
    scenarios = load_scenarios_list()
    if len(scenarios) <= 1:
        raise ValueError("마지막 시나리오는 삭제할 수 없습니다.")
    filt = [s for s in scenarios if s.get("id") != scenario_id]
    if len(filt) == len(scenarios):
        raise ValueError(f"시나리오를 찾을 수 없습니다: {scenario_id}")
    return save_scenarios_list(filt)


def scenario_to_flat(cfg: dict[str, Any]) -> dict[str, Any]:
    """strategy_config 호환 flat dict (id/name 제외)."""
    return {
        "trading_style": cfg.get("trading_style") or TRADING_STYLE_TREND_FOLLOW,
        "volume_surge_chase": cfg.get("volume_surge_chase")
        if isinstance(cfg.get("volume_surge_chase"), dict)
        else {},
        "bollinger_squeeze": cfg.get("bollinger_squeeze")
        if isinstance(cfg.get("bollinger_squeeze"), dict)
        else {},
        "scalp_flash": cfg.get("scalp_flash") if isinstance(cfg.get("scalp_flash"), dict) else {},
        "drop_from_high_pct": cfg.get("drop_from_high_pct"),
        "rise_from_entry_pct": cfg.get("rise_from_entry_pct"),
        "drop_reference_high": normalize_drop_reference_high(cfg.get("drop_reference_high")),
        "reference_price_kind": (
            "midpoint"
            if str(cfg.get("reference_price_kind") or "high").strip().lower() == "midpoint"
            else "high"
        ),
        "midpoint_window": normalize_midpoint_window(cfg.get("midpoint_window")),
        "stop_loss_from_entry_pct": cfg.get("stop_loss_from_entry_pct"),
        "trading_enabled": cfg.get("trading_enabled"),
        "trading_symbol": cfg.get("trading_symbol"),
        "watch_symbols": cfg.get("watch_symbols") or [],
        "watch_random": bool(cfg.get("watch_random", False)),
        "watch_random_count": cfg.get("watch_random_count") or 12,
        "watch_pool_style": cfg.get("watch_pool_style") or "all",
        "trader_style": cfg.get("trader_style") or "",
        "allocated_krw": cfg.get("allocated_krw"),
        "strategy_text": cfg.get("strategy_text") or "",
        "loop_seconds": cfg.get("loop_seconds"),
        "buy_krw_amount": cfg.get("buy_krw_amount"),
        "cooldown_seconds_after_trade": cfg.get("cooldown_seconds_after_trade"),
        "buy_allocation_tiers": cfg.get("buy_allocation_tiers") or {},
        "buy_min_watch_positive_share_pct": cfg.get("buy_min_watch_positive_share_pct"),
        "watch_positive_vs_ref_min_pct": WATCH_POSITIVE_VS_REF_FIXED_PCT,
        "buy_entry_mode": cfg.get("buy_entry_mode") or BUY_ENTRY_MODE_DROP,
        "drop_midpoint_gate_min_pct": cfg.get("drop_midpoint_gate_min_pct"),
        "drop_midpoint_gate_window": normalize_midpoint_window(
            cfg.get("drop_midpoint_gate_window") or "1h"
        ),
        "watch_midpoint_up_window": normalize_midpoint_window(
            cfg.get("watch_midpoint_up_window") or "1h"
        ),
        "time_limit_exit": cfg.get("time_limit_exit")
        if isinstance(cfg.get("time_limit_exit"), dict)
        else {},
    }


def patch_first_scenario_from_flat(data: dict[str, Any]) -> dict[str, Any]:
    """레거시 POST /api/config 용: 첫 시나리오에 병합."""
    scenarios = load_scenarios_list()
    first = scenarios[0]
    patch = validate_scenario_patch(data)
    merged = {**first, **patch}
    scenarios[0] = validate_scenario_dict(merged, require_id=True)
    save_scenarios_list(scenarios)
    return scenario_to_flat(scenarios[0])


# --- per-scenario runtime state (평단·쿨다운) ---


def _load_state_blob() -> dict[str, Any]:
    if not SCENARIOS_STATE_PATH.is_file():
        return {}
    try:
        data = json.loads(SCENARIOS_STATE_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, OSError):
        return {}


def _save_state_blob(blob: dict[str, Any]) -> None:
    tmp = SCENARIOS_STATE_PATH.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(blob, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(SCENARIOS_STATE_PATH)


def get_dashboard_default_scenario_id() -> str | None:
    """대시보드에서 우선 선택할 시나리오 id (scenarios_state.json). 없거나 삭제됐으면 None."""
    sid = _load_state_blob().get("default_scenario_id")
    if not isinstance(sid, str) or not sid.strip():
        return None
    sid = sid.strip()
    if not get_scenario_by_id(sid):
        return None
    return sid


def set_dashboard_default_scenario_id(scenario_id: str) -> str:
    """현재 선택 트레이더를 대시보드 기본으로 저장."""
    migrate_if_needed()
    sid = str(scenario_id or "").strip()
    if not sid:
        raise ValueError("scenario_id 가 필요합니다.")
    if not get_scenario_by_id(sid):
        raise ValueError("시나리오를 찾을 수 없습니다.")
    blob = _load_state_blob()
    blob["default_scenario_id"] = sid
    _save_state_blob(blob)
    return sid


def load_trader_runtime_state(scenario_id: str, scenario: dict[str, Any]) -> dict[str, Any]:
    """종목별 평단·쿨다운 + 퀀트트레이더 가상 KRW 풀(allocated_krw 와 연동)."""
    blob = _load_state_blob()
    by_id = blob.get("by_id") if isinstance(blob.get("by_id"), dict) else {}
    raw = by_id.get(scenario_id)
    if not isinstance(raw, dict):
        raw = {}
    return _normalize_trader_state(raw, scenario)


def _normalize_trader_state(raw: dict[str, Any], scenario: dict[str, Any]) -> dict[str, Any]:
    legacy_sym = str(scenario.get("trading_symbol") or "BTC/KRW").strip().upper()
    if isinstance(raw.get("positions"), dict):
        positions: dict[str, dict[str, Any]] = {}
        for k, v in raw["positions"].items():
            try:
                ks = _validate_trading_symbol(k)
            except ValueError:
                continue
            if not isinstance(v, dict):
                continue
            ep = v.get("entry_price")
            lt = v.get("last_trade_ts")
            positions[ks] = {
                "entry_price": float(ep) if isinstance(ep, (int, float)) else None,
                "last_trade_ts": float(lt) if lt is not None and isinstance(lt, (int, float)) else None,
            }
        vk = raw.get("virtual_krw")
        if vk is not None:
            try:
                vk = float(vk)
            except (TypeError, ValueError):
                vk = None
        if vk is None:
            vk = _initial_virtual_krw(scenario)
        return {"positions": positions, "virtual_krw": vk}

    ep = raw.get("entry_price")
    lt = raw.get("last_trade_ts")
    pos: dict[str, dict[str, Any]] = {}
    if ep is not None or lt is not None:
        pos[legacy_sym] = {
            "entry_price": float(ep) if isinstance(ep, (int, float)) else None,
            "last_trade_ts": float(lt) if lt is not None and isinstance(lt, (int, float)) else None,
        }
    vk = raw.get("virtual_krw")
    if vk is not None:
        try:
            vk = float(vk)
        except (TypeError, ValueError):
            vk = None
    if vk is None:
        vk = _initial_virtual_krw(scenario)
    return {"positions": pos, "virtual_krw": vk}


def _initial_virtual_krw(scenario: dict[str, Any]) -> float | None:
    a = scenario.get("allocated_krw")
    if a is None or a == "":
        return None
    try:
        return float(a)
    except (TypeError, ValueError):
        return None


def save_trader_runtime_state(
    scenario_id: str,
    *,
    positions: dict[str, dict[str, Any]],
    virtual_krw: float | None,
) -> None:
    blob = _load_state_blob()
    by_id: dict[str, Any] = blob.get("by_id") if isinstance(blob.get("by_id"), dict) else {}
    serial_pos: dict[str, Any] = {}
    for sym, p in positions.items():
        serial_pos[sym] = {
            "entry_price": p.get("entry_price"),
            "last_trade_ts": p.get("last_trade_ts"),
        }
    by_id[scenario_id] = {"positions": serial_pos, "virtual_krw": virtual_krw}
    blob["by_id"] = by_id
    tmp = SCENARIOS_STATE_PATH.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(blob, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(SCENARIOS_STATE_PATH)


def effective_buy_krw(scenario: dict[str, Any]) -> float:
    """잔고 없이 표시·레거시용: 순위별 설정이 있으면 중위 구간 고정 원화 우선."""
    ts_eff = str(scenario.get("trading_style") or "").strip().lower()
    if ts_eff == TRADING_STYLE_VOLUME_SURGE_CHASE:
        vsc = scenario.get("volume_surge_chase")
        if isinstance(vsc, dict) and vsc.get("buy_krw") is not None:
            return float(vsc["buy_krw"])
    if ts_eff == TRADING_STYLE_BOLLINGER_SQUEEZE:
        bb = scenario.get("bollinger_squeeze")
        if isinstance(bb, dict) and bb.get("buy_krw") is not None:
            return float(bb["buy_krw"])
    if ts_eff == TRADING_STYLE_SCALP_FLASH:
        sf = scenario.get("scalp_flash")
        if isinstance(sf, dict) and sf.get("buy_krw") is not None:
            return float(sf["buy_krw"])
    tiers = scenario.get("buy_allocation_tiers")
    if isinstance(tiers, dict) and tiers:
        mid = tiers.get("middle") or {}
        if str(mid.get("mode") or "krw").lower() == "krw":
            mv = float(mid.get("value") or 0)
            if mv >= 1000:
                return mv
    v = scenario.get("buy_krw_amount")
    if v is not None:
        return float(v)
    return float(os.getenv("BUY_KRW_AMOUNT") or "6000")


def describe_effective_buy_krw(scenario: dict[str, Any]) -> tuple[float, str]:
    """effective_buy_krw 와 동일한 금액 + UI용 출처 키."""
    ts_eff = str(scenario.get("trading_style") or "").strip().lower()
    if ts_eff == TRADING_STYLE_VOLUME_SURGE_CHASE:
        vsc = scenario.get("volume_surge_chase")
        if isinstance(vsc, dict) and vsc.get("buy_krw") is not None:
            return float(vsc["buy_krw"]), "vsc_buy_krw"
    if ts_eff == TRADING_STYLE_BOLLINGER_SQUEEZE:
        bb = scenario.get("bollinger_squeeze")
        if isinstance(bb, dict) and bb.get("buy_krw") is not None:
            return float(bb["buy_krw"]), "bb_buy_krw"
    if ts_eff == TRADING_STYLE_SCALP_FLASH:
        sf = scenario.get("scalp_flash")
        if isinstance(sf, dict) and sf.get("buy_krw") is not None:
            return float(sf["buy_krw"]), "scalp_buy_krw"
    tiers = scenario.get("buy_allocation_tiers")
    if isinstance(tiers, dict) and tiers:
        mid = tiers.get("middle") or {}
        if str(mid.get("mode") or "krw").lower() == "krw":
            mv = float(mid.get("value") or 0)
            if mv >= 1000:
                return mv, "tier_middle"
    v = scenario.get("buy_krw_amount")
    if v is not None:
        return float(v), "buy_krw_amount"
    return float(os.getenv("BUY_KRW_AMOUNT") or "6000"), "env_default"


def default_symbol_for_manual_buy(scenario: dict[str, Any]) -> str:
    """즉시 매수에서 symbol 을 생략할 때 서버가 쓰는 첫 감시 종목."""
    return effective_watch_symbols(scenario)[0]


def manual_order_watch_summary(scenario: dict[str, Any]) -> str:
    """대시보드 즉시매수 패널용 감시 설명 한 줄."""
    if scenario.get("watch_random"):
        n = int(scenario.get("watch_random_count") or 12)
        st = str(scenario.get("watch_pool_style") or "all").strip()
        return f"랜덤 감시 · 루프마다 {n}종 (풀: {st}) — 주문 API는 입력·기본 심볼로 결정"
    ws = _normalize_watch_list(scenario.get("watch_symbols"))
    if ws:
        show = list(ws)
        if len(show) > 8:
            tail = " 외 " + str(len(show) - 8) + "종"
            show = show[:8]
        else:
            tail = ""
        joined = " · ".join(show)
        return f"고정 감시 {len(ws)}종 — {joined}{tail} — 심볼 비우면 첫 종목 {ws[0]}"
    return f"감시: {scenario.get('trading_symbol') or 'BTC/KRW'}"


def _manual_order_tier_line(scenario: dict[str, Any]) -> str:
    tiers = scenario.get("buy_allocation_tiers")
    if not isinstance(tiers, dict) or not tiers:
        bka = scenario.get("buy_krw_amount")
        if bka is not None and str(bka).strip() != "":
            try:
                v = float(bka)
                if v >= 1000:
                    return f"1회 매수액: {v:,.0f}원 (시나리오 buy_krw_amount)"
            except (TypeError, ValueError):
                pass
        return "1회 매수액: 시나리오 미설정 — 환경 BUY_KRW_AMOUNT(없으면 6000원)"
    label_ko = {"upper": "상위", "middle": "중위", "lower": "하위"}
    parts: list[str] = []
    for slot in ("upper", "middle", "lower"):
        t = tiers.get(slot)
        if not isinstance(t, dict):
            continue
        mode = str(t.get("mode") or "krw").lower()
        try:
            val = float(t.get("value") or 0)
        except (TypeError, ValueError):
            val = 0.0
        if val <= 0:
            continue
        label = label_ko.get(slot, slot)
        if mode == "pct":
            parts.append(f"{label} {val:g}%")
        else:
            parts.append(f"{label} {val:,.0f}원")
    if parts:
        return "순위별 매수(자동): " + ", ".join(parts)
    return "순위별 매수: 활성 티어 없음(0)"


def manual_order_auto_buy_text(scenario: dict[str, Any]) -> str:
    """조건부 자동매매 매수 요약 — 즉시 시장가 매수와 구분."""
    lines: list[str] = []
    te = scenario.get("trading_enabled", True)
    lines.append(f"자동매매: {'켜짐' if te else '꺼짐'}")
    lines.append(f"루프 주기: {effective_interval_sec(scenario)}초")
    ts = str(scenario.get("trading_style") or TRADING_STYLE_TREND_FOLLOW).strip().lower()
    if ts not in (
        TRADING_STYLE_TREND_FOLLOW,
        TRADING_STYLE_VOLUME_SURGE_CHASE,
        TRADING_STYLE_BOLLINGER_SQUEEZE,
        TRADING_STYLE_SCALP_FLASH,
    ):
        ts = TRADING_STYLE_TREND_FOLLOW
    if ts == TRADING_STYLE_TREND_FOLLOW:
        bem = str(scenario.get("buy_entry_mode") or BUY_ENTRY_MODE_DROP).strip().lower()
        if bem not in (
            BUY_ENTRY_MODE_DROP,
            BUY_ENTRY_MODE_MIDPOINT_RISE,
            BUY_ENTRY_MODE_WATCH_SHARE,
        ):
            bem = BUY_ENTRY_MODE_DROP
        if bem == BUY_ENTRY_MODE_DROP:
            dr = normalize_drop_reference_high(scenario.get("drop_reference_high"))
            dfp = scenario.get("drop_from_high_pct")
            if dfp is not None and dfp != "":
                try:
                    pct = float(dfp) * 100.0
                    lines.append(
                        f"매수 신호(검토): 기준 고가({dr}) 대비 하락 {pct:.4g}% 이상"
                    )
                except (TypeError, ValueError):
                    lines.append("매수 신호: 기준 고가 대비 하락 — 값 오류")
            else:
                lines.append("매수 신호: 기준 고가 대비 하락 — 미설정")
        elif bem == BUY_ENTRY_MODE_MIDPOINT_RISE:
            dmw = normalize_midpoint_window(scenario.get("drop_midpoint_gate_window") or "1h")
            dmg = scenario.get("drop_midpoint_gate_min_pct")
            if dmg is not None and str(dmg).strip() != "":
                try:
                    g = float(dmg)
                    if g > 0:
                        lines.append(
                            f"매수 신호(검토): 미들포인트({dmw}) 대비 +{g:g}%p 이상"
                        )
                except (TypeError, ValueError):
                    lines.append("매수 신호: 미들 대비 상승 — 값 오류")
            else:
                lines.append("매수 신호: 미들 대비 상승 — 미설정")
        else:
            bms = scenario.get("buy_min_watch_positive_share_pct")
            try:
                bm = float(bms) if bms is not None and bms != "" else None
            except (TypeError, ValueError):
                bm = None
            if bm is not None and bm > 0:
                lines.append(
                    f"매수 신호(검토): 감시 종목 중 기준 고가 대비 +{WATCH_POSITIVE_VS_REF_FIXED_PCT:g}% 이상인 비중 ≥ {bm:g}%"
                )
            else:
                lines.append("매수 신호: 감시 플러스 비중 — 미설정")
        lines.append(_manual_order_tier_line(scenario))
        lines.append("※ 감시 종목·필터는 위 「감시」와 동일")
    elif ts == TRADING_STYLE_VOLUME_SURGE_CHASE:
        lines.append("스타일: 거래량급등 — 매수는 전용 엔진(시나리오 volume_surge_chase)을 따릅니다.")
    elif ts == TRADING_STYLE_BOLLINGER_SQUEEZE:
        lines.append("스타일: 볼린저 스퀴즈 — 매수는 전용 엔진(bollinger_squeeze)을 따릅니다.")
    else:
        lines.append("스타일: 초단타 — 매수는 전용 엔진(scalp_flash)을 따릅니다.")
    return "\n".join(lines)


def manual_order_auto_sell_text(scenario: dict[str, Any]) -> str:
    """조건부 자동매매 매도(익절·손절·쿨다운) 요약."""
    lines: list[str] = []
    ts = str(scenario.get("trading_style") or TRADING_STYLE_TREND_FOLLOW).strip().lower()
    if ts not in (
        TRADING_STYLE_TREND_FOLLOW,
        TRADING_STYLE_VOLUME_SURGE_CHASE,
        TRADING_STYLE_BOLLINGER_SQUEEZE,
        TRADING_STYLE_SCALP_FLASH,
    ):
        ts = TRADING_STYLE_TREND_FOLLOW
    rise = scenario.get("rise_from_entry_pct")
    sl = scenario.get("stop_loss_from_entry_pct")
    cd = scenario.get("cooldown_seconds_after_trade")
    try:
        cdv = int(cd) if cd is not None and str(cd).strip() != "" else 0
    except (TypeError, ValueError):
        cdv = 0
    if rise is not None and str(rise).strip() != "":
        try:
            rp = float(rise) * 100.0
            lines.append(f"익절(검토): 평단 대비 상승 {rp:.4g}% 이상")
        except (TypeError, ValueError):
            lines.append("익절: 값 오류")
    else:
        lines.append("익절: 미설정")
    if sl is not None and str(sl).strip() != "":
        try:
            sp = float(sl) * 100.0
            lines.append(f"손절(검토): 평단 대비 하락 {sp:.4g}% 이상")
        except (TypeError, ValueError):
            lines.append("손절: 값 오류")
    else:
        lines.append("손절: 없음(미설정)")
    lines.append(f"체결 후 쿨다운: {cdv}초")
    if ts == TRADING_STYLE_TREND_FOLLOW:
        tle = scenario.get("time_limit_exit")
        if isinstance(tle, dict) and tle.get("enabled"):
            try:
                tdm = int(tle.get("target_deadline_minutes") or 30)
                qwm = int(tle.get("quick_take_window_minutes") or 5)
                qtp = float(tle.get("quick_take_profit_pct") or 0.0003) * 100.0
                lth = float(tle.get("loss_branch_threshold_pct") or -0.0001) * 100.0
                lrt = float(tle.get("loss_recovery_target_pct") or 0.0003) * 100.0
                lfm = int(tle.get("loss_force_exit_minutes") or 10)
                lines.append(
                    f"시간제한 매도: 목표 미달 {tdm}분·빠른익절 {qwm}분/{qtp:.4g}%·"
                    f"손실구간 ≤{lth:.4g}% → 회복 {lrt:.4g}% 또는 {lfm}분 강제"
                )
            except (TypeError, ValueError):
                lines.append("시간제한 매도: 설정 요약 오류")
    if ts != TRADING_STYLE_TREND_FOLLOW:
        lines.append(
            "※ 대세추매가 아닌 스타일은 엔진별로 위 수치와 다른 청산 규칙이 있을 수 있습니다."
        )
    return "\n".join(lines)


def effective_interval_sec(scenario: dict[str, Any]) -> int:
    v = scenario.get("loop_seconds")
    if v is not None:
        return int(v)
    return int(os.getenv("LOOP_SECONDS") or "60")


def global_loop_seconds(active_scenarios: list[dict[str, Any]]) -> int:
    """활성 시나리오들 중 가장 짧은 주기(최소 1초)."""
    if not active_scenarios:
        return max(1, int(os.getenv("LOOP_SECONDS") or "60"))
    vals = [effective_interval_sec(s) for s in active_scenarios]
    return max(1, min(vals))


def active_enabled_scenarios(scenarios: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """enabled 인 퀀트트레이더만. 종목은 시나리오마다 watch_symbols 로 분리(저장 시 겹침 검증)."""
    return [s for s in scenarios if s.get("enabled", True)]


def assign_watch_symbols_per_loop(
    active: list[dict[str, Any]],
    all_krw: list[str],
    rng: random.Random,
    tickers_map: dict[str, dict[str, Any]] | None = None,
    exchange: Any | None = None,
) -> dict[str, list[str]]:
    """
    수동 목록 트레이더: watch_symbols 고정.
    랜덤 트레이더: watch_pool_style 로 후보를 정렬·필터한 뒤 남은 풀에서 겹치지 않게 할당.
    tickers_map: ccxt fetch_tickers() 결과(스타일 필터에 필요).
    거래량급등·볼린저 스퀴즈·초단타 스타일은 감시 풀을 쓰지 않으며 빈 목록을 반환합니다.
    """
    tm = tickers_map if isinstance(tickers_map, dict) else {}
    by_id: dict[str, list[str]] = {}
    used: set[str] = set()
    random_traders: list[dict[str, Any]] = []
    for s in active:
        sid = str(s.get("id") or "")
        if not sid:
            continue
        if s.get("watch_random"):
            ts0 = str(s.get("trading_style") or TRADING_STYLE_TREND_FOLLOW)
            if ts0 in (
                TRADING_STYLE_VOLUME_SURGE_CHASE,
                TRADING_STYLE_BOLLINGER_SQUEEZE,
                TRADING_STYLE_SCALP_FLASH,
            ):
                by_id[sid] = []
                continue
            random_traders.append(s)
            continue
        syms = effective_watch_symbols(s)
        by_id[sid] = syms
        for sym in syms:
            used.add(sym)
    remaining = [x for x in all_krw if x not in used]
    random_traders.sort(key=lambda x: str(x.get("id") or ""))
    for s in random_traders:
        sid = str(s.get("id") or "")
        want = int(s.get("watch_random_count") or 12)
        want = max(MIN_RANDOM_WATCH, min(want, MAX_WATCH_SYMBOLS))
        style = str(s.get("watch_pool_style") or "all")
        pool_f = filter_krw_symbols_by_style(remaining, tm, style)
        if len(pool_f) < want:
            pool_f = list(remaining)
        rng.shuffle(pool_f)
        chunk = pool_f[:want]
        by_id[sid] = chunk
        for sym in chunk:
            if sym in remaining:
                remaining.remove(sym)
    return by_id
