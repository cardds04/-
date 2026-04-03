"""업비트(CCXT) 연결, 잔고·시세·시장가 매수/매도."""

from __future__ import annotations

import logging
import math
import os
import time
from typing import Any, Optional

import ccxt
from ccxt.base.errors import (
    ExchangeError,
    ExchangeNotAvailable,
    InsufficientFunds,
    InvalidOrder,
    NetworkError,
    RequestTimeout,
)

log = logging.getLogger(__name__)
from dotenv import load_dotenv

load_dotenv()

try:
    from runtime_credentials import apply_runtime_credentials

    apply_runtime_credentials()
except ImportError:
    pass


def _upbit_krw_tick_size(price: float) -> float:
    """
    원화(KRW) 마켓 주문 가격 구간별 호가 단위.
    https://docs.upbit.com/kr/kr/docs/krw-market-info (2025년 기준 표와 동일)
    """
    p = float(price)
    if p >= 2_000_000:
        return 1000.0
    if p >= 1_000_000:
        return 1000.0
    if p >= 500_000:
        return 500.0
    if p >= 100_000:
        return 100.0
    if p >= 50_000:
        return 50.0
    if p >= 10_000:
        return 10.0
    if p >= 5_000:
        return 5.0
    if p >= 1_000:
        return 1.0
    if p >= 100:
        return 1.0
    if p >= 10:
        return 0.1
    if p >= 1:
        return 0.01
    if p >= 0.1:
        return 0.001
    if p >= 0.01:
        return 0.0001
    if p >= 0.001:
        return 0.00001
    if p >= 0.0001:
        return 0.000001
    if p >= 0.00001:
        return 0.0000001
    return 0.00000001


def upbit_krw_floor_to_valid_order_price(price: float) -> float:
    """주문 가격을 해당 구간 호가 단위로 내림(매수 지정가). 구간 경계 시 tick 재계산."""
    p = float(price)
    if p <= 0:
        return 0.0
    for _ in range(32):
        t = _upbit_krw_tick_size(p)
        q = math.floor(p / t + 1e-12) * t
        if abs(q - p) <= 1e-9 * max(1.0, abs(p)):
            return q
        p = q
    return p


def _upbit_krw_price_api_string(price: float) -> str:
    """업비트 API에 넣을 가격 문자열(과학적 표기·부동소수 찌꺼기 완화)."""
    from decimal import Decimal

    d = Decimal(str(float(price)))
    if d == d.to_integral():
        return str(int(d))
    return format(d.normalize(), "f")


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
            raise RuntimeError(
                "UPBIT_API_KEY, UPBIT_SECRET 가 없습니다. .env 를 채우거나 대시보드에서 API 키를 저장하세요."
            )

        timeout_ms = int(os.getenv("UPBIT_TIMEOUT_MS", "30000"))
        self._exchange = ccxt.upbit(
            {
                "apiKey": api_key,
                "secret": secret,
                "enableRateLimit": True,
                "timeout": timeout_ms,
            }
        )
        # CCXT 업비트 기본 rateLimit(50ms)은 봇+스레드+다종목에서 초당 제한에 걸리기 쉬움.
        try:
            rl = int(os.getenv("UPBIT_CCXT_RATELIMIT_MS", "120").strip() or "120")
        except ValueError:
            rl = 120
        if rl >= 50:
            self._exchange.rateLimit = rl

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

    def ensure_ticker(
        self,
        symbol: str,
        *,
        tickers_map: dict[str, Any] | None,
        cache: dict[str, dict[str, Any]],
    ) -> dict[str, Any]:
        """루프 전역 fetch_tickers 결과 → 종목별 캐시 → 단일 fetch 순 (REST 호출 최소화)."""
        if symbol in cache:
            return cache[symbol]
        if tickers_map:
            raw = tickers_map.get(symbol)
            if isinstance(raw, dict) and raw.get("last") is not None:
                cache[symbol] = raw
                return raw
        t = self.fetch_ticker(symbol)
        cache[symbol] = t
        return t

    def fetch_tickers_for_symbols(self, symbols: list[str]) -> dict[str, dict[str, Any]]:
        """
        업비트는 markets 쿼리로 여러 티커를 한 번에 조회 가능.
        종목마다 fetch_ticker 반복보다 요청 수가 훨씬 적다.
        """
        uniq: list[str] = []
        seen: set[str] = set()
        for s in symbols:
            if isinstance(s, str) and s and s not in seen:
                seen.add(s)
                uniq.append(s)
        if not uniq:
            return {}
        try:
            chunk_sz = int(os.getenv("UPBIT_TICKERS_BATCH_SIZE", "100").strip() or "100")
        except ValueError:
            chunk_sz = 100
        chunk_sz = max(1, min(chunk_sz, 200))
        out: dict[str, dict[str, Any]] = {}
        ex = self._exchange
        for i in range(0, len(uniq), chunk_sz):
            part = uniq[i : i + chunk_sz]
            try:
                batch = ex.fetch_tickers(part)
                if isinstance(batch, dict):
                    for k, v in batch.items():
                        if isinstance(v, dict):
                            out[str(k)] = v
            except Exception as e:
                log.warning(
                    "fetch_tickers 배치 실패(%d종목) — 심볼별 조회로 대체: %s",
                    len(part),
                    e,
                )
                for sym in part:
                    try:
                        out[sym] = ex.fetch_ticker(sym)
                    except Exception as e2:
                        log.warning("티커 조회 실패 %s: %s", sym, e2)
        return out

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

    def limit_buy_krw_pullback(
        self,
        symbol: str,
        *,
        last_price: float,
        total_krw: float,
        offsets_pct_points: list[float],
        min_krw_per_order: float = 5000.0,
    ) -> list[dict[str, Any]]:
        """
        현재가(last_price) 대비 offsets_pct_points[%] 만큼 아래 지정가로 매수(보통 1개 값 = 지정가 1건).
        total_krw 를 구간 수로 균등 분배. 각 구간이 min_krw_per_order 미만이면 해당 구간은 건너뜀.
        """
        ex = self._exchange
        if last_price <= 0 or total_krw <= 0:
            raise ValueError("last_price, total_krw 는 0보다 커야 합니다.")
        offs = [float(x) for x in offsets_pct_points if float(x) > 0]
        if not offs:
            raise ValueError("offsets_pct_points 가 비었습니다.")
        n = len(offs)
        krw_each = total_krw / float(n)
        out: list[dict[str, Any]] = []
        for off in offs:
            lp = float(last_price) * (1.0 - off / 100.0)
            if lp <= 0:
                continue
            if krw_each + 1e-9 < float(min_krw_per_order):
                log.warning(
                    "[%s] 눌림목 구간당 원화 %.0f원 < 최소 %.0f원 — 해당 구간 생략",
                    symbol,
                    krw_each,
                    min_krw_per_order,
                )
                continue
            krw_market = isinstance(symbol, str) and symbol.endswith("/KRW")
            try:
                if krw_market:
                    lp_p = upbit_krw_floor_to_valid_order_price(lp)
                    if lp_p <= 0:
                        continue
                    amt = krw_each / lp_p
                    amt_p = float(ex.amount_to_precision(symbol, amt))
                    if amt_p <= 0:
                        continue
                    price_str = _upbit_krw_price_api_string(lp_p)
                    order = ex.create_order(
                        symbol,
                        "limit",
                        "buy",
                        amt_p,
                        lp_p,
                        params={"price": price_str},
                    )
                else:
                    lp_p = float(ex.price_to_precision(symbol, lp))
                    if lp_p <= 0:
                        continue
                    amt = krw_each / lp_p
                    amt_p = float(ex.amount_to_precision(symbol, amt))
                    if amt_p <= 0:
                        continue
                    order = ex.create_order(symbol, "limit", "buy", amt_p, lp_p)
            except (InsufficientFunds, InvalidOrder, ExchangeError) as e:
                log.error("[%s] 눌림목 지정가 주문 거절/거래소: %s", symbol, e)
                raise
            except Exception as e:
                log.exception("[%s] 눌림목 지정가 주문 비정상 오류", symbol)
                raise
            out.append(order)
        return out

    def market_sell_base(self, symbol: str, amount: float) -> dict[str, Any]:
        """시장가 매도. amount: 매도할 베이스 자산 수량(예: BTC)."""
        if amount <= 0:
            raise ValueError("amount 는 0보다 커야 합니다.")
        return self._exchange.create_market_sell_order(symbol, amount)

    def market_sell_base_with_retries(
        self,
        symbol: str,
        amount: float,
        *,
        log_: logging.Logger | None = None,
        context: str = "",
        max_attempts: int = 3,
    ) -> dict[str, Any] | None:
        """
        시장가 매도. 일시적 네트워크/타임아웃 시 짧은 간격으로 재시도(손절·익절 체결 안정화).
        실패 시 None, 잔고·주문 거절 시 None(재시도 없음).
        """
        lg = log_ or log
        transient = (RequestTimeout, NetworkError, ExchangeNotAvailable)
        last_exc: BaseException | None = None
        for attempt in range(1, max_attempts + 1):
            if attempt > 1:
                time.sleep(2.0 * (attempt - 1))
            try:
                return self.market_sell_base(symbol, amount)
            except InsufficientFunds as e:
                lg.error("%s 매도 실패(잔고) %s: %s", context, symbol, e)
                return None
            except InvalidOrder as e:
                lg.error("%s 매도 실패(주문) %s: %s", context, symbol, e)
                return None
            except transient as e:
                last_exc = e
                lg.warning(
                    "%s 매도 네트워크 %s (%d/%d): %s",
                    context,
                    symbol,
                    attempt,
                    max_attempts,
                    e,
                )
            except ExchangeError as e:
                lg.error("%s 매도 실패(거래소) %s: %s", context, symbol, e)
                return None
        if last_exc is not None:
            lg.error("%s 매도 최종 실패(네트워크) %s: %s", context, symbol, last_exc)
        return None

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
