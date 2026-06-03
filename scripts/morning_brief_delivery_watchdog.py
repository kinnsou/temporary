#!/usr/bin/env python3
"""Watchdog for the daily market brief LINE delivery.

The OpenClaw cron runner can mark a run as ok even when the agent produced
NO_REPLY and no delivery happened. This script checks the actual run history
and sends today's market brief link only when the primary cron did not deliver.
"""
from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path("/home/kurohime/.openclaw/workspace")
DAILY_TASKS = ROOT / "memory" / "daily-tasks.json"
JOB_ID = "5c323b89-fee4-480f-b8d5-3f6c534603d5"
LINE_GROUP = "Cc9f7c8b78a93ec933f692d584f4149bf"
TPE = ZoneInfo("Asia/Taipei")


def run_json(cmd: list[str]) -> dict:
    proc = subprocess.run(cmd, cwd=ROOT, text=True, capture_output=True, check=False)
    if proc.returncode != 0:
        raise RuntimeError((proc.stderr or proc.stdout or "command failed").strip())
    text = proc.stdout.strip()
    start = text.find("{")
    if start < 0:
        raise RuntimeError(f"no JSON object in output from {' '.join(cmd)}")
    return json.loads(text[start:])


def load_tasks() -> dict:
    if not DAILY_TASKS.exists():
        return {}
    return json.loads(DAILY_TASKS.read_text(encoding="utf-8"))


def save_tasks(data: dict) -> None:
    DAILY_TASKS.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def update_status(date: str, **fields: object) -> None:
    data = load_tasks()
    day = data.setdefault(date, {})
    news = day.setdefault("morning_news", {})
    news.update(fields)
    save_tasks(data)


def already_marked_sent(date: str) -> bool:
    news = load_tasks().get(date, {}).get("morning_news", {})
    status = str(news.get("send_status") or "")
    sent_at = str(news.get("sent_at") or "")
    return status in {
        "sent_manual_makeup",
        "sent_by_watchdog",
        "delivered_by_cron_observed",
    } and sent_at.startswith(date)


def primary_delivered(date: str) -> bool:
    payload = run_json(["openclaw", "cron", "runs", "--id", JOB_ID, "--limit", "8"])
    for entry in payload.get("entries", []):
        ts = entry.get("runAtMs") or entry.get("ts")
        if not ts:
            continue
        run_date = datetime.fromtimestamp(ts / 1000, TPE).date().isoformat()
        if run_date != date:
            continue
        if entry.get("delivered") is True or entry.get("deliveryStatus") == "delivered":
            return True
    return False


def send_line(url: str) -> None:
    run_json([
        "openclaw",
        "message",
        "send",
        "--channel",
        "line",
        "--target",
        LINE_GROUP,
        "--message",
        url,
        "--json",
    ])


def main() -> int:
    today = datetime.now(TPE).date().isoformat()
    url = f"https://kinnsou.github.io/temporary/market-briefs/market-brief-{today}.html"
    page = ROOT / "market-briefs" / f"market-brief-{today}.html"

    if already_marked_sent(today):
        print("NO_REPLY")
        return 0

    if primary_delivered(today):
        update_status(
            today,
            send_status="delivered_by_cron_observed",
            send_error=None,
            sent_at=datetime.now(timezone.utc).isoformat(),
        )
        print("NO_REPLY")
        return 0

    if not page.exists():
        update_status(
            today,
            send_status="watchdog_failed_missing_page",
            send_error=f"missing {page}",
            checked_at=datetime.now(timezone.utc).isoformat(),
        )
        print(f"MORNING_BRIEF_DELIVERY_WATCHDOG_FAILED: missing {page}", file=sys.stderr)
        return 1

    send_line(url)
    update_status(
        today,
        send_status="sent_by_watchdog",
        send_error=None,
        sent_at=datetime.now(timezone.utc).isoformat(),
    )
    print("NO_REPLY")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
