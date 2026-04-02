"""체결 이력 JSON (퀀트 스타일 성과 집계용)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
TRADES_PATH = BASE_DIR / "trades.json"
MAX_TRADES = 500


def read_trades() -> list[dict]:
    if not TRADES_PATH.is_file():
        return []
    try:
        data = json.loads(TRADES_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def append_trade(record: dict) -> None:
    trades = read_trades()
    row = {
        "ts": datetime.now(timezone.utc).isoformat(),
        **record,
    }
    trades.append(row)
    if len(trades) > MAX_TRADES:
        trades = trades[-MAX_TRADES:]
    tmp = TRADES_PATH.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(trades, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(TRADES_PATH)


def compute_stats(trades: list[dict] | None = None) -> dict:
    """간단 실현손익·승패 (매도 레코드의 realized_pnl_krw 합산)."""
    if trades is None:
        trades = read_trades()
    total_pnl = 0.0
    wins = 0
    losses = 0
    buy_vol = 0.0
    sell_vol = 0.0
    for t in trades:
        side = str(t.get("side", "")).lower()
        if side == "buy":
            buy_vol += float(t.get("cost_krw") or 0)
        elif side == "sell":
            sell_vol += float(t.get("proceeds_krw") or 0)
            p = t.get("realized_pnl_krw")
            if p is not None:
                p = float(p)
                total_pnl += p
                if p > 1e-9:
                    wins += 1
                elif p < -1e-9:
                    losses += 1
    n_sell = wins + losses
    win_rate = (wins / n_sell * 100.0) if n_sell else None
    return {
        "trade_count": len(trades),
        "sell_count": n_sell,
        "total_realized_pnl_krw": total_pnl,
        "win_trades": wins,
        "loss_trades": losses,
        "win_rate_pct": win_rate,
        "sum_buy_krw": buy_vol,
        "sum_sell_krw": sell_vol,
    }
