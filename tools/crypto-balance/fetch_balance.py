#!/usr/bin/env python3
"""CCXT로 업비트/빗썸 현물 잔고 조회. 키는 .env 에서 로드."""

import os
import sys

import ccxt
from dotenv import load_dotenv

load_dotenv()


def make_exchange():
    name = (os.getenv("EXCHANGE") or "upbit").lower().strip()

    if name == "upbit":
        api_key = os.getenv("UPBIT_API_KEY")
        secret = os.getenv("UPBIT_SECRET")
        if not api_key or not secret:
            sys.exit("UPBIT_API_KEY, UPBIT_SECRET 를 .env 에 설정하세요.")
        return ccxt.upbit(
            {
                "apiKey": api_key,
                "secret": secret,
                "enableRateLimit": True,
            }
        )

    if name == "bithumb":
        api_key = os.getenv("BITHUMB_API_KEY")
        secret = os.getenv("BITHUMB_SECRET")
        if not api_key or not secret:
            sys.exit("BITHUMB_API_KEY, BITHUMB_SECRET 를 .env 에 설정하세요.")
        return ccxt.bithumb(
            {
                "apiKey": api_key,
                "secret": secret,
                "enableRateLimit": True,
            }
        )

    sys.exit("EXCHANGE 는 upbit 또는 bithumb 만 지원합니다.")


def main():
    exchange = make_exchange()
    balance = exchange.fetch_balance()

    print(f"거래소: {exchange.id}\n")
    for currency, amounts in balance.items():
        if currency in ("free", "used", "total", "info"):
            continue
        if not isinstance(amounts, dict):
            continue
        total = amounts.get("total")
        if total is None:
            continue
        if float(total) > 0:
            print(
                f"{currency}: total={amounts['total']}, "
                f"free={amounts['free']}, used={amounts['used']}"
            )


if __name__ == "__main__":
    main()
