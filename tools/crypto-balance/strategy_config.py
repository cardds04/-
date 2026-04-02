"""레거시 호환: 단일 전략처럼 보이게 첫 번째 시나리오를 읽고/씁니다. 실제 저장은 scenarios.json."""

from __future__ import annotations

from typing import Any

from scenarios import (
    migrate_if_needed,
    load_scenarios_list,
    patch_first_scenario_from_flat,
    scenario_to_flat,
)

DEFAULT_STRATEGY: dict[str, Any] = {
    "drop_from_high_pct": 0.03,
    "rise_from_entry_pct": 0.05,
    "trading_enabled": True,
    "trading_symbol": None,
    "loop_seconds": None,
    "buy_krw_amount": None,
    "cooldown_seconds_after_trade": 0,
}


def load_strategy_config() -> dict[str, Any]:
    """첫 시나리오를 flat dict 로 (기존 dashboard / 채팅 호환)."""
    migrate_if_needed()
    sl = load_scenarios_list()
    if not sl:
        return dict(DEFAULT_STRATEGY)
    merged = scenario_to_flat(sl[0])
    return {**DEFAULT_STRATEGY, **merged}


def save_strategy_config(data: dict[str, Any]) -> dict[str, Any]:
    """첫 시나리오에 병합 저장."""
    return patch_first_scenario_from_flat(data)


def validate_strategy_payload(raw: dict) -> dict:
    """호환용 — scenarios 검증으로 위임."""
    from scenarios import validate_scenario_patch, load_scenarios_list, validate_scenario_dict

    migrate_if_needed()
    scenarios = load_scenarios_list()
    first = scenarios[0]
    patch = validate_scenario_patch(raw)
    merged = {**first, **patch}
    return validate_scenario_dict(merged, require_id=True)
