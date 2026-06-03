#!/usr/bin/env python3
"""Release the next 5 N3 words for CLAW JP N3 and rebuild page data."""

from __future__ import annotations

import json
import subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
HISTORY = REPO_ROOT / "memory" / "jp-vocab-history.json"
BUILD = REPO_ROOT / "scripts" / "build_jp_vocab_data.py"


def taipei_date_key() -> str:
    return (datetime.now(timezone.utc) + timedelta(hours=8)).strftime("%Y-%m-%d")


def main() -> None:
    today = taipei_date_key()
    history = json.loads(HISTORY.read_text(encoding="utf-8"))
    words = history.get("words", {})

    todays = [
        word for word, rec in words.items()
        if rec.get("tier") == "N3_SEED" and rec.get("released") and rec.get("first_seen") == today
    ]
    if len(todays) >= 5:
        print(f"today already has {len(todays)} released N3 words: {', '.join(todays[:5])}")
        subprocess.run([str(BUILD)], cwd=REPO_ROOT, check=True)
        return

    need = 5 - len(todays)
    released = []
    for word, rec in words.items():
        if need <= 0:
            break
        if rec.get("tier") != "N3_SEED" or rec.get("released"):
            continue
        rec["released"] = True
        rec["first_seen"] = today
        released.append(word)
        need -= 1

    history.setdefault("meta", {})["updatedAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    HISTORY.write_text(json.dumps(history, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"released {len(released)} N3 words for {today}: {', '.join(released)}")
    subprocess.run([str(BUILD)], cwd=REPO_ROOT, check=True)


if __name__ == "__main__":
    main()
