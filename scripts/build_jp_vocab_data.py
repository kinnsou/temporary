#!/usr/bin/env python3
"""Build jp-n3-data.json for jp-n3-review.html.

Source: memory/jp-vocab-history.json

Only entries with released=true are included in the public page data.
N4_BASE entries are treated as an already-seen foundation pool. N3_SEED entries
are released in daily batches by scripts/update_jp_n3_vocab_daily.py.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
HISTORY = REPO_ROOT / "memory" / "jp-vocab-history.json"
OUTPUT = REPO_ROOT / "jp-n3-data.json"
DIFFICULTY_OUTPUT = REPO_ROOT / "jp-n3-difficulty.json"


POS_ALLOWED = {"n", "suru", "v", "adj-i", "adj-na", "adv"}


def validate_record(word: str, rec: dict) -> None:
    required = ["reading", "meaning", "pos", "example", "translation", "tier"]
    missing = [k for k in required if not str(rec.get(k, "")).strip()]
    if missing:
        raise ValueError(f"{word}: missing {', '.join(missing)}")
    if rec["pos"] not in POS_ALLOWED:
        raise ValueError(f"{word}: unsupported pos {rec['pos']!r}")
    if word not in rec["example"]:
        raise ValueError(f"{word}: example must contain the word")


def main() -> None:
    history = json.loads(HISTORY.read_text(encoding="utf-8"))
    raw_words = history.get("words", {})
    words = []
    difficulty = []

    for word, rec in raw_words.items():
        validate_record(word, rec)
        difficulty.append(word)
        if not rec.get("released"):
            continue
        first_seen = str(rec.get("first_seen") or "").strip()
        if not first_seen:
            raise ValueError(f"{word}: released entry needs first_seen")
        tier = str(rec.get("tier") or "")
        level = "N3" if tier == "N3_SEED" else "N4"
        words.append({
            "word": word,
            "reading": rec["reading"],
            "meaning": rec["meaning"],
            "example": rec["example"],
            "translation": rec["translation"],
            "firstSeen": first_seen,
            "pos": rec["pos"],
            "level": level,
            "tier": "daily_n3" if tier == "N3_SEED" else "base_n4",
        })

    words.sort(key=lambda w: (w["firstSeen"], w["tier"], w["word"]), reverse=True)

    payload = {
        "meta": {
            "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "sourceCount": len(raw_words),
            "releasedCount": len(words),
            "classroom": "jp-n3",
            "dailyNewCount": 5,
            "notes": "N5 excluded; N4 is already-seen base; N3 releases in daily batches.",
        },
        "words": words,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    difficulty_payload = {
        "meta": {
            "updatedAt": payload["meta"]["updatedAt"],
            "classroom": "jp-n3",
            "perLevel": {"lv1Size": 15, "lvIncrement": 5},
        },
        "order": difficulty,
    }
    DIFFICULTY_OUTPUT.write_text(json.dumps(difficulty_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUTPUT.relative_to(REPO_ROOT)} ({len(words)}/{len(raw_words)} released)")
    print(f"wrote {DIFFICULTY_OUTPUT.relative_to(REPO_ROOT)} ({len(difficulty)} ordered)")


if __name__ == "__main__":
    main()
