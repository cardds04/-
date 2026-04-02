"""단순 가격 기반 시그널: 24h 고점 대비 -3% 매수, 매수가 대비 +5% 매도."""

from __future__ import annotations

from typing import Any

# 24시간 최고가 대비 하락률(이하이면 매수 신호)
DROP_FROM_24H_HIGH = 0.03
# 매수 평단 대비 상승률(이상이면 매도 신호)
RISE_FROM_ENTRY = 0.05

# 베이스 잔고가 이 값 이하면 '보유 없음'으로 간주 (먼지)
BASE_DUST = 1e-8


def drop_from_high_epsilon(reference_high: float) -> float:
    """호가·부동소수점으로 last <= ref*(1-drop) 경계 비교가 실패하는 것을 완화."""
    return max(1e-12, abs(float(reference_high)) * 1e-10)


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
    buy_using_watch_positive: bool = False,
    watch_positive_vs_ref_pct: float = 0.5,
    buy_using_midpoint_rise_only: bool = False,
    midpoint_gate_level: float | None = None,
    midpoint_gate_min_pct: float | None = None,
) -> str:
    """
    - 보유 없음:
      - buy_using_watch_positive: 기준가 대비 +watch_positive_vs_ref_pct%p 이상 → BUY.
      - buy_using_midpoint_rise_only: midpoint_gate_level 대비 +midpoint_gate_min_pct%p 이상 → BUY.
      - 그 외: drop_from_high_pct 가 있으면 기준 고가 대비 drop% 이하 → BUY.
        None(미사용)이면 매수 조건 없이 HOLD.
    - 보유 있음: 익절·손절은 평단(entry_price) 대비 비율만 사용. reference_high 는 미사용.
    """
    rise = rise_from_entry_pct if rise_from_entry_pct is not None else RISE_FROM_ENTRY
    sl_raw = stop_loss_from_entry_pct
    sl_f: float | None = None
    if sl_raw is not None:
        try:
            sl_f = float(sl_raw)
        except (TypeError, ValueError):
            sl_f = None
    if sl_f is not None and sl_f < 0.0001:
        sl_f = None

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
    if last >= take_profit:
        return "SELL"
    if sl_f is not None:
        stop_line = entry_price * (1.0 - sl_f)
        if last <= stop_line:
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
) -> tuple[str, str]:
    """
    보유 중일 때만. SELL / HOLD 와 사유 코드.
    enabled 가 아니면 ("HOLD", "") — 호출부에서 evaluate_signal 을 쓰세요.
    loss_armed: 한 번이라도 손실 구간(loss_branch_threshold_pct 이하)에 들어갔으면 True(포지션 상태에 저장).
    """
    if not tl.get("enabled"):
        return "HOLD", ""
    if base_free <= BASE_DUST:
        return "HOLD", ""
    if entry_price is None or entry_price <= 0:
        return "HOLD", ""
    if entry_ts is None:
        return "HOLD", ""
    sl_raw = stop_loss_from_entry_pct
    sl_f: float | None = None
    if sl_raw is not None:
        try:
            sl_f = float(sl_raw)
        except (TypeError, ValueError):
            sl_f = None
    if sl_f is not None and sl_f < 0.0001:
        sl_f = None
    if sl_f is not None:
        stop_line = entry_price * (1.0 - sl_f)
        if last <= stop_line:
            return "SELL", "sl"

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
