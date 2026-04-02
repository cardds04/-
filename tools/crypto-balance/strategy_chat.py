"""전략 상담 챗봇 — LLM(설정 시) 또는 규칙 기반 한국어 답변 + 대화로 전략 수정."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

from chat_strategy_numeric import extract_numeric_strategy_patch
from strategy_config import load_strategy_config, save_strategy_config
from trade_log import compute_stats

from scenarios import load_scenarios_list, migrate_if_needed, validate_scenario_patch

BASE_DIR = Path(__file__).resolve().parent
STATUS_PATH = BASE_DIR / "status.json"


def _normalize_status_snapshot(st: dict | None) -> dict | None:
    """멀티 시나리오 status.json 이면 첫 시나리오 스냅샷을 규칙 기반 답변에 사용."""
    if not st:
        return None
    if st.get("mode") == "multi" and isinstance(st.get("scenarios"), list) and st["scenarios"]:
        return st["scenarios"][0]
    return st


def _load_status() -> dict | None:
    if not STATUS_PATH.is_file():
        return None
    try:
        data = json.loads(STATUS_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else None
    except (json.JSONDecodeError, OSError):
        return None


def _fmt_pct(x: float) -> str:
    return f"{x * 100:.2f}%"


def try_apply_chat_commands(text: str) -> str | None:
    """
    대화 문장에서 전략 변경 의도를 찾으면 첫 시나리오(scenarios.json)에 반영하고 안내 문구 반환.
    해당 없으면 None (일반 Q&A로 넘김).
    """
    raw = (text or "").strip()
    if not raw:
        return None

    patch = dict(extract_numeric_strategy_patch(raw))

    if re.search(r"(?:종목|심볼|마켓)\s*(?:을|를|로)?", raw):
        m = re.search(r"\b([A-Za-z0-9]{2,10}/KRW)\b", raw, re.IGNORECASE)
        if m:
            patch["trading_symbol"] = m.group(1).strip().upper()

    if not patch:
        return None

    try:
        patch = validate_scenario_patch(patch)
    except ValueError as e:
        return f"**저장하지 못했습니다.** {e}"

    try:
        merged = save_strategy_config(patch)
    except ValueError as e:
        return f"**저장하지 못했습니다.** {e}"

    lines = ["**설정을 저장했습니다.** 다음 루프부터 봇에 반영돼요."]
    ts = merged.get("trading_symbol")
    lines.append(
        f"• 거래 심볼: **{ts}**" if ts else "• 거래 심볼: **.env 의 TRADING_SYMBOL**"
    )
    lines.append(
        f"• 24h 고점 대비 하락(매수): **{_fmt_pct(float(merged.get('drop_from_high_pct') or 0.03))}**"
    )
    lines.append(
        f"• 평단 대비 상승(익절): **{_fmt_pct(float(merged.get('rise_from_entry_pct') or 0.05))}**"
    )
    lines.append(f"• 자동매매: **{'ON' if merged.get('trading_enabled', True) else 'OFF'}**")
    lines.append(f"• 쿨다운: **{int(merged.get('cooldown_seconds_after_trade') or 0)}초**")
    ls = merged.get("loop_seconds")
    lines.append(f"• 루프 주기: **{ls}초**" if ls is not None else "• 루프 주기: **.env 사용**")
    bk = merged.get("buy_krw_amount")
    lines.append(
        f"• 1회 매수 원화: **{float(bk):,.0f}원**" if bk is not None else "• 1회 매수 원화: **.env 사용**"
    )
    return "\n".join(lines)


def _chat_llm_disabled() -> bool:
    v = (os.getenv("CHAT_DISABLE_LLM") or os.getenv("CHAT_DISABLE_OPENAI") or "").strip().lower()
    return v in ("1", "true", "yes", "on")


def _normalize_client_messages(body: dict) -> list[dict]:
    """클라이언트 messages 배열을 user/assistant만 추려 정리."""
    raw = body.get("messages")
    if not isinstance(raw, list):
        return []
    out: list[dict] = []
    for m in raw:
        if not isinstance(m, dict):
            continue
        role = m.get("role")
        if role not in ("user", "assistant"):
            continue
        c = (m.get("content") or "").strip()
        if not c:
            continue
        out.append({"role": role, "content": c[:12000]})
    return out


def process_chat_request(body: dict) -> dict:
    """
    body: { "message"?: str, "messages"?: [{ "role", "content" }] }
    GEMINI_API_KEY(또는 GOOGLE_API_KEY)가 있으면 Gemini + 시나리오 도구, 없으면 정규식 명령 + 규칙 기반.
    """
    use_llm = False
    if not _chat_llm_disabled():
        try:
            from llm_strategy_chat import is_llm_chat_configured, run_llm_chat

            use_llm = is_llm_chat_configured()
        except ImportError:
            use_llm = False

    if use_llm:
        user_msgs = _normalize_client_messages(body)
        legacy = (body.get("message") or "").strip()
        if not user_msgs and legacy:
            user_msgs = [{"role": "user", "content": legacy}]
        if not user_msgs:
            return {"reply": "메시지를 입력해 주세요.", "applied": False}
        try:
            return run_llm_chat(user_msgs)
        except RuntimeError as e:
            return {"reply": str(e), "applied": False}
        except Exception as e:
            return {"reply": f"AI 응답 중 오류가 났습니다: {e}", "applied": False}

    text = (body.get("message") or "").strip()
    if not text and isinstance(body.get("messages"), list):
        for m in reversed(body["messages"]):
            if isinstance(m, dict) and m.get("role") == "user":
                text = (m.get("content") or "").strip()
                break
    cmd = try_apply_chat_commands(text)
    if cmd is not None:
        return {"reply": cmd, "applied": True}
    return {"reply": reply_strategy_chat(text), "applied": False}


def reply_trader_chat_no_llm(user_msgs: list[dict], scenario_id: str) -> dict:
    """Gemini 미설정 시: 해당 트레이더 설정 요약 + 안내."""
    migrate_if_needed()
    scen = next((s for s in load_scenarios_list() if str(s.get("id")) == scenario_id), None)
    if not scen:
        return {"reply": "해당 트레이더를 찾을 수 없어요.", "applied": False}
    last = ""
    for m in reversed(user_msgs):
        if m.get("role") == "user":
            last = (m.get("content") or "").strip()
            break
    name = scen.get("name") or "트레이더"
    st = (scen.get("strategy_text") or "").strip()
    sty = (scen.get("trader_style") or "").strip()
    preview = (st[:400] + "…") if len(st) > 400 else st
    age = scen.get("trader_age")
    mbti = scen.get("trader_mbti") or "—"
    rank = scen.get("trader_rank") or "—"
    career = scen.get("trader_career") or "—"
    gender = scen.get("trader_gender") or "—"
    intro = (scen.get("trader_self_intro") or "").strip() or "—"
    age_s = str(age) if age is not None else "—"
    return {
        "reply": (
            f"**{name}** ({rank}, 나이 {age_s}, 성별 {gender}, MBTI {mbti}) 과(와)의 개별 대화입니다. "
            f"(Gemini를 쓰려면 `.env`에 GEMINI_API_KEY 또는 GOOGLE_API_KEY를 설정하세요.)\n\n"
            f"**자기소개:** {intro}\n\n"
            f"**경력:** {career}\n\n"
            f"**저장된 스타일:** {sty or '—'}\n\n"
            f"**저장된 전략 규칙 일부:** {preview or '—'}\n\n"
            f"**방금 요청:** \"{last[:120]}{'…' if len(last) > 120 else ''}\"\n\n"
            "규칙 문구를 바꾼 뒤 아래 **전략 저장**을 눌러 서버에 반영하세요. "
            "AI가 켜져 있으면 답변 끝에 ```strategy``` / ```style``` 블록으로 초안이 채워집니다."
        ),
        "applied": False,
    }


def process_trader_chat_request(body: dict) -> dict:
    """
    body: { "scenario_id": str, "messages"?: [...], "message"?: str }
    단일 퀀트트레이더와 직접 대화. LLM은 도구 없이 텍스트만 — 전략 초안은 ```strategy``` / ```style``` 블록.
    """
    sid = str(body.get("scenario_id") or "").strip()
    if not sid:
        return {"reply": "scenario_id가 필요합니다.", "applied": False}
    user_msgs = _normalize_client_messages(body)
    legacy = (body.get("message") or "").strip()
    if not user_msgs and legacy:
        user_msgs = [{"role": "user", "content": legacy}]
    if not user_msgs:
        return {"reply": "메시지를 입력해 주세요.", "applied": False}
    if not _chat_llm_disabled():
        try:
            from llm_strategy_chat import is_llm_chat_configured, run_llm_trader_chat
        except ImportError:
            pass
        else:
            if is_llm_chat_configured():
                try:
                    return run_llm_trader_chat(user_msgs, sid)
                except RuntimeError as e:
                    return {"reply": str(e), "applied": False}
                except Exception as e:
                    return {"reply": f"AI 응답 중 오류가 났습니다: {e}", "applied": False}
    return reply_trader_chat_no_llm(user_msgs, sid)


def process_chat_message(user_message: str) -> dict:
    """명령 적용 시 applied=True. 단일 문자열(구 API)용."""
    return process_chat_request({"message": user_message})


def reply_strategy_chat(user_message: str) -> str:
    text = (user_message or "").strip()
    if not text:
        return "무엇이 궁금하신지 한 줄로 적어 주세요. 예: 지금 전략이 뭐야? 매수는 언제 해?"

    cfg = load_strategy_config()
    st = _normalize_status_snapshot(_load_status())
    stats = compute_stats()

    drop = float(cfg.get("drop_from_high_pct") or 0.03)
    rise = float(cfg.get("rise_from_entry_pct") or 0.05)
    te = cfg.get("trading_enabled", True)
    cd = int(cfg.get("cooldown_seconds_after_trade") or 0)
    loop = cfg.get("loop_seconds")
    buy_krw = cfg.get("buy_krw_amount")
    trading_style = str(cfg.get("trading_style") or "").strip().lower()
    vsc_cfg = cfg.get("volume_surge_chase") if isinstance(cfg.get("volume_surge_chase"), dict) else {}

    tnorm = text.lower()
    # 간단 키워드 (긴 문장도 매칭)
    def has(*words: str) -> bool:
        return any(w in text for w in words)

    if has("안녕", "hello", "hi "):
        return (
            "안녕하세요. 저는 이 봇의 **전략 설명 도우미**예요. "
            "‘지금 전략 알려줘’, ‘매수 조건’, ‘손익’처럼 물어보시면 설정과 실행 상태를 바탕으로 답할게요. 투자 조언이나 수익 보장은 아니에요."
        )

    if has("손익", "수익", "얼마", "통계", "실현"):
        wr = stats.get("win_rate_pct")
        wr_s = f"{wr:.1f}%" if wr is not None else "—"
        pnl = stats.get("total_realized_pnl_krw")
        pnl = float(pnl) if pnl is not None else 0.0
        return (
            f"기록된 체결 기준으로 보면, 누적 실현손익(추정)은 약 **{pnl:,.0f}**원이에요. "
            f"매도 기준 승/패는 **{stats.get('win_trades', 0)} / {stats.get('loss_trades', 0)}**, 승률 **{wr_s}** 입니다. "
            "수수료·슬리피지는 반영하지 않은 대략치예요."
        )

    if has("위험", "안전", "걱정", "괜찮"):
        return (
            "이 봇은 **규칙대로만** 주문할 뿐, 시장을 예측하지 않아요. 암호화폐는 원금 손실이 클 수 있고, "
            "자동매매는 꺼두고(킬 스위치) 먼저 관찰만 하는 것도 방법이에요. 투자는 본인 판단·책임이에요."
        )

    if has("수정", "바꾸", "설정", "어디서", "편집"):
        return (
            "숫자는 **아래 파라미터 칸**에서 바꾸거나, **대화창**에 예를 들어 "
            "「하락 3%로 해줘」「익절 5%」「자동매매 꺼줘」「매수 금액 10000원」「주기 60초」처럼 말해 저장할 수 있어요."
        )

    if has("실행", "main", "봇", "켜", "돌"):
        return (
            "봇 프로세스는 터미널에서 이 폴더로 가서 `python main.py` 로 실행해요. "
            "이 대시보드(`python dashboard.py`)는 모니터링·설정용이라, 봇과는 **별도 프로그램**이에요."
        )

    if has("자동매매", "킬", "주문 안", "꺼"):
        onoff = "켜져 있어요 (실제 주문 가능)." if te else "꺼져 있어요 (시그널만, 주문 안 함)."
        return f"지금 저장된 설정 기준 자동매매는 {onoff} 투자자 보호를 위해 꺼두고 시그널만 볼 수도 있어요."

    if has("쿨다운", "연속"):
        if cd <= 0:
            return "체결 후 쿨다운은 **0초**로 설정돼 있어요. 대화나 아래 칸에서 초를 올려 보세요."
        return f"체결 직후 **{cd}초** 동안은 새 주문을 보내지 않게 막아 두었어요. 연속으로 잘못 체결되는 걸 줄이려는 장치예요."

    if has("매수", "사면", "살까", "매수 조건"):
        if trading_style == "volume_surge_chase":
            msr = float(vsc_cfg.get("min_surge_ratio") or 1.2)
            lb = str(vsc_cfg.get("lookback") or "5m")
            mrp = float(vsc_cfg.get("min_rise_pct") or 1.0)
            bk = float(vsc_cfg.get("buy_krw") or 6000)
            line = (
                "**매수 조건(거래량급등):** KRW 마켓 후보(다른 트레이더 심볼 제외) 중에서만 고릅니다.\n"
                f"• **급등비** R = V15÷(S4/4) ≥ **{msr}** … (V15=직전 완료 15분봉 원화 거래대금, S4=그 직전 4개 15분봉 합)\n"
                f"• **단기 상승률** ≥ **{mrp}%** (lookback **{lb}**, 1분봉 종가 기준)\n"
                f"• 위를 만족하는 종목 중 R이 가장 큰 **한 종목**에 **{bk:,.0f}**원 시장가 매수를 시도합니다."
            )
            line += f"\n자동매매는 **{'ON' if te else 'OFF'}** 입니다."
            return line
        line = (
            f"**매수 조건:** 코인을 거의 안 들고 있을 때, **현재가**가 **24시간 최고가**에서 {_fmt_pct(drop)} 내려간 가격(매수 기준가) **이하**이면 BUY 신호예요."
        )
        if st and st.get("last") is not None and st.get("buy_trigger_price") is not None:
            line += (
                f"\n지금 스냅샷 기준으로는 현재가 **{float(st['last']):,.0f}**원, 매수 기준가 **{float(st['buy_trigger_price']):,.0f}**원 근처로 잡혀 있어요."
            )
        return line

    if has("매도", "팔", "익절", "매도 조건"):
        if trading_style == "volume_surge_chase":
            rf = float(vsc_cfg.get("rise_from_entry_pct") or rise)
            sl_raw = vsc_cfg.get("stop_loss_from_entry_pct")
            sl_s = (
                f"{_fmt_pct(float(sl_raw))} 이하로 떨어지면"
                if sl_raw is not None and float(sl_raw) > 0
                else "미설정"
            )
            line = (
                "**매도(거래량급등):** 포지션이 있을 때\n"
                f"• **익절:** 현재가가 평단 대비 **{_fmt_pct(rf)}** 이상이면(익절 기준가 이상) SELL 검토\n"
                f"• **손절:** 평단 대비 **{sl_s}** 손절 검토\n"
                "• 둘 중 먼저 닿는 쪽이면 SELL 신호로 나갑니다."
            )
            if st and st.get("entry_price") is not None and st.get("sell_trigger_price") is not None:
                line += (
                    f"\n스냅샷 기준 평단 **{float(st['entry_price']):,.0f}**원, 매도 기준가 **{float(st['sell_trigger_price']):,.0f}**원 근처예요."
                )
            return line
        line = (
            f"**매도(익절) 조건:** 코인을 들고 있을 때, **현재가**가 **매수 평단**에서 {_fmt_pct(rise)} 오른 가격(매도 기준가) **이상**이면 SELL 신호예요."
        )
        if st and st.get("entry_price") is not None and st.get("sell_trigger_price") is not None:
            line += (
                f"\n스냅샷 기준 평단 **{float(st['entry_price']):,.0f}**원, 매도 기준가 **{float(st['sell_trigger_price']):,.0f}**원 근처예요."
            )
        elif st and (st.get("base_free") or 0) <= 1e-8:
            line += "\n지금은 포지션이 거의 없어서 매도 기준가는 ‘코인을 산 뒤’에 의미가 있어요."
        return line

    if has("홀드", "hold", "대기", "아무것도"):
        return (
            "**HOLD**는 매수·매도 조건 둘 다 안 맞을 때예요. 아무 주문도 하지 않고 다음 루프까지 기다려요."
        )

    if has("전략", "뭐", "어떻게", "설명", "규칙"):
        if trading_style == "volume_surge_chase":
            msr = float(vsc_cfg.get("min_surge_ratio") or 1.2)
            lb = str(vsc_cfg.get("lookback") or "5m")
            mrp = float(vsc_cfg.get("min_rise_pct") or 1.0)
            bk = float(vsc_cfg.get("buy_krw") or 6000)
            rf = float(vsc_cfg.get("rise_from_entry_pct") or rise)
            sl_raw = vsc_cfg.get("stop_loss_from_entry_pct")
            sl_tail = (
                f"손절: 평단 대비 **{_fmt_pct(float(sl_raw))}** 이하로 떨어지면"
                if sl_raw is not None and float(sl_raw) > 0
                else "손절: **미설정**"
            )
            parts_vsc = [
                "지금 저장된 전략은 **거래량급등 추격**이에요.",
                "• **급등비** R = V15÷(S4/4) — V15는 직전 완료 15분봉 원화 거래대금, S4는 그 앞 네 개 15분봉 원화 거래대금의 합.",
                f"• 후보 필터: R ≥ **{msr:.2f}**, 단기 상승률(lookback **{lb}**) ≥ **{mrp:.2f}%**.",
                f"• 통과 종목 중 R이 가장 큰 **한 종목**에 **{bk:,.0f}**원 매수 · 익절 평단 대비 **{_fmt_pct(rf)}** 이상 · {sl_tail}.",
                f"• 자동매매: **{'ON' if te else 'OFF'}**, 체결 후 쿨다운: **{cd}초**.",
            ]
            if loop is not None:
                parts_vsc.append(f"• 루프 주기: **{loop}초**.")
            else:
                parts_vsc.append("• 루프 주기: `.env`의 LOOP_SECONDS 를 씁니다.")
            if st and st.get("signal"):
                parts_vsc.append(f"• 방금 스냅샷 시그널: **{st.get('signal')}**.")
            return "\n".join(parts_vsc)
        if cfg.get("watch_random"):
            wc = cfg.get("watch_random_count") or 12
            ts_line = f"• 감시: **KRW 마켓에서 무작위 약 {wc}개** (봇이 매 루프마다 골라 감시)."
        else:
            ws = cfg.get("watch_symbols") or []
            if isinstance(ws, list) and len(ws) > 1:
                ts_line = f"• 감시 종목: **{', '.join(str(x) for x in ws)}** (퀀트트레이더가 순서대로 판단)."
            elif cfg.get("trading_symbol"):
                ts_line = f"• 감시 종목: **{cfg.get('trading_symbol')}** (한 트레이더가 담당)."
            else:
                ts_line = "• 감시 종목: **`.env`의 TRADING_SYMBOL** 기준."
        parts = [
            "지금 저장된 전략 요약이에요.",
            ts_line,
            f"• 24h 고가 대비 **{_fmt_pct(drop)}** 이상 빠지면 ‘싸다’고 보고 매수 신호를 검토해요.",
            f"• 산 평단 대비 **{_fmt_pct(rise)}** 이상 비싸지면 익절 매도 신호를 검토해요.",
            f"• 자동매매: **{'ON' if te else 'OFF'}**, 체결 후 쿨다운: **{cd}초**.",
        ]
        if loop is not None:
            parts.append(f"• 루프 주기: **{loop}초** (설정 파일 우선).")
        else:
            parts.append("• 루프 주기: `.env`의 LOOP_SECONDS 를 씁니다.")
        if buy_krw is not None:
            parts.append(f"• 1회 매수 원화: **{float(buy_krw):,.0f}**원.")
        else:
            parts.append("• 1회 매수 원화: `.env`의 BUY_KRW_AMOUNT 를 씁니다.")
        if st and st.get("signal"):
            parts.append(f"• 방금 스냅샷 시그널: **{st.get('signal')}**.")
        return "\n".join(parts)

    # 짧은 질문 / 기본
    if len(text) < 8 and re.search(r"[가-힣]", text):
        return (
            "조금만 더 구체적으로 적어 주세요. 예: **‘매수 언제야?’** **‘지금 시그널 뭐야?’** **‘손익 알려줘’** "
            "또는 **‘전략 요약’** 이라고 하시면 지금 설정 숫자를 풀어서 설명할게요."
        )

    # 폴백: 요약
    sig = (st or {}).get("signal", "—")
    last = (st or {}).get("last")
    sym = (st or {}).get("symbol", "—")
    extra = ""
    if last is not None:
        extra = f"\n최근 스냅샷: 종목 **{sym}**, 현재가 **{float(last):,.0f}**원, 시그널 **{sig}**."
    return (
        "질문을 완전히 이해하지 못했어요. **전략**, **매수**, **매도**, **손익**, **자동매매**, **쿨다운** 같은 단어로 다시 물어보시거나, "
        "「전략 요약」이라고 하면 지금 적용 중인 % 설정을 정리해 드릴게요." + extra
    )
