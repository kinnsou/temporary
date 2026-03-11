#!/usr/bin/env python3
import json
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional

BTC_SCRIPT = "/home/kurohime/.openclaw/workspace/scripts/binance_btc_futures_quote.py"
WTXP_URL = "https://www.wantgoo.com/futures/wtxp&"
CACHE_PATH = Path("/home/kurohime/.openclaw/workspace/memory/market-last.json")


def run_cmd(args: list[str], timeout: int = 30) -> str:
    proc = subprocess.run(args, capture_output=True, text=True, timeout=timeout)
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr.strip() or proc.stdout.strip() or f"command failed: {' '.join(args)}")
    return (proc.stdout or "").strip()


def extract_json_block(text: str):
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


def find_wtxp_tab_id() -> Optional[str]:
    out = run_cmd(["openclaw", "browser", "--browser-profile", "chrome", "tabs", "--json"], timeout=20)
    data = extract_json_block(out)
    tabs = data.get("tabs", []) if isinstance(data, dict) else []
    for t in tabs:
        url = str(t.get("url", ""))
        if "wantgoo.com/futures/wtxp" in url:
            return str(t.get("targetId"))
    return None


def get_wtxp_text() -> str:
    tab_id = find_wtxp_tab_id()
    if not tab_id:
        run_cmd(["openclaw", "browser", "--browser-profile", "chrome", "open", WTXP_URL], timeout=25)
        tab_id = find_wtxp_tab_id()
        if not tab_id:
            raise RuntimeError("WTXP tab not found after open")

    run_cmd(["openclaw", "browser", "--browser-profile", "chrome", "focus", tab_id], timeout=20)
    # 強制刷新一次，避免抓到停在舊畫面的數值
    run_cmd(["openclaw", "browser", "--browser-profile", "chrome", "navigate", WTXP_URL], timeout=30)
    time.sleep(1.8)
    out = run_cmd([
        "openclaw",
        "browser",
        "--browser-profile",
        "chrome",
        "evaluate",
        "--fn",
        "() => document.body.innerText",
    ], timeout=30)

    try:
        text = extract_json_block(out)
        if isinstance(text, str):
            return text
    except Exception:
        pass
    return out


def parse_wtxp_price(text: str) -> int:
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]

    # Preferred: date-time line, then next pure numeric price line.
    for i, ln in enumerate(lines):
        if re.match(r"^20\d{2}-\d{2}-\d{2}\s+\d{2}:\d{2}$", ln):
            for j in range(i + 1, min(i + 12, len(lines))):
                if re.match(r"^\d{4,6}(?:\.\d+)?$", lines[j]):
                    return int(round(float(lines[j].replace(",", ""))))

    # Fallback: after 登入免費用
    for i, ln in enumerate(lines):
        if "登入免費用" in ln:
            for j in range(i + 1, min(i + 12, len(lines))):
                if re.match(r"^\d{4,6}(?:\.\d+)?$", lines[j]):
                    return int(round(float(lines[j].replace(",", ""))))

    raise ValueError("WTXP price not found")


def load_last_twf() -> Optional[int]:
    try:
        if not CACHE_PATH.exists():
            return None
        data = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
        v = data.get("twf")
        if v is None:
            return None
        return int(v)
    except Exception:
        return None


def save_last_prices(btc: Optional[int], twf: Optional[int]) -> None:
    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    data = {}
    if CACHE_PATH.exists():
        try:
            data = json.loads(CACHE_PATH.read_text(encoding="utf-8"))
        except Exception:
            data = {}
    if btc is not None:
        data["btc"] = int(btc)
    if twf is not None:
        data["twf"] = int(twf)
    CACHE_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    btc = None
    twf = None

    try:
        btc = get_btc_int()
    except Exception:
        pass

    try:
        twf_text = get_wtxp_text()
        twf = parse_wtxp_price(twf_text)
    except Exception:
        twf = load_last_twf()

    save_last_prices(btc, twf)

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
