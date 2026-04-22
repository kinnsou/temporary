#!/usr/bin/env python3
"""Build vocab-data.json for vocab-review.html.

Reads memory/vocab-history.json and writes vocab-data.json at the repo root.

Output schema:
{
  "meta": { "updatedAt": ISO8601, "sourceCount": int, "includedCount": int },
  "words": [
    { "word": str, "meaning": str, "example": str, "translation": str, "firstSeen": str },
    ...
  ]
}

Rules:
- Sort by firstSeen descending (newest first).
- Drop entries missing example_sentence or translation.
- Join multiple meanings with "；".
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
HISTORY = REPO_ROOT / "memory" / "vocab-history.json"
OUTPUT = REPO_ROOT / "vocab-data.json"


def main() -> None:
    history = json.loads(HISTORY.read_text(encoding="utf-8"))
    raw_words: dict = history.get("words", {})

    words = []
    for word, rec in raw_words.items():
        example = (rec.get("example_sentence") or "").strip()
        translation = (rec.get("translation") or "").strip()
        meanings = rec.get("meanings") or []
        if not example or not translation or not meanings:
            continue
        meaning = "；".join(m.strip() for m in meanings if m and m.strip())
        if not meaning:
            continue
        first_seen = rec.get("first_seen") or ""
        words.append({
            "word": word,
            "meaning": meaning,
            "example": example,
            "translation": translation,
            "firstSeen": first_seen,
        })

    words.sort(key=lambda w: w["firstSeen"], reverse=True)

    payload = {
        "meta": {
            "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "sourceCount": len(raw_words),
            "includedCount": len(words),
        },
        "words": words,
    }

    OUTPUT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {OUTPUT.relative_to(REPO_ROOT)}  ({len(words)}/{len(raw_words)} words)")


if __name__ == "__main__":
    main()
