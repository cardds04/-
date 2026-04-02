"""
사용자 한국어 발화에서 시나리오 수치 필드(drop_from_high_pct 등)를 추출합니다.

- drop_from_high_pct / rise_from_entry_pct 는 **scenarios.json 에서 소수**로 저장됩니다.
  예: 3% 하락 → **0.03** (퍼센트 값 3.0 이 아님)
- AI·정규식 공통으로 사용합니다.
"""

from __future__ import annotations

import re
from typing import Any

from scenarios import validate_scenario_patch


def _to_fraction_from_percent_num(n: float) -> float:
    """'3' 또는 '3.5' 처럼 퍼센트 숫자만 있을 때 → 0.03, 0.035."""
    return abs(float(n)) / 100.0


def _try_drop_from_text(raw: str) -> float | None:
    """24h 고가 대비 하락 % → drop_from_high_pct (소수)."""
    s = raw.strip()
    if not s:
        return None

    patterns = (
        # "3% 하락", "3% 이상 하락", "-3% 하락"
        r"(?:^|[^\d])(-?\d+(?:\.\d+)?)\s*%\s*(?:이상\s*)?(?:으로\s*)?(?:하락|빠지|내려)",
        r"(?:하락|빠지|내려)(?:[^\d%]{0,14})?(-?\d+(?:\.\d+)?)\s*%",
        r"(?:하락|빠지)(?:률|폭)?\s*[:：]?\s*(-?\d+(?:\.\d+)?)\s*%",
        # "고점 대비 3%", "24h 3%", "24시간 3%"
        r"(?:고점|최고가|24\s*h|24시간)(?:[^\d%]{0,14})?(-?\d+(?:\.\d+)?)\s*%",
        r"(?:매수|사면|살\s*때)(?:[^\d%]{0,12})?(-?\d+(?:\.\d+)?)\s*%",
        # "3퍼센트 하락", "3퍼 빠지면"
        r"(-?\d+(?:\.\d+)?)\s*퍼(?:센트)?\s*(?:까지\s*)?(?:하락|빠지|내려)",
        r"(?:하락|빠지)(?:[^\d]{0,8})?(-?\d+(?:\.\d+)?)\s*퍼",
        # 기존 패턴과 유사
        r"(?:하락|고점\s*대비|24\s*h|24시간)(?:[^\d%]{0,12})?(-?\d+(?:\.\d+)?)\s*%",
        r"매수\s*(?:조건|트리거)(?:[^\d%]{0,8})?(-?\d+(?:\.\d+)?)\s*%",
        r"(-?\d+(?:\.\d+)?)\s*%\s*(?:로\s*)?하락",
    )
    for pat in patterns:
        m = re.search(pat, s, re.IGNORECASE)
        if m:
            num = float(m.group(1))
            frac = _to_fraction_from_percent_num(num)
            if 0.0001 <= frac <= 0.95:
                return frac
    return None


def _try_rise_from_text(raw: str) -> float | None:
    """평단 대비 익절 % → rise_from_entry_pct (소수)."""
    s = raw.strip()
    if not s:
        return None

    patterns = (
        r"(?:익절|상승|매도\s*트리거|평단\s*대비)(?:[^\d%]{0,14})?(-?\d+(?:\.\d+)?)\s*%",
        r"(-?\d+(?:\.\d+)?)\s*%\s*(?:로\s*)?(?:익절|상승)",
        r"(-?\d+(?:\.\d+)?)\s*퍼(?:센트)?\s*(?:까지\s*)?(?:오르|상승|익절)",
        r"(?:익절|매도)(?:[^\d%]{0,10})?(-?\d+(?:\.\d+)?)\s*%",
        r"(?:익절|상승)(?:률|폭)?\s*[:：]?\s*(-?\d+(?:\.\d+)?)\s*%",
    )
    for pat in patterns:
        m = re.search(pat, s, re.IGNORECASE)
        if m:
            num = float(m.group(1))
            frac = _to_fraction_from_percent_num(num)
            if 0.0001 <= frac <= 2.0:
                return frac
    return None


def _try_buy_krw_from_text(raw: str) -> float | None:
    s = raw.strip()
    if not s:
        return None
    m = re.search(r"(?:매수\s*금액|매수\s*금|한\s*번에)\s*(\d{1,12})\s*원", s)
    if m:
        v = float(m.group(1))
        return v if v >= 1000 else None
    m = re.search(r"(\d+)\s*만\s*원(?:\s*매수)?", s)
    if m:
        return float(m.group(1)) * 10000.0
    return None


def _try_cooldown_from_text(raw: str) -> int | None:
    m = re.search(r"쿨다운\s*(\d+)\s*초", raw)
    if m:
        c = int(m.group(1))
        return c if 0 <= c <= 86400 else None
    return None


def _try_loop_seconds_from_text(raw: str) -> int | None:
    for pat in (r"주기\s*(\d+)\s*초", r"(\d+)\s*초\s*마다", r"루프\s*(\d+)\s*초"):
        m = re.search(pat, raw)
        if m:
            sec = int(m.group(1))
            return sec if sec >= 1 else None
    return None


def _try_trading_enabled_from_text(raw: str) -> bool | None:
    if re.search(r"자동매매\s*(?:꺼|끄|off|중지|멈|정지|해제)", raw, re.IGNORECASE):
        return False
    if re.search(r"자동매매\s*(?:켜|켜줘|on|시작|허용|활성)", raw, re.IGNORECASE):
        return True
    return None


def extract_numeric_strategy_patch(text: str) -> dict[str, Any]:
    """
    사용자 문장에서 봇이 실제로 쓰는 수치 필드만 추출합니다.

    - drop_from_high_pct: '3% 하락' → 0.03
    - rise_from_entry_pct: '5% 익절' → 0.05
    """
    raw = (text or "").strip()
    if not raw:
        return {}

    cand: dict[str, Any] = {}

    d = _try_drop_from_text(raw)
    if d is not None:
        cand["drop_from_high_pct"] = d

    r = _try_rise_from_text(raw)
    if r is not None:
        cand["rise_from_entry_pct"] = r

    bk = _try_buy_krw_from_text(raw)
    if bk is not None:
        cand["buy_krw_amount"] = bk

    cd = _try_cooldown_from_text(raw)
    if cd is not None:
        cand["cooldown_seconds_after_trade"] = cd

    ls = _try_loop_seconds_from_text(raw)
    if ls is not None:
        cand["loop_seconds"] = ls

    te = _try_trading_enabled_from_text(raw)
    if te is not None:
        cand["trading_enabled"] = te

    if not cand:
        return {}

    try:
        return validate_scenario_patch(cand)
    except ValueError:
        out: dict[str, Any] = {}
        for key in list(cand.keys()):
            try:
                part = validate_scenario_patch({key: cand[key]})
                out.update(part)
            except ValueError:
                continue
        return out


def parse_vsc_numeric_block(text: str) -> dict[str, Any]:
    """strategy_text 내 [VSC_NUMERIC]…[/VSC_NUMERIC] 블록 파싱 (거래량급등 저장 스냅샷)."""
    m = re.search(r"\[VSC_NUMERIC\](.*?)\[/VSC_NUMERIC\]", text, re.DOTALL | re.IGNORECASE)
    if not m:
        return {}
    out: dict[str, Any] = {}
    for line in m.group(1).splitlines():
        line = line.strip()
        if not line or "=" not in line:
            continue
        k, _, v = line.partition("=")
        k, v = k.strip(), v.strip()
        if k == "lookback":
            out[k] = v.lower()
            continue
        if v == "" or v.lower() in ("none", "null"):
            out[k] = None
            continue
        try:
            out[k] = float(v)
        except (TypeError, ValueError):
            continue
    return out


def _numeric_consistency_vsc(scenario: dict[str, Any]) -> dict[str, Any]:
    from scenarios import _normalize_volume_surge_chase

    text = (scenario.get("strategy_text") or "").strip()
    ex = parse_vsc_numeric_block(text) if text else {}
    raw_vsc = scenario.get("volume_surge_chase")
    try:
        stored = _normalize_volume_surge_chase(raw_vsc if isinstance(raw_vsc, dict) else {})
    except ValueError:
        stored = {}
    mismatch = False
    fields: list[str] = []
    for k in ("min_surge_ratio", "min_rise_pct", "buy_krw", "rise_from_entry_pct"):
        if k not in ex:
            continue
        ev = ex[k]
        sv = stored.get(k)
        if sv is None or ev is None:
            continue
        if abs(float(ev) - float(sv)) > 1e-4 + 1e-6 * abs(float(sv)):
            mismatch = True
            fields.append(k)
    if "lookback" in ex:
        lb_st = str(stored.get("lookback") or "").lower()
        if str(ex["lookback"]).strip().lower() != lb_st:
            mismatch = True
            fields.append("lookback")
    sl_st = stored.get("stop_loss_from_entry_pct")
    if "stop_loss_from_entry_pct" in ex:
        ev = ex["stop_loss_from_entry_pct"]
        if ev is None or (isinstance(ev, (int, float)) and float(ev) <= 0):
            if sl_st is not None and float(sl_st) > 0:
                mismatch = True
                fields.append("stop_loss_from_entry_pct")
        elif sl_st is None or abs(float(ev) - float(sl_st)) > 1e-5:
            mismatch = True
            fields.append("stop_loss_from_entry_pct")
    return {
        "mismatch": mismatch,
        "extracted_from_text": ex,
        "stored_drop_from_high_pct": None,
        "stored_rise_from_entry_pct": float(scenario.get("rise_from_entry_pct") or 0.05),
        "stored_buy_krw_effective": float(stored.get("buy_krw") or 0),
        "stored_buy_krw_raw": scenario.get("buy_krw_amount"),
        "stored_volume_surge_chase": stored,
        "mismatch_fields": fields,
    }


def numeric_consistency_from_scenario(scenario: dict[str, Any]) -> dict[str, Any]:
    """
    strategy_text 에서 추출한 수치와 scenarios.json 에 저장된 실제 매매 필드를 비교합니다.
    둘 다 존재하고 차이가 나면 mismatch True (대시보드 빨간 경고용).
    """
    ts = str(scenario.get("trading_style") or "").strip().lower()
    if ts == "volume_surge_chase":
        return _numeric_consistency_vsc(scenario)

    from scenarios import effective_buy_krw

    text = (scenario.get("strategy_text") or "").strip()
    ex = extract_numeric_strategy_patch(text) if text else {}
    sd = scenario.get("drop_from_high_pct")
    stored_drop = float(sd) if sd is not None else None
    stored_rise = float(scenario.get("rise_from_entry_pct") or 0.05)
    eff_buy = float(effective_buy_krw(scenario))
    raw_buy = scenario.get("buy_krw_amount")
    mismatch = False
    fields: list[str] = []
    if "drop_from_high_pct" in ex:
        exd = float(ex["drop_from_high_pct"])
        if stored_drop is None or abs(exd - stored_drop) > 1e-5:
            mismatch = True
            fields.append("drop_from_high_pct")
    if "rise_from_entry_pct" in ex:
        if abs(float(ex["rise_from_entry_pct"]) - stored_rise) > 1e-5:
            mismatch = True
            fields.append("rise_from_entry_pct")
    if "buy_krw_amount" in ex:
        if abs(float(ex["buy_krw_amount"]) - eff_buy) > 1.0:
            mismatch = True
            fields.append("buy_krw_amount")
    return {
        "mismatch": mismatch,
        "extracted_from_text": ex,
        "stored_drop_from_high_pct": stored_drop,
        "stored_rise_from_entry_pct": stored_rise,
        "stored_buy_krw_effective": eff_buy,
        "stored_buy_krw_raw": raw_buy,
        "mismatch_fields": fields,
    }


def merge_utterance_patch_into_scenario(scenario_id: str, user_text: str) -> tuple[dict[str, Any] | None, dict[str, Any]]:
    """
    사용자 발화에서 수치를 추출해 해당 시나리오에 patch_scenario 로 반영합니다.

    Returns:
        (merged_scenario_or_None, applied_patch_dict)
    """
    from scenarios import patch_scenario

    patch = extract_numeric_strategy_patch(user_text)
    if not patch:
        return None, {}
    merged = patch_scenario(scenario_id, patch)
    return merged, patch
