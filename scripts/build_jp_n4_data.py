#!/usr/bin/env python3
"""Build jp-n4-data.json for jp-n4-review.html.

Source: memory/jp-n4-vocab-history.json

N4 uses level-based unlocks instead of daily word releases. The generated data
keeps question-ready fields close to the source contract so the app does not
need to infer Japanese grammar from display strings.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE = REPO_ROOT / "memory" / "jp-n4-vocab-history.json"
OUTPUT = REPO_ROOT / "jp-n4-data.json"
DIFFICULTY_OUTPUT = REPO_ROOT / "jp-n4-difficulty.json"


POS_ALLOWED = {"n", "suru", "v", "adj-i", "adj-na", "adv"}
PARTICLES = ["を", "が", "に", "と", "で", "は", "も", "へ", "から", "まで"]
GRAMMAR_CHOICES = {
    "suru_required": ["しなければなりません", "したことがあります", "してもいいです", "しなくてもいいです"],
    "experience": ["ことがあります", "ところです", "ようにします", "なければなりません"],
    "too_i": ["すぎます", "そうです", "くなります", "かったです"],
    "too_na": ["すぎます", "そうです", "になります", "でした"],
    "particle_topic": ["について", "までに", "ながら", "たことがある"],
    "adverb": ["は", "を", "に", "で"],
}


def validate_record(item: dict) -> None:
    ident = item.get("id") or item.get("kanji") or item.get("kana") or "(unknown)"
    required = ["id", "jlpt", "kind", "kana", "meaning_zh", "example_ja", "example_kana", "translation_zh", "rank"]
    missing = [key for key in required if not str(item.get(key, "")).strip()]
    if missing:
        raise ValueError(f"{ident}: missing {', '.join(missing)}")
    if item["jlpt"] != "N4":
        raise ValueError(f"{ident}: expected jlpt=N4, got {item['jlpt']!r}")
    if item.get("kind") != "vocab":
        raise ValueError(f"{ident}: expected kind=vocab")
    if item.get("pos", "n") not in POS_ALLOWED:
        raise ValueError(f"{ident}: unsupported pos {item.get('pos')!r}")
    if not isinstance(item.get("rank"), int):
        raise ValueError(f"{ident}: rank must be an integer")


def push_token(tokens: list[str], token: str) -> None:
    token = str(token or "").strip()
    if not token:
        return
    if re.fullmatch(r"[。、！？!?]+", token) and tokens:
        tokens[-1] += token
    else:
        tokens.append(token)


def split_japanese_chunks(sentence: str) -> list[str]:
    tokens: list[str] = []
    buf = ""
    suffixes = [
        "なければなりません",
        "ことがあります",
        "てもいいです",
        "なくてもいいです",
        "すぎます",
        "ました",
        "ません",
        "でした",
        "です",
        "ます",
        "ない",
    ]
    particle_set = set(PARTICLES)
    chars = list(str(sentence or "").replace(" ", ""))
    for idx, ch in enumerate(chars):
        next_ch = chars[idx + 1] if idx + 1 < len(chars) else ""
        if re.match(r"[。、！？!?]", ch):
            push_token(tokens, buf)
            buf = ""
            push_token(tokens, ch)
            continue
        buf += ch
        if any(buf.endswith(s) for s in suffixes):
            push_token(tokens, buf)
            buf = ""
            continue
        if ch in particle_set and len(buf) >= 2 and not (ch == "で" and next_ch in {"す", "し"}) and not (ch == "に" and next_ch == "は"):
            push_token(tokens, buf)
            buf = ""
    push_token(tokens, buf)
    return [token for token in tokens if token]


def split_around(text: str, answer: str) -> dict | None:
    idx = str(text).find(str(answer))
    if idx < 0:
        return None
    return {"before": text[:idx], "answer": answer, "after": text[idx + len(answer):]}


def detect_particle_question(sentence: str) -> dict | None:
    chars = list(str(sentence or ""))
    best: tuple[int, str, int] | None = None
    for i, ch in enumerate(chars):
        if ch not in PARTICLES:
            continue
        prev = chars[i - 1] if i > 0 else ""
        nxt = chars[i + 1] if i + 1 < len(chars) else ""
        if not prev or not nxt or re.match(r"[。、！？!?\s]", prev + nxt):
            continue
        score = 1
        if ch in {"を", "が", "に", "で", "は"}:
            score += 2
        if re.search(r"[\u4e00-\u9fff々ぁ-んァ-ン]", prev + nxt):
            score += 1
        if best is None or score > best[0]:
            best = (score, ch, i)
    if best is None:
        return None
    _, particle, idx = best
    choices = [particle] + [p for p in PARTICLES if p != particle][:3]
    return {
        "kind": "particle",
        "before": "".join(chars[:idx]),
        "answer": particle,
        "after": "".join(chars[idx + 1:]),
        "choices": choices,
        "explanation": f"這裡用「{particle}」讓句子自然連接。",
    }


def grammar_for_item(item: dict) -> dict:
    if isinstance(item.get("grammar"), dict) and item["grammar"].get("answer"):
        return item["grammar"]

    word = item.get("kanji") or item["kana"]
    meaning = item["meaning_zh"]
    pos = item.get("pos", "n")
    sentence = item["example_ja"]

    if pos == "suru":
        answer = "しなければなりません"
        text = f"明日までに{word}{answer}。"
        return {
            "kind": "suru_required",
            "prompt_zh": f"「{meaning}」這件事是必須做的，選出正確句型。",
            **split_around(text, answer),
            "choices": GRAMMAR_CHOICES["suru_required"],
            "explanation": "「〜なければなりません」表示必須做某事。",
        }
    if pos == "v":
        answer = "ことがあります"
        text = f"私はこの仕事で{word}{answer}。"
        return {
            "kind": "experience",
            "prompt_zh": f"表達「曾經／有時會{meaning}」時，選出正確句型。",
            **split_around(text, answer),
            "choices": GRAMMAR_CHOICES["experience"],
            "explanation": "「動詞辭書形＋ことがあります」表示曾經有過這種經驗。",
        }
    if pos == "adj-i":
        stem = word[:-1] if word.endswith("い") else word
        answer = "すぎます"
        text = f"この料理は{stem}{answer}。"
        return {
            "kind": "too_i",
            "prompt_zh": f"表達「太{meaning}」時，選出正確形式。",
            **split_around(text, answer),
            "choices": GRAMMAR_CHOICES["too_i"],
            "explanation": "い形容詞去掉「い」＋すぎます，表示太過於某種狀態。",
        }
    if pos == "adj-na":
        answer = "すぎます"
        text = f"この説明は{word}{answer}。"
        return {
            "kind": "too_na",
            "prompt_zh": f"表達「太{meaning}」時，選出正確形式。",
            **split_around(text, answer),
            "choices": GRAMMAR_CHOICES["too_na"],
            "explanation": "な形容詞直接接「すぎます」，表示太過於某種狀態。",
        }
    if pos == "adv":
        particle = detect_particle_question(sentence)
        if particle:
            return particle | {
                "prompt_zh": f"看例句選出最自然的助詞。",
            }

    answer = "について"
    text = f"先生は{word}{answer}説明しました。"
    return {
        "kind": "particle_topic",
        "prompt_zh": f"表達「關於{meaning}」時，選出正確句型。",
        **split_around(text, answer),
        "choices": GRAMMAR_CHOICES["particle_topic"],
        "explanation": "「〜について」表示關於某個主題。",
    }


def normalize_item(item: dict) -> dict:
    validate_record(item)
    word = str(item.get("kanji") or item["kana"]).strip()
    kana = str(item["kana"]).strip()
    sentence = str(item["example_ja"]).strip()
    grammar = grammar_for_item(item)
    chunks = item.get("chunks") if isinstance(item.get("chunks"), list) else split_japanese_chunks(sentence)
    particles = item.get("particles") if isinstance(item.get("particles"), list) else []
    if not particles:
        particle = detect_particle_question(sentence)
        if particle:
            particles = [particle]
    choices = list(dict.fromkeys(str(x) for x in grammar.get("choices", []) if str(x).strip()))
    if grammar.get("answer") and grammar["answer"] not in choices:
        choices.insert(0, grammar["answer"])
    if len(choices) < 4:
        for choice in ["は", "が", "を", "に", "ことがあります", "しなければなりません", "すぎます"]:
            if choice != grammar.get("answer") and choice not in choices:
                choices.append(choice)
            if len(choices) >= 4:
                break
    grammar["choices"] = choices[:4]
    grammar["hintChunks"] = split_japanese_chunks(f"{grammar.get('before', '')}{grammar.get('answer', '')}{grammar.get('after', '')}")[:3]

    return {
        "id": item["id"],
        "jlpt": "N4",
        "kind": "vocab",
        "word": word,
        "kana": kana,
        "reading": kana,
        "kanji": str(item.get("kanji") or "").strip(),
        "meaning": item["meaning_zh"],
        "meaning_zh": item["meaning_zh"],
        "pos": item.get("pos", "n"),
        "level": "N4",
        "tier": "n4_level_path",
        "firstSeen": item.get("firstSeen") or item.get("first_seen") or "2026-06-04",
        "rank": item["rank"],
        "example": sentence,
        "example_ja": sentence,
        "example_kana": item["example_kana"],
        "translation": item["translation_zh"],
        "translation_zh": item["translation_zh"],
        "audioText": item.get("audioText") or sentence,
        "particles": particles,
        "grammar": grammar,
        "chunks": chunks,
        "distractors": item.get("distractors", []),
    }


def main() -> None:
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    raw_items = source.get("items")
    if not isinstance(raw_items, list):
        raise ValueError("memory/jp-n4-vocab-history.json must contain an items array")

    words = [normalize_item(item) for item in raw_items if item.get("released", True)]
    words.sort(key=lambda w: (w["rank"], w["word"]))
    now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    payload = {
        "meta": {
            "updatedAt": now,
            "sourceCount": len(raw_items),
            "releasedCount": len(words),
            "classroom": "jp-n4",
            "jlpt": "N4",
            "levelUnlock": {"initial": 5, "increment": 5},
            "notes": "N5 assumed known; N4 words unlock by player level, five per level.",
        },
        "words": words,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    difficulty_payload = {
        "meta": {
            "updatedAt": now,
            "classroom": "jp-n4",
            "jlpt": "N4",
            "perLevel": {"lv1Size": 5, "lvIncrement": 5},
        },
        "order": [w["word"] for w in words],
    }
    DIFFICULTY_OUTPUT.write_text(json.dumps(difficulty_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUTPUT.relative_to(REPO_ROOT)} ({len(words)}/{len(raw_items)} released)")
    print(f"wrote {DIFFICULTY_OUTPUT.relative_to(REPO_ROOT)} ({len(words)} ordered)")


if __name__ == "__main__":
    main()
