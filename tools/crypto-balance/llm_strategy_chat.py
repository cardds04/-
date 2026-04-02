"""LLM 기반 전략 상담 — Google Gemini + 시나리오 CRUD 도구."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

from google import genai
from google.genai import types

from chat_strategy_numeric import extract_numeric_strategy_patch, merge_utterance_patch_into_scenario
from scenarios import (
    MAX_SCENARIOS,
    BUY_ENTRY_MODE_DROP,
    BUY_ENTRY_MODE_MIDPOINT_RISE,
    BUY_ENTRY_MODE_WATCH_SHARE,
    add_scenario,
    get_scenario_by_id,
    load_scenarios_list,
    migrate_if_needed,
    patch_scenario,
    remove_scenario,
    save_scenarios_list,
    WATCH_POSITIVE_VS_REF_FIXED_PCT,
)
from trade_log import compute_stats

_STATUS_PATH = Path(__file__).resolve().parent / "status.json"


def _load_status() -> dict | None:
    if not _STATUS_PATH.is_file():
        return None
    try:
        data = json.loads(_STATUS_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else None
    except (json.JSONDecodeError, OSError):
        return None


MAX_TOOL_ROUNDS = 8
MAX_HISTORY_MESSAGES = 24


def _tool_declarations() -> list[types.FunctionDeclaration]:
    return [
        types.FunctionDeclaration(
            name="list_scenarios",
            description=f"저장된 모든 시나리오(최대 {MAX_SCENARIOS}개) 목록을 조회합니다. 인자 없음.",
            parameters_json_schema={"type": "object", "properties": {}},
        ),
        types.FunctionDeclaration(
            name="patch_scenario",
            description=(
                "특정 퀀트트레이더(시나리오) 설정을 부분 수정. "
                "감시 종목 여러 개: patch에 watch_symbols 예: [\"BTC/KRW\",\"ETH/KRW\"] (저장 시 다른 트레이더와 종목이 겹치면 안 됨). "
                "단일 종목만: trading_symbol 예: ETH/KRW. "
                "**사용자가 %로 말하더라도 반드시 아래 소수 필드로 저장** — 이름·strategy_text만 바꾸지 말 것."
            ),
            parameters_json_schema={
                "type": "object",
                "properties": {
                    "scenario_id": {"type": "string", "description": "시나리오 id (scenarios.json의 id)"},
                    "patch": {
                        "type": "object",
                        "description": (
                            "부분 필드. **매매 수치는 소수로**: "
                            "drop_from_high_pct 3%→0.03, rise_from_entry_pct 5%→0.05. "
                            "정수 3이나 -3.0을 넣지 말 것(퍼센트가 아니라 소수 비율)."
                        ),
                        "properties": {
                            "drop_from_high_pct": {
                                "type": "number",
                                "description": "24h 최고가 대비 하락 비율. 3%→0.03, 0.5%→0.005",
                            },
                            "rise_from_entry_pct": {
                                "type": "number",
                                "description": "매수 평단 대비 상승(익절) 비율. 5%→0.05",
                            },
                            "buy_krw_amount": {
                                "type": "number",
                                "description": "1회 매수 원화 금액 (예: 10000)",
                            },
                            "trading_enabled": {"type": "boolean"},
                            "cooldown_seconds_after_trade": {"type": "integer"},
                            "loop_seconds": {"type": ["integer", "null"]},
                            "strategy_text": {"type": "string"},
                            "name": {"type": "string"},
                            "trader_style": {"type": "string"},
                            "allocated_krw": {"type": ["number", "null"]},
                            "watch_symbols": {"type": "array", "items": {"type": "string"}},
                            "trading_symbol": {"type": "string"},
                        },
                    },
                },
                "required": ["scenario_id", "patch"],
            },
        ),
        types.FunctionDeclaration(
            name="add_scenario",
            description=f"새 퀀트트레이더 추가(최대 {MAX_SCENARIOS}개). name, watch_symbols 또는 trading_symbol.",
            parameters_json_schema={
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "trading_symbol": {"type": "string"},
                    "watch_symbols": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "예: BTC/KRW, ETH/KRW",
                    },
                    "trader_style": {"type": "string"},
                    "allocated_krw": {"type": ["number", "null"]},
                    "enabled": {"type": "boolean"},
                    "drop_from_high_pct": {"type": "number"},
                    "rise_from_entry_pct": {"type": "number"},
                    "trading_enabled": {"type": "boolean"},
                    "cooldown_seconds_after_trade": {"type": "integer"},
                    "loop_seconds": {"type": ["integer", "null"]},
                    "buy_krw_amount": {"type": ["number", "null"]},
                    "strategy_text": {"type": "string"},
                },
            },
        ),
        types.FunctionDeclaration(
            name="remove_scenario",
            description="시나리오 삭제(마지막 1개는 삭제 불가).",
            parameters_json_schema={
                "type": "object",
                "properties": {"scenario_id": {"type": "string"}},
                "required": ["scenario_id"],
            },
        ),
        types.FunctionDeclaration(
            name="replace_all_scenarios",
            description="시나리오 전체를 배열로 덮어씁니다. id·name·watch_symbols·trading_symbol·allocated_krw·비율 등 완전한 객체 배열.",
            parameters_json_schema={
                "type": "object",
                "properties": {
                    "scenarios": {
                        "type": "array",
                        "description": f"최대 {MAX_SCENARIOS}개",
                    }
                },
                "required": ["scenarios"],
            },
        ),
    ]


def _client() -> genai.Client:
    key = (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()
    if not key:
        raise RuntimeError(
            "Gemini API 키가 없습니다. .env 에 GEMINI_API_KEY 또는 GOOGLE_API_KEY 를 설정하세요."
        )
    return genai.Client(api_key=key)


def _build_context_block() -> str:
    migrate_if_needed()
    scenarios = load_scenarios_list()
    st = _load_status()
    stats = compute_stats()
    return (
        "[시나리오 목록 scenarios.json]\n"
        + json.dumps(scenarios, ensure_ascii=False, indent=2)
        + "\n\n[최근 status.json]\n"
        + json.dumps(st if st else {}, ensure_ascii=False, indent=2)
        + "\n\n[체결 통계 요약]\n"
        + json.dumps(stats, ensure_ascii=False, indent=2)
    )


def _system_prompt() -> str:
    ctx = _build_context_block()
    return f"""당신은 업비트 자동매매 봇의 한국어 전략 설계 도우미입니다.

【반드시 지킬 사실 — 예전 설명을 하지 마세요】
- **`update_strategy`라는 도구는 이 서버에 없습니다.** 절대 언급하지 마세요.
- **시나리오 = 퀀트트레이더(캐릭터)** 한 명입니다. 이름·`trader_style`·`strategy_text`로 성격과 규칙을 적습니다.
- **`watch_random: true`** 이면 감시 목록을 적지 않고, 봇이 **매 루프마다** KRW 마켓 전체에서 **`watch_random_count`(최소 10)** 개를 무작위로 골라 감시합니다. 여러 트레이더가 모두 랜덤이면 종목이 서로 겹치지 않게 나뉩니다.
- 랜덤을 끄면 **`watch_symbols`** 배열로 여러 종목을 직접 지정하거나 `trading_symbol` 하나만 씁니다.
- **`allocated_krw`**: 사용자가 그 트레이더에게 맡긴 **가상 운용 자금(원)**. 설정 시 매수는 이 한도(가상 KRW 풀) 안에서만 시도합니다. 비우면 실계좌 KRW만 보며 제한 없음.
- **서로 다른 트레이더가 같은 종목을 동시에 감시하면 저장이 거절**됩니다(실계좌는 하나). 종목은 트레이더들 사이에서 **겹치지 않게** 나눕니다. 최대 **{MAX_SCENARIOS}명** 트레이더입니다.
- **업비트 전 KRW 마켓 전부**를 한 트레이더에 넣는 것은 API 한도·위험상 비현실적일 수 있으니, **감시할 종목을 골라** `watch_symbols`에 담는 방식을 안내하세요.

역할:
- 시나리오 추가·수정·삭제는 반드시 아래 도구로만 저장합니다. 말로만 "저장했다"고 하지 마세요.
- 투자 조언·수익 보장·시장 예측은 하지 마세요.

도구:
- list_scenarios: 목록 조회
- patch_scenario: scenario_id + patch (아래 수치 규칙 필수)
- add_scenario: 새 시나리오
- remove_scenario: 삭제(최소 1개 유지)
- replace_all_scenarios: 시나리오 배열 전체 교체

【수치 필드 — 반드시 JSON 숫자로 저장, 말만 하지 말 것】
- **drop_from_high_pct**: 24시간 **최고가 대비 몇 %** 내려와야 매수할지. **0~1 사이 소수** (예: 3% → **0.03**, 10% → **0.10**, 0.5% → **0.005**). **3**이나 **-3.0**처럼 퍼센트 점수로 넣지 마세요.
- **rise_from_entry_pct**: 평단 대비 **몇 %** 올라야 매도(익절)할지. **소수** (5% → **0.05**).
- **buy_krw_amount**: 1회 매수 원화 (예: 15000).
- 사용자가 「3% 하락하면 사」「5% 익절」처럼 말하면 **patch_scenario에 위 필드를 반드시 포함**해 저장하세요. 이름·strategy_text만 바꾸면 봇 매매 조건은 변하지 않습니다.
- **strategy_text** 만 저장할 때도 서버가 글 안의 %·원 표현을 파싱해 **drop_from_high_pct·buy_krw_amount 등에 자동 병합**합니다. 가능하면 **같은 patch에 수치 필드를 명시**해 주세요.

아래 JSON이 진실입니다. 사용자에게 설정을 설명할 때는 반드시 이 데이터와 일치시키세요.

{ctx}
"""


def _run_tool(name: str, args: dict[str, Any]) -> tuple[str, bool]:
    applied = False
    try:
        if name == "list_scenarios":
            return json.dumps({"ok": True, "scenarios": load_scenarios_list()}, ensure_ascii=False), False

        if name == "patch_scenario":
            sid = str(args.get("scenario_id") or "").strip()
            patch = args.get("patch")
            if not sid or not isinstance(patch, dict):
                return json.dumps({"ok": False, "error": "scenario_id 와 patch 가 필요합니다."}, ensure_ascii=False), False
            merged = patch_scenario(sid, patch)
            applied = True
            return json.dumps({"ok": True, "scenario": merged}, ensure_ascii=False, indent=2), applied

        if name == "add_scenario":
            body = {k: v for k, v in args.items() if v is not None}
            one = add_scenario(body)
            applied = True
            return json.dumps({"ok": True, "scenario": one}, ensure_ascii=False, indent=2), applied

        if name == "remove_scenario":
            sid = str(args.get("scenario_id") or "").strip()
            if not sid:
                return json.dumps({"ok": False, "error": "scenario_id 가 필요합니다."}, ensure_ascii=False), False
            rest = remove_scenario(sid)
            applied = True
            return json.dumps({"ok": True, "scenarios": rest}, ensure_ascii=False, indent=2), applied

        if name == "replace_all_scenarios":
            arr = args.get("scenarios")
            if not isinstance(arr, list):
                return json.dumps({"ok": False, "error": "scenarios 배열이 필요합니다."}, ensure_ascii=False), False
            saved = save_scenarios_list(arr)
            applied = True
            return json.dumps({"ok": True, "scenarios": saved}, ensure_ascii=False, indent=2), applied

        return json.dumps({"ok": False, "error": f"알 수 없는 도구: {name}"}, ensure_ascii=False), False
    except ValueError as e:
        return json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False), False
    except Exception as e:
        return json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False), False


def _last_user_content(user_messages: list[dict[str, Any]]) -> str:
    for m in reversed(user_messages):
        if m.get("role") == "user":
            return (m.get("content") or "").strip()
    return ""


def _apply_utterance_numeric_first_scenario(user_messages: list[dict[str, Any]]) -> bool:
    """마지막 사용자 메시지의 %·금액 등을 정규식으로 추출해 첫 시나리오에 저장."""
    last = _last_user_content(user_messages)
    if not last:
        return False
    patch = extract_numeric_strategy_patch(last)
    if not patch:
        return False
    migrate_if_needed()
    sl = load_scenarios_list()
    if not sl:
        return False
    sid = str(sl[0].get("id") or "")
    if not sid:
        return False
    try:
        patch_scenario(sid, patch)
        return True
    except ValueError:
        return False


def _sanitize_history(msgs: list[dict[str, Any]]) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for m in msgs[-MAX_HISTORY_MESSAGES:]:
        if not isinstance(m, dict):
            continue
        role = m.get("role")
        content = m.get("content")
        if role not in ("user", "assistant"):
            continue
        if not isinstance(content, str):
            content = "" if content is None else str(content)
        content = content.strip()
        if not content:
            continue
        out.append({"role": role, "content": content[:12000]})
    return out


def _history_to_gemini_contents(user_messages: list[dict[str, str]]) -> list[types.Content]:
    out: list[types.Content] = []
    for m in user_messages:
        role = m["role"]
        text = m["content"]
        if role == "user":
            out.append(types.Content(role="user", parts=[types.Part.from_text(text=text)]))
        else:
            out.append(types.Content(role="model", parts=[types.Part.from_text(text=text)]))
    return out


def _make_generate_config(
    tool: types.Tool, system_instruction: str
) -> types.GenerateContentConfig:
    return types.GenerateContentConfig(
        system_instruction=system_instruction,
        tools=[tool],
        temperature=0.4,
        automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
    )


def _scenario_json_for_prompt(scenario: dict[str, Any]) -> str:
    """프롬프트용: data URL은 용량이 커서 생략 표시."""
    sc = dict(scenario)
    if sc.get("avatar_image_data"):
        sc["avatar_image_data"] = "[업로드된 프로필 사진 있음]"
    return json.dumps(sc, ensure_ascii=False, indent=2)


def _trading_rules_summary_ko(scenario: dict[str, Any]) -> str:
    """대시보드 시그널·안전장치의 거래 조건과 같은 축 — 전략·```strategy``` 초안이 수치와 어긋나지 않게."""
    s = scenario
    lines: list[str] = []
    bem = str(s.get("buy_entry_mode") or "").strip().lower()
    if bem == BUY_ENTRY_MODE_WATCH_SHARE:
        lines.append(
            "- 매수 방식: 감시 종목 중 플러스 비중 "
            f"(기준 고가 대비 +{WATCH_POSITIVE_VS_REF_FIXED_PCT}% 이상을 ‘플러스’로 보는 것은 고정)"
        )
    elif bem == BUY_ENTRY_MODE_MIDPOINT_RISE:
        lines.append("- 매수 방식: 구간 미들포인트 대비 상승 (%p 이상일 때 매수)")
    elif bem == BUY_ENTRY_MODE_DROP:
        lines.append("- 매수 방식: 기간 고가 대비 하락")
    else:
        lines.append("- 매수 방식: 기간 고가 대비 하락")
    dr = str(s.get("drop_reference_high") or "24h").strip().lower()
    lines.append(f"- 기준 고가 기간: {dr}")
    if bem == BUY_ENTRY_MODE_DROP:
        dfp = s.get("drop_from_high_pct")
        if dfp is None or dfp == "":
            lines.append("- 하락(매수) %: 미사용")
        else:
            try:
                lines.append(f"- 하락(매수) %: {float(dfp) * 100:.4g}%")
            except (TypeError, ValueError):
                lines.append("- 하락(매수) %: (확인 필요)")
    elif bem == BUY_ENTRY_MODE_MIDPOINT_RISE:
        dmw = str(s.get("drop_midpoint_gate_window") or "1h").strip().lower()
        dmg = s.get("drop_midpoint_gate_min_pct")
        if dmg is not None and str(dmg).strip() != "":
            try:
                g = float(dmg)
                lines.append(f"- 미들 상승: 구간 {dmw}, 기준 미들 대비 +{g:.4g}%p 이상")
            except (TypeError, ValueError):
                lines.append("- 미들 상승: (확인 필요)")
        else:
            lines.append("- 미들 상승: 미설정")
    if bem == BUY_ENTRY_MODE_WATCH_SHARE:
        bms = s.get("buy_min_watch_positive_share_pct")
        lines.append(f"- 플러스 비중 최소(%): {bms if bms is not None and bms != '' else '—'}")
    rise = s.get("rise_from_entry_pct")
    try:
        rv = float(rise) if rise is not None and rise != "" else None
        lines.append(f"- 익절(평단 대비 상승 %): {rv * 100 if rv is not None else '—'}%")
    except (TypeError, ValueError):
        lines.append("- 익절(평단 대비 상승 %): —")
    sl = s.get("stop_loss_from_entry_pct")
    if sl is not None and sl != "":
        try:
            slf = float(sl)
            lines.append(
                f"- 손절(평단 대비 하락 %): {slf * 100:.4g}%"
                if slf > 0
                else "- 손절: 미사용"
            )
        except (TypeError, ValueError):
            lines.append("- 손절: —")
    else:
        lines.append("- 손절: 미사용")
    lines.append(f"- 자동매매(저장): {'ON' if s.get('trading_enabled', True) is not False else 'OFF'}")
    ls = s.get("loop_seconds")
    if ls is None or ls == "":
        lines.append("- 감시 주기(루프 초): 비움(환경 기본)")
    else:
        try:
            lines.append(f"- 감시 주기(루프 초): {int(ls)}")
        except (TypeError, ValueError):
            lines.append("- 감시 주기(루프 초): —")
    cd = s.get("cooldown_seconds_after_trade")
    try:
        cdi = int(cd) if cd is not None and cd != "" else 0
        lines.append(f"- 체결 후 쿨다운(초): {cdi if cdi > 0 else '없음'}")
    except (TypeError, ValueError):
        lines.append("- 체결 후 쿨다운(초): —")
    tiers = s.get("buy_allocation_tiers") or {}
    if isinstance(tiers, dict) and tiers:
        parts: list[str] = []
        for key, label in (("upper", "상"), ("middle", "중"), ("lower", "하")):
            t = tiers.get(key)
            if not isinstance(t, dict):
                continue
            try:
                v = float(t.get("value"))
            except (TypeError, ValueError):
                continue
            if v <= 0:
                continue
            mode = str(t.get("mode") or "krw").lower()
            if mode == "pct":
                parts.append(f"{label} {v:g}%")
            else:
                parts.append(f"{label} {v:,.0f}원")
        lines.append("- 순위별 매수(저장): " + (" · ".join(parts) if parts else "미설정"))
    elif s.get("buy_krw_amount") not in (None, ""):
        try:
            lines.append(f"- 1회 매수(레거시 원): {float(s['buy_krw_amount']):,.0f}")
        except (TypeError, ValueError):
            lines.append("- 1회 매수: —")
    else:
        lines.append("- 순위별 매수 / 1회 금액: 미설정·.env 가능")
    wr = bool(s.get("watch_random"))
    wst = str(s.get("watch_pool_style") or "all")
    lines.append(f"- 감시: {'무작위 루프, 스타일 ' + wst if wr else '수동 — watch_symbols·필터 동기화'}")
    ws = s.get("watch_symbols")
    if isinstance(ws, list) and ws:
        lines.append("- 감시 종목(일부): " + ", ".join(str(x) for x in ws[:12]) + ("…" if len(ws) > 12 else ""))
    elif s.get("trading_symbol"):
        lines.append(f"- 기본 심볼: {s.get('trading_symbol')}")
    ak = s.get("allocated_krw")
    if ak is not None and ak != "":
        try:
            lines.append(f"- 부여 자산(원): {float(ak):,.0f}")
        except (TypeError, ValueError):
            lines.append("- 부여 자산: —")
    else:
        lines.append("- 부여 자산: 미설정(제한 없음)")
    return "\n".join(lines)


def _gender_label_ko(g: str | None) -> str:
    m = {
        "male": "남성",
        "female": "여성",
        "other": "기타",
        "unspecified": "비공개",
    }
    key = str(g or "").strip().lower()
    return m.get(key, (g or "").strip() or "미정")


def _age_band_ko(age: Any) -> str:
    if age is None or age == "":
        return "미정"
    try:
        a = int(age)
    except (TypeError, ValueError):
        return "미정"
    if a < 30:
        return "20대"
    if a < 40:
        return "30대"
    if a < 50:
        return "40대"
    if a < 60:
        return "50대"
    return "60대 이상"


def _mbti_speech_hints(mbti: str) -> str:
    m = (mbti or "").strip().upper()
    if len(m) != 4 or not m.isalpha():
        return "MBTI가 없거나 불완전하면 말투는 중간적·균형 있게 유지."
    parts: list[str] = []
    if m[0] == "E":
        parts.append("말이 비교적 많고, 리액션·질문을 자주 섞음.")
    elif m[0] == "I":
        parts.append("말 수는 적당히, 문장은 짧고 차분하게.")
    if m[1] == "S":
        parts.append("구체적 사실·숫자·당장 할 일 위주.")
    elif m[1] == "N":
        parts.append("가능성·맥락·큰 그림을 가끔 언급.")
    if m[2] == "T":
        parts.append("논리·손익·리스크 언급이 자연스럽게.")
    elif m[2] == "F":
        parts.append("톤이 조금 부드럽고, 부담·스트레스 표현에 민감.")
    if m[3] == "J":
        parts.append("정리·마감·다음 액션을 말미에 짚음.")
    elif m[3] == "P":
        parts.append("유연하고, 선택지를 나란히 제시하는 편.")
    return " ".join(parts)


def _rank_formality_hint(rank: str) -> str:
    r = (rank or "").strip()
    if not r:
        return "직급 미정이면 동료 수준의 반말·존댓말 중 하나로 일관되게 (한 가지로 고정)."
    senior_kw = (
        "이사",
        "본부장",
        "팀장",
        "수석",
        "선임",
        "책임",
        "대리",
        "과장",
        "부장",
        "임원",
        "대표",
    )
    if any(k in r for k in senior_kw):
        return "직급이 높아 보이므로 격식 있는 존댓말, 보고·정리 톤을 섞음."
    junior_kw = ("주임", "사원", "매매원", "주니어", "어시", "인턴")
    if any(k in r for k in junior_kw):
        return "직급이 주니어에 가깝다면 동료 톤에 가깝되, 데스크에서는 예의 유지."
    return "직급에 맞게 선후배 관계를 자연스럽게 (과장된 연극은 피하고 데스크 동료 느낌)."


def _speech_style_from_profile(scenario: dict[str, Any]) -> str:
    """저장된 필드만으로 말투·스타일 규칙을 고정 (모델이 일관되게 따르도록)."""
    nm = scenario.get("name") or "트레이더"
    age = scenario.get("trader_age")
    mbti = scenario.get("trader_mbti") or ""
    rank = scenario.get("trader_rank") or ""
    gender_raw = scenario.get("trader_gender") or ""
    gender_ko = _gender_label_ko(gender_raw)
    age_band = _age_band_ko(age)
    style_saved = (scenario.get("trader_style") or "").strip()
    strat_excerpt = (scenario.get("strategy_text") or "").strip()[:400]
    lines = [
        f"이름·호칭: 대화 중 이 사람을 '{nm}'(으)로 부르고, **이 사람의 프로필 값만** 사용 (다른 직원 혼동 금지).",
        f"성별(저장값): {gender_ko} — 1인칭·호칭·어휘 선택에 반영 (예: 남성/여성에 맞는 자연스러운 한국어 표현).",
        f"나이대: {age_band} — 말버릇은 이 연령대에 맞게 (과장된 캐리커처는 피함).",
        _rank_formality_hint(rank),
        f"직급 표기: {rank or '미정'}",
        _mbti_speech_hints(mbti),
    ]
    if style_saved:
        lines.append(
            f"매매 성향·성격(저장됨)은 반드시 반영: {style_saved[:600]}"
            + ("…" if len(style_saved) > 600 else "")
        )
    else:
        lines.append("매매 성향(저장)이 비어 있으면 MBTI·직급·나이대만으로 말투를 잡음.")
    if strat_excerpt:
        lines.append(
            "전략 규칙 일부(참고·말투에 녹일 것, 법적 조언 아님): "
            + strat_excerpt
            + ("…" if len((scenario.get("strategy_text") or "")) > 400 else "")
        )
    return "【말투·캐릭터 규칙 — 아래 값을 실제 대화 스타일에 우선 적용】\n" + "\n".join(
        f"- {x}" for x in lines
    )


def _trader_chat_system_prompt(scenario: dict[str, Any]) -> str:
    """퀀트트레이더 1명 전용 — 도구 없음, 초안은 ```strategy``` / ```style``` 블록."""
    st = _load_status()
    snap: dict[str, Any] | None = None
    if st and st.get("mode") == "multi" and isinstance(st.get("scenarios"), list):
        sid = str(scenario.get("id") or "")
        for row in st["scenarios"]:
            if str(row.get("scenario_id")) == sid:
                snap = row if isinstance(row, dict) else None
                break
    nm = scenario.get("name") or "트레이더"
    age = scenario.get("trader_age")
    mbti = scenario.get("trader_mbti") or ""
    rank = scenario.get("trader_rank") or ""
    career = scenario.get("trader_career") or ""
    gender = scenario.get("trader_gender") or ""
    intro = (scenario.get("trader_self_intro") or "").strip()
    style_hint = (scenario.get("trader_style") or "")[:800]
    gender_display = _gender_label_ko(gender)
    speech_block = _speech_style_from_profile(scenario)
    persona = (
        f"【역할 연기】당신은 가상의 **퀀트 운용사 직원** '{nm}'으로서 사용자와 대화합니다.\n"
        f"- 직급: {rank or '미정'}\n"
        f"- 나이: {age if age is not None else '미정'}\n"
        f"- 성별(저장): {gender_display}\n"
        f"- MBTI: {mbti or '미정'}\n"
        f"- 경력: {career or '미정'}\n"
        f"- 자기소개: {intro or '미정'}\n"
        f"- 매매 성향(저장됨): {style_hint or '미정'}\n\n"
        f"{speech_block}\n\n"
        "**대화 스타일:** 위 【말투·캐릭터 규칙】을 **최우선**으로 적용하고, "
        "직급·나이·성별·MBTI·저장된 매매 성향이 서로 어긋나면 **저장된 매매 성향과 MBTI**를 우선합니다. "
        "**회사 동료·트레이딩 데스크** 분위기로 자연스럽게.\n"
        "다른 직원이나 시나리오인 척하지 말고, **이 한 사람**만 연기하세요.\n\n"
    )
    return (
        persona
        + "【매매 수치 요약 — 대시보드 시그널·안전장치와 동일. 전략 설명·```strategy``` 블록은 반드시 아래와 모순 없이】\n"
        + _trading_rules_summary_ko(scenario)
        + "\n\n【이 트레이더의 전체 설정(JSON)】\n"
        + _scenario_json_for_prompt(scenario)
        + "\n\n【현재 봇 스냅샷(이 트레이더)】\n"
        + json.dumps(snap if snap else {}, ensure_ascii=False, indent=2)
        + "\n\n규칙:\n"
        "- 이 시나리오 **이외**의 다른 트레이더를 바꾸라고 하지 마세요. **도구는 없습니다.** 저장은 사용자가 대시보드에서 합니다.\n"
        "- 투자 조언·수익 보장·시장 예측은 하지 마세요.\n"
        "- 사용자가 **전략 규칙**을 새로 쓰거나 고치고 싶다면, 답변 **맨 끝**에 다음 형식으로 초안을 넣으세요:\n"
        "  ```strategy\n(한글로 매수·매도 판단 규칙)\n```\n"
        "- **스타일·성격** 제안이 필요하면:\n"
        "  ```style\n(한글 한두 문단)\n```\n"
        "- 변경 제안이 없으면 코드 블록을 생략해도 됩니다.\n"
        "- 사용자가 「3% 하락」「5% 익절」「매수 1만원」처럼 말하면 서버가 **scenarios.json의 수치 필드**(drop_from_high_pct 등)를 **자동으로 갱신**할 수 있습니다. "
        "글만 바꾸지 말고, 가능하면 답에서 **저장된 소수 비율(예: 3% → 0.03)**을 짚어 주세요.\n"
    )


def run_llm_trader_chat(user_messages: list[dict[str, Any]], scenario_id: str) -> dict[str, Any]:
    """단일 트레이더와의 대화. 함수 도구 없음 — 전략은 ```strategy``` 블록으로만 제안."""
    migrate_if_needed()
    mine = get_scenario_by_id(scenario_id)
    if not mine:
        return {"reply": "해당 시나리오를 찾을 수 없습니다.", "applied": False}
    model = (os.getenv("GEMINI_MODEL") or "gemini-2.0-flash").strip()
    client = _client()
    contents: list[Any] = _history_to_gemini_contents(_sanitize_history(user_messages))
    sys = _trader_chat_system_prompt(mine)
    cfg = types.GenerateContentConfig(
        system_instruction=sys,
        temperature=0.35,
    )
    response = client.models.generate_content(
        model=model,
        contents=contents,
        config=cfg,
    )
    text = (response.text or "").strip()
    if not text:
        text = "응답을 생성하지 못했습니다. 다시 시도해 주세요."
    applied = False
    blocks = re.findall(r"```strategy\s*\n([\s\S]*?)```", text, re.IGNORECASE)
    if blocks:
        st_block = blocks[0].strip()
        if st_block:
            try:
                patch_scenario(scenario_id, {"strategy_text": st_block})
                applied = True
            except ValueError:
                pass
    last = _last_user_content(user_messages)
    if last:
        merged, patch = merge_utterance_patch_into_scenario(scenario_id, last)
        if merged is not None and patch:
            applied = True
    return {"reply": text, "applied": applied}


def run_llm_chat(user_messages: list[dict[str, Any]]) -> dict[str, Any]:
    model = (os.getenv("GEMINI_MODEL") or "gemini-2.0-flash").strip()
    client = _client()
    tool = types.Tool(function_declarations=_tool_declarations())

    contents: list[Any] = _history_to_gemini_contents(_sanitize_history(user_messages))
    applied_any = False
    rounds = 0

    while rounds < MAX_TOOL_ROUNDS:
        rounds += 1
        cfg = _make_generate_config(tool, _system_prompt())
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=cfg,
        )

        fc_list = response.function_calls or []
        if not fc_list:
            text = (response.text or "").strip()
            if not text:
                text = "응답을 생성하지 못했습니다. 다시 시도해 주세요."
            if _apply_utterance_numeric_first_scenario(user_messages):
                applied_any = True
            return {"reply": text, "applied": applied_any}

        cand = response.candidates[0] if response.candidates else None
        if not cand or not cand.content:
            return {
                "reply": "모델 응답이 비어 있거나 차단되었습니다. 잠시 후 다시 시도해 주세요.",
                "applied": applied_any,
            }

        contents.append(cand.content)

        tool_parts: list[types.Part] = []
        applied_this_round = False
        for fc in fc_list:
            fname = fc.name or ""
            args = fc.args
            if args is None:
                args = {}
            if not isinstance(args, dict):
                args = {}
            result_text, applied = _run_tool(fname, args)
            if applied:
                applied_any = True
                applied_this_round = True
            try:
                response_dict = json.loads(result_text)
            except json.JSONDecodeError:
                response_dict = {"raw": result_text}
            tool_parts.append(
                types.Part.from_function_response(
                    name=fname,
                    response=response_dict,
                )
            )

        contents.append(types.Content(role="tool", parts=tool_parts))
        if applied_this_round:
            pass

    if _apply_utterance_numeric_first_scenario(user_messages):
        applied_any = True
    return {
        "reply": "도구 호출이 너무 많이 이어졌습니다. 잠시 후 짧게 다시 물어봐 주세요.",
        "applied": applied_any,
    }


def is_llm_chat_configured() -> bool:
    return bool((os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip())
