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
ORDER_PARTICLES = {"を", "が", "に", "と", "で", "は", "も", "へ"}
GRAMMAR_CHOICES = {
    "suru_required": ["しなければなりません", "したことがあります", "してもいいです", "しなくてもいいです"],
    "experience": ["ことがあります", "ところです", "ようにします", "なければなりません"],
    "too_i": ["すぎます", "そうです", "くなります", "かったです"],
    "too_na": ["すぎます", "そうです", "になります", "でした"],
    "particle_topic": ["について", "までに", "ながら", "たことがある"],
    "adverb": ["は", "を", "に", "で"],
}
N4_GRAMMAR_PATTERNS = [
    ("なければなりません", ["なければなりません", "てもいいです", "ことがあります", "すぎます"], "「〜なければなりません」表示必須做某事。"),
    ("ことがあります", ["ことがあります", "ところです", "ようにします", "なければなりません"], "「〜ことがあります」表示曾經有過這種經驗。"),
    ("てもいいです", ["てもいいです", "なければなりません", "ことがあります", "すぎます"], "「〜てもいいです」表示可以做某事。"),
    ("なくてもいいです", ["なくてもいいです", "なければなりません", "てもいいです", "ことがあります"], "「〜なくてもいいです」表示不做也可以。"),
    ("すぎます", ["すぎます", "そうです", "くなります", "でした"], "「〜すぎます」表示太過於某種狀態。"),
    ("ように", ["ように", "ことが", "ためで", "ながら"], "「〜ように」表示為了達成某個目的。"),
    ("てしまいました", ["てしまいました", "てもいいです", "てあります", "てください"], "「〜てしまいました」常表示事情已經發生，帶有遺憾或完成感。"),
    ("までに", ["までに", "から", "より", "ながら"], "「〜までに」表示在某個期限之前。"),
    ("以内に", ["以内に", "以上に", "以外に", "以下に"], "「〜以内に」表示在範圍或期限之內。"),
]
SYNONYM_OVERRIDES = {
    "たいへん": {"answer": "とても", "choices": ["とても", "少し", "全然", "多分"], "explanation": "「大変」可表示程度很高，接近「とても」。"},
    "ひつよう": {"answer": "いります", "choices": ["いります", "なくします", "遅れます", "壊れます"], "explanation": "「必要」表示需要某物或某事。"},
    "べんり": {"answer": "役に立ちます", "choices": ["役に立ちます", "困ります", "遅れます", "反対します"], "explanation": "「便利」表示好用、派得上用場。"},
    "まにあう": {"answer": "遅れません", "choices": ["遅れません", "忘れます", "壊れます", "捨てます"], "explanation": "「間に合う」表示沒有遲到，趕得上。"},
    "てつだう": {"answer": "助けます", "choices": ["助けます", "借ります", "忘れます", "決めます"], "explanation": "「手伝う」就是幫忙做某件事。"},
    "かんたん": {"answer": "やさしい", "choices": ["やさしい", "難しい", "危ない", "寂しい"], "explanation": "「簡単」表示不難，接近「やさしい」。"},
    "じゆう": {"answer": "好きなようにできます", "choices": ["好きなようにできます", "急にします", "全部だめです", "心配します"], "explanation": "「自由」表示可以照自己的意思做。"},
    "むり": {"answer": "できません", "choices": ["できません", "足ります", "直ります", "慣れます"], "explanation": "「無理」表示做不到或勉強。"},
    "きゅう": {"answer": "突然", "choices": ["突然", "普通", "十分", "丁寧"], "explanation": "「急」常表示突然或緊急。"},
    "じゅうぶん": {"answer": "足ります", "choices": ["足ります", "足りません", "壊れます", "遅れます"], "explanation": "「十分」表示數量或程度已經夠了。"},
    "ふつう": {"answer": "いつも通り", "choices": ["いつも通り", "特別", "急に", "全然"], "explanation": "「普通」表示一般、和平常差不多。"},
    "いがい": {"answer": "ほか", "choices": ["ほか", "全部", "前", "中"], "explanation": "「以外」表示某個範圍之外的其他部分。"},
    "いじょう": {"answer": "それより多い", "choices": ["それより多い", "それより少ない", "その外", "その前"], "explanation": "「以上」表示包含基準在內，或比基準更多。"},
    "いか": {"answer": "それより少ない", "choices": ["それより少ない", "それより多い", "その外", "その後"], "explanation": "「以下」表示包含基準在內，或比基準更少。"},
    "いない": {"answer": "その範囲の中", "choices": ["その範囲の中", "その範囲の外", "急な予定", "別の理由"], "explanation": "「以内」表示在時間、數量或範圍裡面。"},
    "なおす": {"answer": "修理します", "choices": ["修理します", "捨てます", "忘れます", "借ります"], "explanation": "「直す」表示修理或改正。"},
    "こしょう": {"answer": "壊れています", "choices": ["壊れています", "安心です", "十分です", "普通です"], "explanation": "「故障」表示機器等壞掉。"},
    "しゅうり": {"answer": "直します", "choices": ["直します", "捨てます", "忘れます", "集めます"], "explanation": "「修理」表示把壞掉的東西修好。"},
    "あんしん": {"answer": "心配しません", "choices": ["心配しません", "反対します", "遅れます", "壊れます"], "explanation": "「安心」表示不擔心、放心。"},
    "しんぱい": {"answer": "不安です", "choices": ["不安です", "安全です", "自由です", "簡単です"], "explanation": "「心配」表示擔心、不安。"},
    "あんぜん": {"answer": "危なくない", "choices": ["危なくない", "便利ではない", "足りない", "普通ではない"], "explanation": "「安全」表示沒有危險。"},
    "ふべん": {"answer": "便利ではない", "choices": ["便利ではない", "危なくない", "十分ある", "急にする"], "explanation": "「不便」表示不好用、不方便。"},
    "たいせつ": {"answer": "重要", "choices": ["重要", "普通", "急", "無理"], "explanation": "「大切」表示重要、需要珍惜。"},
    "ぜんぜん": {"answer": "まったく", "choices": ["まったく", "たぶん", "だいたい", "ぜひ"], "explanation": "「全然」接否定時接近「まったく」。"},
    "たぶん": {"answer": "おそらく", "choices": ["おそらく", "決して", "直接", "十分"], "explanation": "「多分」表示大概、可能。"},
    "きゅうに": {"answer": "突然", "choices": ["突然", "普通に", "丁寧に", "安全に"], "explanation": "「急に」表示突然發生。"},
}


def validate_example_variety(items: list[dict]) -> None:
    """Reject copy-pasted example templates that make the classroom repetitive."""
    skeletons: dict[str, list[str]] = {}
    for item in items:
        sentence = str(item.get("example_ja", "")).strip()
        term = str(item.get("kanji") or item.get("kana") or "").strip()
        if not sentence or not term or term not in sentence:
            continue
        skeleton = sentence.replace(term, "{word}")
        skeletons.setdefault(skeleton, []).append(str(item.get("id") or term))

    repeated = {skeleton: ids for skeleton, ids in skeletons.items() if len(ids) > 2}
    if repeated:
        details = "; ".join(f"{skeleton}: {', '.join(ids)}" for skeleton, ids in repeated.items())
        raise ValueError(f"example template used more than twice: {details}")


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
        prev_ch = chars[idx - 1] if idx > 0 else ""
        prev2 = "".join(chars[max(0, idx - 2):idx + 1])
        if (
            ch in ORDER_PARTICLES
            and not (ch == "で" and next_ch in {"す", "し"})
            and not (ch == "で" and "".join(chars[idx:idx + 4]) == "でもいい")
            and not (ch == "に" and prev_ch == "間" and next_ch == "合")
            and not (ch == "と" and "".join(chars[idx:idx + 3]) == "とても")
            and not (ch == "と" and prev_ch == "こ")
            and not (ch == "と" and prev_ch == "ほ" and next_ch == "ん")
            and not (ch == "も" and prev2 == "とても")
            and not (ch == "も" and next_ch == "し" and not prev_ch)
        ):
            content = buf[:-1]
            push_token(tokens, content)
            push_token(tokens, ch)
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
        if ch == "で" and nxt in {"す", "し"}:
            continue
        if ch == "で" and "".join(chars[i:i + 4]) == "でもいい":
            continue
        if ch == "に" and prev == "間" and nxt == "合":
            continue
        if ch == "と" and "".join(chars[i:i + 3]) == "とても":
            continue
        if ch == "と" and prev == "こ":
            continue
        if ch == "と" and prev == "ほ" and nxt == "ん":
            continue
        if ch == "も" and nxt == "し" and not prev:
            continue
        if ch == "も" and "".join(chars[max(0, i - 2):i + 1]) == "とても":
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

    sentence = item["example_ja"]
    for answer, choices, explanation in N4_GRAMMAR_PATTERNS:
        split = split_around(sentence, answer)
        if split:
            return {
                "kind": "grammar_from_example",
                "prompt_zh": "從同一句例句中選出最自然的文法形式。",
                **split,
                "choices": choices,
                "explanation": explanation,
            }

    particle = detect_particle_question(sentence)
    if particle:
        return particle | {
            "prompt_zh": "看例句選出最自然的助詞。",
        }

    return {}


def synonym_for_item(item: dict) -> list[dict]:
    raw = item.get("synonyms")
    if isinstance(raw, list):
        return [x for x in raw if isinstance(x, dict) and x.get("answer")]
    spec = SYNONYM_OVERRIDES.get(item.get("kana", ""))
    if not spec:
        return []
    source = item.get("kanji") or item["kana"]
    return [{
        "source": source,
        "prompt_zh": f"選出和「{source}」意思最接近的說法。",
        "answer": spec["answer"],
        "choices": spec["choices"],
        "explanation": spec["explanation"],
    }]


def normalize_item(item: dict) -> dict:
    validate_record(item)
    word = str(item.get("kanji") or item["kana"]).strip()
    kana = str(item["kana"]).strip()
    sentence = str(item["example_ja"]).strip()
    grammar = grammar_for_item(item)
    chunks = item.get("chunks") if isinstance(item.get("chunks"), list) else [sentence]
    chunks = [token for chunk in chunks for token in split_japanese_chunks(str(chunk))]
    particles = item.get("particles") if isinstance(item.get("particles"), list) else []
    if not particles:
        particle = detect_particle_question(sentence)
        if particle:
            particles = [particle]
    if grammar.get("answer"):
        choices = list(dict.fromkeys(str(x) for x in grammar.get("choices", []) if str(x).strip()))
        if grammar["answer"] not in choices:
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
        "synonyms": synonym_for_item(item),
    }


def main() -> None:
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    raw_items = source.get("items")
    if not isinstance(raw_items, list):
        raise ValueError("memory/jp-n4-vocab-history.json must contain an items array")

    validate_example_variety(raw_items)
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
            "levelUnlock": {"initial": 15, "increment": 5},
            "notes": "N5 assumed known; N4 words unlock by player level, fifteen at LV1 and five more per level.",
        },
        "words": words,
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    difficulty_payload = {
        "meta": {
            "updatedAt": now,
            "classroom": "jp-n4",
            "jlpt": "N4",
            "perLevel": {"lv1Size": 15, "lvIncrement": 5},
        },
        "order": [w["word"] for w in words],
    }
    DIFFICULTY_OUTPUT.write_text(json.dumps(difficulty_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUTPUT.relative_to(REPO_ROOT)} ({len(words)}/{len(raw_items)} released)")
    print(f"wrote {DIFFICULTY_OUTPUT.relative_to(REPO_ROOT)} ({len(words)} ordered)")


if __name__ == "__main__":
    main()
