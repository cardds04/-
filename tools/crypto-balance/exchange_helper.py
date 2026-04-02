"""업비트(CCXT) 연결, 잔고·시세·시장가 매수/매도."""

from __future__ import annotations

import os
from typing import Any, Optional

import ccxt
from dotenv import load_dotenv

load_dotenv()


def list_krw_market_symbols(exchange: ccxt.Exchange) -> list[str]:
    """CCXT exchange.markets 에서 KRW 마켓 심볼만 추출."""
    out: list[str] = []
    for m in exchange.markets.values():
        if not isinstance(m, dict):
            continue
        if m.get("quote") != "KRW":
            continue
        if not m.get("active", True):
            continue
        sym = m.get("symbol")
        if isinstance(sym, str) and sym.endswith("/KRW"):
            out.append(sym)
    return sorted(set(out))


class UpbitExchange:
    """CCXT 업비트 래퍼. 키는 UPBIT_API_KEY / UPBIT_SECRET (.env)."""

    def __init__(self) -> None:
        api_key = os.getenv("UPBIT_API_KEY")
        secret = os.getenv("UPBIT_SECRET")
        if not api_key or not secret:
            raise RuntimeError("UPBIT_API_KEY, UPBIT_SECRET 를 .env 에 설정하세요.")

        timeout_ms = int(os.getenv("UPBIT_TIMEOUT_MS", "30000"))
        self._exchange = ccxt.upbit(
            {
                "apiKey": api_key,
                "secret": secret,
                "enableRateLimit": True,
                "timeout": timeout_ms,
            }
        )

    @property
    def exchange(self) -> ccxt.Exchange:
        return self._exchange

    def load_markets(self) -> dict[str, Any]:
        return self._exchange.load_markets()

    def list_krw_symbols(self) -> list[str]:
        """활성 KRW 마켓 심볼 목록 (예: BTC/KRW). load_markets 선행 권장."""
        return list_krw_market_symbols(self._exchange)

    def fetch_balance(self) -> dict[str, Any]:
        """CCXT 표준 잔고 구조."""
        return self._exchange.fetch_balance()

    def fetch_ticker(self, symbol: str) -> dict[str, Any]:
        """symbol 예: 'BTC/KRW'. high=24h 최고가, last=최근 체결가."""
        return self._exchange.fetch_ticker(symbol)

    def get_last_price(self, symbol: str) -> float:
        t = self.fetch_ticker(symbol)
        last = t.get("last")
        if last is None:
            raise RuntimeError(f"시세 last 없음: {symbol}")
        return float(last)

    def market_buy_krw(self, symbol: str, krw_cost: float) -> dict[str, Any]:
        """
        시장가 매수. krw_cost: 지출할 원화 총액(업비트 최소 주문 금액 이상이어야 함).
        CCXT 업비트: params.cost 로 원화 금액 전달.
        """
        if krw_cost <= 0:
            raise ValueError("krw_cost 는 0보다 커야 합니다.")
        return self._exchange.create_order(
            symbol,
            "market",
            "buy",
            0,
            None,
            {"cost": krw_cost},
        )

    def market_sell_base(self, symbol: str, amount: float) -> dict[str, Any]:
        """시장가 매도. amount: 매도할 베이스 자산 수량(예: BTC)."""
        if amount <= 0:
            raise ValueError("amount 는 0보다 커야 합니다.")
        return self._exchange.create_market_sell_order(symbol, amount)

    @staticmethod
    def base_and_quote(symbol: str) -> tuple[str, str]:
        """'BTC/KRW' -> ('BTC', 'KRW')."""
        parts = symbol.split("/")
        if len(parts) != 2:
            raise ValueError(f"symbol 형식은 BASE/QUOTE 여야 합니다: {symbol}")
        return parts[0].strip(), parts[1].strip()

    @staticmethod
    def free_quote(bal: dict[str, Any], quote: str) -> float:
        """원화(또는 quote) 사용 가능 잔고."""
        row = bal.get(quote)
        if not isinstance(row, dict):
            return 0.0
        return float(row.get("free") or 0)

    @staticmethod
    def average_fill_price(order: dict[str, Any]) -> Optional[float]:
        """체결 평균가 추정. 없으면 None."""
        avg = order.get("average")
        if avg is not None:
            return float(avg)
        price = order.get("price")
        if price is not None:
            return float(price)
        return None


def avg_buy_krw_per_unit_from_balance(bal: dict[str, Any]) -> dict[str, float | None]:
    """
    업비트 GET /v1/accounts 원본은 bal['info'] 리스트에 남습니다.
    코인 1단위당 평균 매수가(KRW). KRW 현금 행은 보통 0이라 None 처리.
    """
    out: dict[str, float | None] = {}
    info = bal.get("info")
    if not isinstance(info, list):
        return out
    for row in info:
        if not isinstance(row, dict):
            continue
        cid = row.get("currency")
        if not cid:
            continue
        key = str(cid).upper()
        raw = row.get("avg_krw_buy_price")
        if raw is None or raw == "":
            raw = row.get("avg_buy_price")
        if raw is None or raw == "":
            out[key] = None
            continue
        try:
            v = float(raw)
        except (TypeError, ValueError):
            out[key] = None
            continue
        if v <= 0:
            out[key] = None
        else:
            out[key] = v
    return out
