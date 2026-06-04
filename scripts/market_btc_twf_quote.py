#!/usr/bin/env python3
import json
import subprocess
import sys
from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

import requests

BTC_SCRIPT = "/home/kurohime/.openclaw/workspace/scripts/binance_btc_futures_quote.py"
TAIFEX_HOME_URL = "https://mis.taifex.com.tw/futures/"
TAIFEX_QUOTE_URL = "https://mis.taifex.com.tw/futures/api/getQuoteList"
TAIPEI_TZ = ZoneInfo("Asia/Taipei")
BTC_RANGE = (10_000, 300_000)
TWF_RANGE = (10_000, 80_000)


def run_cmd(args: list[str], timeout: int = 30) -> str:
    proc = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip() or f"command failed: {' '.join(args)}")
    return (proc.stdout or "").strip()


def extract_json_block(text: str) -> Any:
    text = text.strip()
    if not text:
        raise ValueError("empty output")

    if text[0] in "[{\"":
        try:
            return json.loads(text)
        except Exception:
            pass

    for i, ch in enumerate(text):
        if ch in "[{\"":
            chunk = text[i:]
            try:
                return json.loads(chunk)
            except Exception:
                continue

    raise ValueError("no json found")


def get_btc_int() -> int:
    out = run_cmd(["python3", BTC_SCRIPT], timeout=20)
    data = extract_json_block(out)
    if not isinstance(data, dict):
        raise ValueError("btc script output is not object")
    price = data.get("priceRounded")
    if price is None:
        raise ValueError("priceRounded missing")
    value = int(round(float(str(price).replace(",", ""))))
    validate_range("BTC", value, BTC_RANGE)
    return value


def validate_range(label: str, value: int, bounds: tuple[int, int]) -> None:
    low, high = bounds
    if not low <= value <= high:
        raise ValueError(f"{label} price out of range: {value}")


def quote_time_today(raw_time: str, now: datetime) -> datetime | None:
    raw_time = str(raw_time or "").strip()
    if not raw_time or len(raw_time) < 6:
        return None
    try:
        quote_dt = now.replace(
            hour=int(raw_time[:2]),
            minute=int(raw_time[2:4]),
            second=int(raw_time[4:6]),
            microsecond=0,
        )
    except ValueError:
        return None
    if quote_dt > now + timedelta(minutes=30):
        quote_dt -= timedelta(days=1)
    return quote_dt


def get_twf_quote_candidates(market_type: str, session: requests.Session, headers: dict[str, str]) -> list[tuple[datetime, int]]:
    payload = {
        "MarketType": market_type,
        "SymbolType": "F",
        "KindID": "1",
        "CID": "TXF",
        "ExpireMonth": "",
        "RowSize": "全部",
        "PageNo": "",
        "SortColumn": "",
        "AscDesc": "A",
    }

    response = session.post(
        TAIFEX_QUOTE_URL,
        json=payload,
        headers={**headers, "content-type": "application/json"},
        timeout=15,
    )
    response.raise_for_status()
    data = response.json()

    quotes = data.get("RtData", {}).get("QuoteList", [])
    if not isinstance(quotes, list):
        raise ValueError("TAIFEX QuoteList missing")

    now = datetime.now(TAIPEI_TZ)
    candidates: list[tuple[datetime, int]] = []
    for quote in quotes:
        if not isinstance(quote, dict):
            continue
        symbol = str(quote.get("SymbolID") or "")
        name = str(quote.get("DispCName") or "")
        raw_price = str(quote.get("CLastPrice") or "").replace(",", "").strip()
        quote_dt = quote_time_today(str(quote.get("CTime") or ""), now)

        if not symbol.startswith("TXF") or symbol == "TXF-S":
            continue
        if "現貨" in name or not raw_price or quote_dt is None:
            continue

        value = int(round(float(raw_price)))
        validate_range("台指期", value, TWF_RANGE)
        candidates.append((quote_dt, value))

    return candidates


def get_twf_int() -> int:
    headers = {
        "accept": "application/json",
        "user-agent": "Mozilla/5.0",
    }
    session = requests.Session()
    session.get(TAIFEX_HOME_URL, headers=headers, timeout=10)

    candidates: list[tuple[datetime, int]] = []
    for market_type in ("1", "0"):
        candidates.extend(get_twf_quote_candidates(market_type, session, headers))

    if candidates:
        return max(candidates, key=lambda item: item[0])[1]

    raise ValueError("TAIFEX TXF quote not found")


def is_weekend_taipei() -> bool:
    # Monday=0 ... Sunday=6
    return datetime.now(TAIPEI_TZ).weekday() >= 5


def main() -> int:
    btc = None
    twf = None

    try:
        btc = get_btc_int()
    except Exception:
        pass

    weekend = is_weekend_taipei()

    if weekend:
        if btc is not None:
            print(f"BTC {btc}")
            return 0
        print("BTC 取值失敗")
        return 0

    try:
        twf = get_twf_int()
    except Exception:
        pass

    if btc is not None and twf is not None:
        print(f"BTC {btc}，台指期 {twf}")
        return 0

    if btc is not None:
        print(f"BTC {btc}")
        return 0

    if twf is not None:
        print(f"台指期 {twf}")
        return 0

    print("BTC/台指期 報價失敗")
    return 0


if __name__ == "__main__":
    sys.exit(main())
