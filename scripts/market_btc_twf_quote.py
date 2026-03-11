#!/usr/bin/env python3
import json
import re
import subprocess
import sys
from typing import Any

import requests

BTC_SCRIPT = "/home/kurohime/.openclaw/workspace/scripts/binance_btc_futures_quote.py"
YAHOO_WTX_URL = "https://tw.stock.yahoo.com/future/WTX&"


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
    return int(round(float(str(price).replace(",", ""))))


def get_twf_int() -> int:
    h = requests.get(
        YAHOO_WTX_URL,
        headers={"user-agent": "Mozilla/5.0"},
        timeout=15,
    ).text

    m = re.search(r'"price":\{"raw":"?([0-9]{4,6}(?:\.[0-9]+)?)"?', h)
    if not m:
        raise ValueError("WTX price not found")
    return int(round(float(m.group(1))))


def main() -> int:
    btc = None
    twf = None

    try:
        btc = get_btc_int()
    except Exception:
        pass

    try:
        twf = get_twf_int()
    except Exception:
        pass

    if btc is not None and twf is not None:
        print(f"BTC {btc}，台指期 {twf}")
        return 0

    if btc is not None:
        print(f"BTC {btc}，台指期 取值失敗")
        return 0

    if twf is not None:
        print(f"BTC 取值失敗，台指期 {twf}")
        return 0

    print("BTC/台指期 報價失敗")
    return 0


if __name__ == "__main__":
    sys.exit(main())
