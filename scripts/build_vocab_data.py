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
import re
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
HISTORY = REPO_ROOT / "memory" / "vocab-history.json"
OUTPUT = REPO_ROOT / "vocab-data.json"


_POS_MAP = {
    "n": "n",
    "noun": "n",
    "v": "v",
    "verb": "v",
    "adj": "adj",
    "adjective": "adj",
    "adv": "adv",
    "adverb": "adv",
    "prep": "prep",
    "preposition": "prep",
    "pron": "pron",
    "pronoun": "pron",
    "conj": "conj",
    "conjunction": "conj",
    "interj": "interj",
    "interjection": "interj",
    "det": "det",
    "determiner": "det",
    "num": "num",
    "number": "num",
}


def normalize_pos(pos: str | None) -> str:
    if not pos:
        return ""
    key = str(pos).strip().lower().rstrip(".")
    return _POS_MAP.get(key, "")


def infer_pos(word: str, example: str, meaning_zh: str) -> str:
    """Best-effort POS inference. This is only a starter; Mark may later add explicit pos in vocab-history."""
    w = word.strip().lower()
    ex = example.strip().lower()
    zh = (meaning_zh or "").strip()

    # quick lexical heuristics
    if w.endswith("ly"):
        return "adv"
    if w in {"red", "yellow", "blue", "green", "black", "white", "pink", "brown", "gray", "grey", "purple", "orange"}:
        return "adj"

    # If sentence starts with the word and immediately uses a be-verb, it's almost certainly a noun/adjective subject.
    # Example: "Spring is my favorite season." → noun
    if re.match(rf"^{re.escape(w)}\s+(is|are|was|were)\b", ex):
        return "n"

    # score-based pattern match
    score = {"n": 0, "v": 0, "adj": 0, "adv": 0}

    # English example patterns
    if re.match(rf"^(please\s+)?{re.escape(w)}\b", ex):
        score["v"] += 3
    if re.match(rf"^(i|you|we|they)\s+{re.escape(w)}\b", ex):
        score["v"] += 3
    if re.search(rf"\bto\s+{re.escape(w)}\b", ex):
        score["v"] += 2
    if re.search(rf"\b(am|is|are|was|were|become|seem|feel|look)\s+{re.escape(w)}\b", ex):
        score["adj"] += 3
    if re.search(rf"\b(a|an|the)\s+{re.escape(w)}\b", ex):
        score["n"] += 3
    if re.search(rf"\b(my|your|his|her|our|their)\s+{re.escape(w)}\b", ex):
        score["n"] += 2

    # Chinese meaning hints (very rough)
    if "地" in zh and "的" not in zh:
        score["adv"] += 1
    if "的" in zh:
        score["adj"] += 1

    best = max(score.items(), key=lambda kv: kv[1])
    if best[1] <= 0:
        return "n"  # default (more forgiving for kids)
    return best[0]


def normalize_pos_list(pos) -> list[str]:
    """Accept string or list; return de-duplicated normalized POS list."""
    if not pos:
        return []
    items: list[str] = []
    if isinstance(pos, list):
        items = [str(x) for x in pos]
    else:
        s = str(pos)
        # split on common separators
        items = re.split(r"[\s,;/；|]+", s)
    out: list[str] = []
    for it in items:
        n = normalize_pos(it)
        if n and n not in out:
            out.append(n)
    return out


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

        pos_list = normalize_pos_list(rec.get("pos") or rec.get("part_of_speech"))
        if not pos_list:
            pos_list = [infer_pos(word, example, meaning)]

        words.append({
            "word": word,
            "meaning": meaning,
            "example": example,
            "translation": translation,
            "firstSeen": first_seen,
            "pos": pos_list,
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
