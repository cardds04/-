"""체결 이력용 한글 사유 문자열 (대시보드에서 ID 클릭 시 표시)."""

from __future__ import annotations

from scenarios import (
    BUY_ENTRY_MODE_DROP,
    BUY_ENTRY_MODE_MIDPOINT_RISE,
    BUY_ENTRY_MODE_WATCH_SHARE,
)


def _ref_title_ko(ref_lbl: str) -> str:
    """로그 라벨이 미들:15m 형태이면 미들포인트, 아니면 기간 고가."""
    s = str(ref_lbl or "")
    return "기준 미들포인트" if s.startswith("미들") else "기준 고가"


def buy_reason_trend_follow(
    *,
    scenario_name: str,
    scenario_id: str,
    symbol: str,
    buy_entry_mode: str,
    drop_reference_high: str,
    reference_high: float,
    last: float,
    drop_from_high_pct: float | None,
    tier: str,
    buy_krw: float,
    watch_positive_gate_pct: float,
    midpoint_gate_min_pct: float | None = None,
) -> str:
    bem = str(buy_entry_mode or BUY_ENTRY_MODE_DROP).strip().lower()
    ref_lbl = str(drop_reference_high or "24h")
    rt = _ref_title_ko(ref_lbl)
    lines = [
        f"「{scenario_name}」({scenario_id}) · {symbol}",
        "트렌드 팔로우 자동매매 — 시그널 BUY 후 시장가 매수 체결.",
        "",
    ]
    if bem == BUY_ENTRY_MODE_WATCH_SHARE:
        lines.append(
            f"- 매수 방식: 감시 플러스 비중 — {rt}({ref_lbl}) 대비 "
            f"+{float(watch_positive_gate_pct):.2f}% 이상인 종목만 후보, 순위별 금액으로 매수"
        )
        lines.append(f"- 당시 {rt}: {reference_high:,.0f}원, 현재가: {last:,.0f}원")
    elif bem == BUY_ENTRY_MODE_MIDPOINT_RISE:
        mgp = midpoint_gate_min_pct
        mgp_s = f"{float(mgp):.4g}" if mgp is not None else "—"
        lines.append(
            f"- 매수 방식: 미들포인트 대비 상승 — 구간 미들 대비 +{mgp_s}%p 이상일 때 매수(순위별 금액)"
        )
        lines.append(f"- 당시 기준 미들(참고): {reference_high:,.0f}원, 현재가: {last:,.0f}원")
    else:
        drp = drop_from_high_pct
        drp_str = f"{float(drp) * 100:.4f}%" if drp is not None else "—"
        mode_line = (
            "기간 미들포인트 대비 하락"
            if ref_lbl.startswith("미들")
            else "기간 고가 대비 하락"
        )
        lines.append(
            f"- 매수 방식: {mode_line} — {rt}({ref_lbl}) {reference_high:,.0f}원, "
            f"현재가 {last:,.0f}원, 하락 요구 {drp_str}"
        )
    lines.append(f"- 순위 구간: {tier}, 1회 매수액: {buy_krw:,.0f}원")
    return "\n".join(lines)


def buy_reason_volume_surge(
    *,
    scenario_name: str,
    scenario_id: str,
    symbol: str,
    buy_krw: float,
    surge_ratio: float | None,
    rise_pct: float | None,
) -> str:
    sr = f"{surge_ratio:.4f}" if surge_ratio is not None else "—"
    rp = f"{rise_pct:.4f}%" if rise_pct is not None else "—"
    return (
        f"「{scenario_name}」({scenario_id}) · {symbol}\n"
        "거래량 급등 추격 모드 — 후보 목록 중 급등비 최상위 종목으로 시장가 매수.\n"
        f"- 급등비(surge_ratio): {sr}, 단기 상승률: {rp}\n"
        f"- 1회 매수액: {buy_krw:,.0f}원"
    )


def buy_reason_bollinger_squeeze(
    *,
    scenario_name: str,
    scenario_id: str,
    symbol: str,
    buy_krw: float,
    squeeze_hint: str | None = None,
) -> str:
    extra = f"\n{squeeze_hint}" if squeeze_hint else ""
    return (
        f"「{scenario_name}」({scenario_id}) · {symbol}\n"
        "볼린저 스퀴즈 모드 — 조건 충족 후보 중 시장가 매수.\n"
        f"- 1회 매수액: {buy_krw:,.0f}원"
        f"{extra}"
    )


def buy_reason_scalp_flash(
    *,
    scenario_name: str,
    scenario_id: str,
    symbol: str,
    buy_krw: float,
    h3: float,
    h6: float,
    h15: float,
    last: float,
    min_24h_rise_pct: float,
    sp_36: float,
    drop15: float,
) -> str:
    return (
        f"「{scenario_name}」({scenario_id}) · {symbol}\n"
        "초단타(scalp_flash) — 24h 거래대금 상위·등락률 필터 감시, 3h/6h·15m 고가 조건 충족 시 시장가 매수.\n"
        f"- 3h 고가 {h3:,.0f}원, 6h 고가 {h6:,.0f}원 (3h≥6h+{sp_36:.2f}%p), "
        f"15m 고가 {h15:,.0f}원, 현재가 {last:,.0f}원 (15m 대비 ≥{drop15:.2f}%p 하락)\n"
        f"- 감시용 24h 등락 하한: ≥{min_24h_rise_pct:.2f}%p\n"
        f"- 1회 매수액: {buy_krw:,.0f}원"
    )


def reason_manual_dashboard_buy(
    *,
    scenario_name: str,
    scenario_id: str,
    symbol: str,
    buy_krw: float,
) -> str:
    return (
        f"「{scenario_name}」({scenario_id}) · {symbol}\n"
        f"대시보드에서 수동으로 시장가 매수({buy_krw:,.0f}원)를 실행했습니다."
    )


def _fmt_pct_trim(x: float) -> str:
    s = f"{float(x):.4f}".rstrip("0").rstrip(".")
    return s if s else "0"


def cond_summary_ko_trend_buy(
    *,
    buy_entry_mode: str,
    drop_reference_high: str,
    drop_from_high_pct: float | None,
) -> str:
    """체결 표 「조건」 열용 한 줄 (트렌드 팔로 매수)."""
    bem = str(buy_entry_mode or BUY_ENTRY_MODE_DROP).strip().lower()
    ref_lbl = str(drop_reference_high or "24h")
    rk = "기준미들" if ref_lbl.startswith("미들") else "기준고가"
    if bem == BUY_ENTRY_MODE_WATCH_SHARE:
        return f"감시+비중 · {rk}({ref_lbl})"
    if bem == BUY_ENTRY_MODE_MIDPOINT_RISE:
        return f"미들상승 · {rk}({ref_lbl})"
    if drop_from_high_pct is not None:
        pct = float(drop_from_high_pct) * 100.0
        return f"{rk}({ref_lbl}) 대비 하락 {_fmt_pct_trim(pct)}%"
    return f"{rk}({ref_lbl})"


def cond_summary_ko_trend_sell(scenario: dict) -> str:
    """체결 표 「조건」 열용 한 줄 (익절·손절 %, 시나리오 분수값×100)."""
    tp = float(scenario.get("rise_from_entry_pct") or 0.05) * 100.0
    parts: list[str] = [f"익절 +{_fmt_pct_trim(tp)}%"]
    sl_raw = scenario.get("stop_loss_from_entry_pct")
    if sl_raw is not None and str(sl_raw).strip() != "":
        try:
            sl = float(sl_raw) * 100.0
            if sl > 0:
                parts.append(f"손절 -{_fmt_pct_trim(sl)}%")
        except (TypeError, ValueError):
            pass
    return " · ".join(parts)


def _parse_sl_frac(scenario: dict) -> float | None:
    sl_raw = scenario.get("stop_loss_from_entry_pct")
    if sl_raw is None or str(sl_raw).strip() == "":
        return None
    try:
        sl_f = float(sl_raw)
    except (TypeError, ValueError):
        return None
    if sl_f < 0.0001:
        return None
    return sl_f


def _sell_trigger_line_ko(
    scenario: dict,
    *,
    entry_price: float | None,
    sell_price: float,
    tl_code: str,
) -> str:
    """시간제한 모드 코드·일반 매도 모두에서 한 줄 트리거 설명."""
    rise = float(scenario.get("rise_from_entry_pct") or 0.05)
    sl_f = _parse_sl_frac(scenario)
    code = str(tl_code or "").strip()

    if entry_price is not None and float(entry_price) > 0:
        ep = float(entry_price)
        eps = max(1e-12, abs(ep) * 1e-8)
        if code == "sl":
            if sl_f is not None:
                return f"-{_fmt_pct_trim(sl_f * 100.0)}% 도달하여 손절"
            return "손절가 도달하여 매도"
        if code == "tp":
            return f"익절 목표(+{_fmt_pct_trim(rise * 100.0)}%) 도달하여 매도"
        if code == "deadline":
            return "시간제한으로 매도"
        if code == "quick":
            return "빠른 익절 조건 충족 후 매도"
        if code == "loss_rec":
            return "손실 구간 이후 회복 목표 수익률 도달 후 매도"
        if code == "loss_force":
            return "손실 구간 강제 청산(시간 경과) 후 매도"
        if code == "":
            tp_line = ep * (1.0 + rise)
            if float(sell_price) + eps >= tp_line:
                return f"익절 목표(+{_fmt_pct_trim(rise * 100.0)}%) 도달하여 매도"
            if sl_f is not None:
                stop_line = ep * (1.0 - sl_f)
                if float(sell_price) <= stop_line + eps:
                    return f"-{_fmt_pct_trim(sl_f * 100.0)}% 도달하여 손절"
            return "익절·손절 조건 충족 후 시장가 매도 체결."

    return {
        "sl": "손절 조건 충족 후 매도",
        "tp": "익절·손절 등 시그널 SELL 충족 후 시장가 매도 체결.",
        "deadline": "시간제한으로 매도",
        "quick": "빠른 익절 조건 충족 후 매도",
        "loss_rec": "손실 구간 이후 회복 목표 도달 후 매도",
        "loss_force": "손실 구간 강제 청산 후 매도",
    }.get(code, "익절·손절 등 시그널 SELL 충족 후 시장가 매도 체결.")


def sell_reason_trend_follow_auto(
    *,
    scenario_name: str,
    scenario_id: str,
    symbol: str,
    scenario: dict,
    entry_price: float | None,
    sell_price: float,
    tl_code: str,
) -> str:
    """트렌드 팔로 자동 매도 체결 — 요약·트리거·매입/매도가·손익률."""
    summary = cond_summary_ko_trend_sell(scenario)
    trigger = _sell_trigger_line_ko(
        scenario,
        entry_price=entry_price,
        sell_price=sell_price,
        tl_code=tl_code,
    )
    ep = entry_price
    if ep is not None and float(ep) > 0:
        ep_f = float(ep)
        pnl_pct = (float(sell_price) / ep_f - 1.0) * 100.0
        pr = f"{pnl_pct:+.2f}%"
        ep_s = f"{ep_f:,.0f}원"
    else:
        pr = "—"
        ep_s = "—"
    sp_s = f"{float(sell_price):,.0f}원"
    lines = [
        f"【요약】 {summary}",
        "",
        f"「{scenario_name}」({scenario_id}) · {symbol}",
        "",
        trigger,
        "",
        f"매입가: {ep_s}",
        f"매도가: {sp_s}",
        f"손익률: {pr}",
    ]
    return "\n".join(lines)
