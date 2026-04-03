"""단순 가격 기반 시그널: 24h 고점 대비 -3% 매수, 매수가 대비 +5% 매도."""

from __future__ import annotations

import os
from typing import Any

# 24시간 최고가 대비 하락률(이하이면 매수 신호)
DROP_FROM_24H_HIGH = 0.03
# 매수 평단 대비 상승률(이상이면 매도 신호)
RISE_FROM_ENTRY = 0.05

# 베이스 잔고가 이 값 이하면 '보유 없음'으로 간주 (먼지)
BASE_DUST = 1e-8


def normalize_stop_loss_frac(sl_raw: Any) -> float | None:
    """시나리오 stop_loss_from_entry_pct → 유효한 손절 비율(소수) 또는 None(미사용)."""
    if sl_raw is None or str(sl_raw).strip() == "":
        return None
    try:
        sl_f = float(sl_raw)
    except (TypeError, ValueError):
        return None
    if sl_f < 0.0001:
        return None
    return sl_f


def stop_loss_price_epsilon(entry_price: float) -> float:
    """평단·손절선 부근 부동소수점 오차 완화(tp_sl_recheck 와 동일 스케일)."""
    return max(1e-10, abs(float(entry_price)) * 1e-9)


def stop_loss_when_trading_disabled_enabled() -> bool:
    """
    True(기본): 업무시작(trading_enabled)이 꺼져 있어도 손절 %가 설정된 시나리오는
    주기 재확인·메인 루프에서 손절 매도만 실행한다.
    끄려면 STOP_LOSS_WHEN_TRADING_DISABLED=0
    """
    raw = os.getenv("STOP_LOSS_WHEN_TRADING_DISABLED")
    if raw is None or str(raw).strip() == "":
        return True
    return str(raw).strip().lower() in ("1", "true", "yes", "on")


def scenario_included_in_tp_sl_recheck(scen: dict[str, Any]) -> bool:
    """익절·손절 재확인 스캔에 시나리오를 넣을지(자동매매 OFF + 손절만 예외 가능)."""
    if bool(scen.get("trading_enabled", True)):
        return True
    return (
        stop_loss_when_trading_disabled_enabled()
        and normalize_stop_loss_frac(scen.get("stop_loss_from_entry_pct")) is not None
    )


def allow_stop_loss_sell_while_trading_disabled(scen: dict[str, Any]) -> bool:
    """자동매매 OFF일 때 손절선 매도 주문을 내도 되는지(손절 %·env)."""
    if bool(scen.get("trading_enabled", True)):
        return False
    return (
        stop_loss_when_trading_disabled_enabled()
        and normalize_stop_loss_frac(scen.get("stop_loss_from_entry_pct")) is not None
    )


def stop_loss_triggered(
    *,
    entry_price: float | None,
    last: float,
    stop_loss_from_entry_pct: Any,
) -> bool:
    """
    현재가(또는 호출부에서 넘긴 보수적 가격)가 손절선 이하이면 True.
    메인 루프에서 쿨다운 우회·시그널 보조용.
    """
    if entry_price is None:
        return False
    try:
        ep = float(entry_price)
    except (TypeError, ValueError):
        return False
    if ep <= 0:
        return False
    sl_f = normalize_stop_loss_frac(stop_loss_from_entry_pct)
    if sl_f is None:
        return False
    stop_line = ep * (1.0 - sl_f)
    eps = stop_loss_price_epsilon(ep)
    try:
        px = float(last)
    except (TypeError, ValueError):
        return False
    return px <= stop_line + eps


def drop_from_high_epsilon(reference_high: float) -> float:
    """호가·부동소수점으로 last <= ref*(1-drop) 경계 비교가 실패하는 것을 완화."""
    return max(1e-12, abs(float(reference_high)) * 1e-10)


def sync_position_highest_price(
    sym_p: dict[str, Any],
    last: float,
    entry_price: float,
) -> bool:
    """
    보유 종목 positions[sym] 에 highest_price(체결 후 경과 고가)를 갱신.
    최초 없으면 max(평단, 현재가)로 두고, 이후 현재가가 더 높으면 올림. 변경 시 True.
    """
    lv = float(last)
    ep = float(entry_price)
    hp_raw = sym_p.get("highest_price")
    if hp_raw is None or not isinstance(hp_raw, (int, float)):
        sym_p["highest_price"] = max(ep, lv)
        return True
    hp = float(hp_raw)
    if lv > hp + 1e-12:
        sym_p["highest_price"] = lv
        return True
    return False


def trailing_stop_sell_triggered(
    *,
    last: float,
    entry_price: float,
    highest_price: float | None,
    trailing_stop: dict[str, Any] | None,
) -> bool:
    """
    activation_pct(소수, 예 0.01=1%) 이상 누적 수익일 때,
    highest_price 대비 callback_pct(소수)만큼 하락한 현재가면 True.
    손절은 호출부에서 항상 먼저 판단할 것.
    """
    ts = trailing_stop if isinstance(trailing_stop, dict) else None
    if not ts or not ts.get("enabled"):
        return False
    try:
        act = float(ts.get("activation_pct") or 0)
        cb = float(ts.get("callback_pct") or 0)
    except (TypeError, ValueError):
        return False
    if act <= 0 or cb <= 0:
        return False
    ep = float(entry_price)
    if ep <= 0:
        return False
    lv = float(last)
    if lv / ep - 1.0 + 1e-15 < act:
        return False
    if highest_price is None or not isinstance(highest_price, (int, float)):
        return False
    hp = float(highest_price)
    if hp <= 0:
        return False
    floor = hp * (1.0 - cb)
    eps = max(1e-12, abs(hp) * 1e-10)
    return lv <= floor + eps


def drop_from_high_buy_triggered(reference_high: float, last: float, drop: float) -> bool:
    """
    drop_from_high_pct 는 소수(0.01% → 0.0001).
    아주 작은 drop 에서 ref*(1-drop) 와 last 비교만으로는 BUY 가 영원히 안 날 수 있음(부동소수점).
    """
    if reference_high <= 1e-12:
        return False
    d = float(drop)
    th = float(reference_high) * (1.0 - d)
    return float(last) <= th + drop_from_high_epsilon(reference_high)


def evaluate_signal(
    *,
    reference_high: float,
    last: float,
    entry_price: float | None,
    base_free: float,
    drop_from_high_pct: float | None = None,
    rise_from_entry_pct: float | None = None,
    stop_loss_from_entry_pct: float | None = None,
    stop_loss_last: float | None = None,
    buy_using_watch_positive: bool = False,
    watch_positive_vs_ref_pct: float = 0.5,
    buy_using_midpoint_rise_only: bool = False,
    midpoint_gate_level: float | None = None,
    midpoint_gate_min_pct: float | None = None,
    highest_price: float | None = None,
    trailing_stop: dict[str, Any] | None = None,
) -> str:
    """
    - 보유 없음:
      - buy_using_watch_positive: 기준가 대비 +watch_positive_vs_ref_pct%p 이상 → BUY.
      - buy_using_midpoint_rise_only: midpoint_gate_level 대비 +midpoint_gate_min_pct%p 이상 → BUY.
      - 그 외: drop_from_high_pct 가 있으면 기준 고가 대비 drop% 이하 → BUY.
        None(미사용)이면 매수 조건 없이 HOLD.
    - 보유 있음: 손절 → 트레일링 스톱(설정 시) → 고정 익절 순. reference_high 는 미사용.
    - stop_loss_last: 있으면 손절 판단만 이 가격 사용(예: min(last, bid)). 익절·매수는 last 유지.
    """
    rise = rise_from_entry_pct if rise_from_entry_pct is not None else RISE_FROM_ENTRY
    sl_f = normalize_stop_loss_frac(stop_loss_from_entry_pct)

    has_position = base_free > BASE_DUST

    if not has_position:
        if buy_using_watch_positive:
            if reference_high <= 1e-12:
                return "HOLD"
            gate = float(watch_positive_vs_ref_pct)
            threshold = reference_high * (1.0 + gate / 100.0)
            if last + 1e-12 >= threshold:
                return "BUY"
            return "HOLD"
        if buy_using_midpoint_rise_only:
            mgl = midpoint_gate_level
            mgp = midpoint_gate_min_pct
            if mgl is None or float(mgl) <= 1e-12:
                return "HOLD"
            if mgp is None or float(mgp) <= 1e-12:
                return "HOLD"
            gate_pp = float(mgp)
            ml = float(mgl)
            th_mid = ml * (1.0 + gate_pp / 100.0)
            eps_m = max(1e-12, abs(ml) * 1e-10)
            if float(last) + eps_m >= th_mid:
                return "BUY"
            return "HOLD"
        if drop_from_high_pct is None:
            return "HOLD"
        drop = float(drop_from_high_pct)
        if drop_from_high_buy_triggered(reference_high, last, drop):
            return "BUY"
        return "HOLD"

    if entry_price is None or entry_price <= 0:
        return "HOLD"

    take_profit = entry_price * (1.0 + rise)
    if sl_f is not None:
        stop_line = entry_price * (1.0 - sl_f)
        sl_eps = stop_loss_price_epsilon(float(entry_price))
        px_sl = float(stop_loss_last) if stop_loss_last is not None else float(last)
        if px_sl <= stop_line + sl_eps:
            return "SELL"
    if trailing_stop_sell_triggered(
        last=float(last),
        entry_price=float(entry_price),
        highest_price=highest_price,
        trailing_stop=trailing_stop,
    ):
        return "SELL"
    if last >= take_profit:
        return "SELL"
    return "HOLD"


def time_limit_exit_signal(
    *,
    last: float,
    entry_price: float,
    base_free: float,
    now_ts: float,
    entry_ts: float | None,
    rise_from_entry_pct: float,
    stop_loss_from_entry_pct: float | None,
    tl: dict[str, Any],
    loss_armed: bool,
    stop_loss_last: float | None = None,
    highest_price: float | None = None,
    trailing_stop: dict[str, Any] | None = None,
) -> tuple[str, str]:
    """
    보유 중일 때만. SELL / HOLD 와 사유 코드.
    enabled 가 아니면 ("HOLD", "") — 호출부에서 evaluate_signal 을 쓰세요.
    loss_armed: 한 번이라도 손실 구간(loss_branch_threshold_pct 이하)에 들어갔으면 True(포지션 상태에 저장).
    stop_loss_last: 손절선 비교 전용 가격(없으면 last). 익절·시간제한 판단은 last 유지.
    """
    if not tl.get("enabled"):
        return "HOLD", ""
    if base_free <= BASE_DUST:
        return "HOLD", ""
    if entry_price is None or entry_price <= 0:
        return "HOLD", ""
    sl_f = normalize_stop_loss_frac(stop_loss_from_entry_pct)
    if sl_f is not None:
        ep = float(entry_price)
        stop_line = ep * (1.0 - sl_f)
        sl_eps = stop_loss_price_epsilon(ep)
        px_sl = float(stop_loss_last) if stop_loss_last is not None else float(last)
        if px_sl <= stop_line + sl_eps:
            return "SELL", "sl"

    if trailing_stop_sell_triggered(
        last=float(last),
        entry_price=float(entry_price),
        highest_price=highest_price,
        trailing_stop=trailing_stop,
    ):
        return "SELL", "trail"

    if entry_ts is None:
        return "HOLD", ""

    rise = float(rise_from_entry_pct)
    pnl_frac = float(last) / float(entry_price) - 1.0
    elapsed_sec = max(0.0, float(now_ts) - float(entry_ts))
    elapsed_min = elapsed_sec / 60.0

    qwm = int(tl.get("quick_take_window_minutes") or 5)
    qtp = float(tl.get("quick_take_profit_pct") or 0.0003)
    if elapsed_min <= float(qwm) and pnl_frac >= qtp:
        return "SELL", "quick"

    lrt = float(tl.get("loss_recovery_target_pct") or 0.0003)
    lfm = int(tl.get("loss_force_exit_minutes") or 10)
    if loss_armed:
        if pnl_frac >= lrt:
            return "SELL", "loss_rec"
        if elapsed_min >= float(lfm):
            return "SELL", "loss_force"
        return "HOLD", ""

    if pnl_frac >= rise:
        return "SELL", "tp"

    tdm = int(tl.get("target_deadline_minutes") or 30)
    if elapsed_min >= float(tdm) and pnl_frac < rise:
        return "SELL", "deadline"

    return "HOLD", ""
