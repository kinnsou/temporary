#!/usr/bin/env python3
"""Generate the daily vocab message via Gemini CLI.

Default output: JSON with the selected words plus the drafted message.
Use --text to print only the final child-facing message.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

WORKSPACE = Path("/home/kurohime/.openclaw/workspace")
PICKER = WORKSPACE / "scripts" / "vocab_picker.py"


def run_picker() -> dict:
    proc = subprocess.run(
        ["python3", str(PICKER)],
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(proc.stdout)


def build_prompt(selection: dict) -> str:
    new_words = selection["new_words"]
    review_words = selection["review_words"]
    review_block = "\n".join(
        f"- {item['word']} | example: {item['example_sentence']} | 中文：{item['translation']}"
        for item in review_words
    )
    return f"""你現在要產生一則給台灣孩子看的英文單字訊息，直接輸出最終正文，不要前言、後記、解釋、markdown code block。

硬規則：
1. 新字只能用這 3 個，禁止替換或增刪：{', '.join(new_words)}
2. 複習字只能用這 2 個，且例句必須以這些資料為準：
{review_block}
3. 用繁體中文，優先台灣老師會用的自然說法，避免中國大陸用語、直譯腔。
4. 格式必須是：

📚 今日單字

1. word
🎙️：中文同音輔助＋重音提示；KK [...]
🏷️：中文意思
例句：英文例句
（中文翻譯）

2. ...

3. ...

🧠 複習挑戰

1. 把第一個複習例句改成填空題
中文句意
🔍 句型觀察：要像老師一樣用白話中文指出真正動詞 / be動詞 / 時態 / 詞性位置，但不能直接寫出答案英文單字

2. 把第二個複習例句改成填空題
中文句意
🔍 句型觀察：同上，而且兩題教法盡量不要重複

5. 新字區只能用 emoji 標示，不要寫「發音」或「意思」。
6. 複習題下方不可直接公布英文答案。
7. 如果中文詞義可能不自然，要改成台灣常用教學說法。
8. 發音要有中文同音輔助，並標示重音在第幾音節；KK 只能附註，不能只有 KK。
9. 內容要精簡、清楚、像真的會發到 LINE 的一則訊息。

請直接輸出最終正文。"""


def strip_code_fence(text: str) -> str:
    text = text.strip()
    if text.startswith("```") and text.endswith("```"):
        lines = text.splitlines()
        if len(lines) >= 3:
            return "\n".join(lines[1:-1]).strip()
    return text


def run_gemini(prompt: str, model: str | None) -> tuple[str, dict]:
    cmd = ["gemini"]
    if model:
        cmd += ["-m", model]
    cmd += ["-o", "json", "-p", prompt]
    proc = subprocess.run(cmd, capture_output=True, text=True, check=True)
    outer = json.loads(proc.stdout)
    response = strip_code_fence(outer.get("response", ""))
    stats = outer.get("stats", {})
    return response, stats


def validate_message(message: str, selection: dict) -> None:
    if "📚 今日單字" not in message or "🧠 複習挑戰" not in message:
        raise ValueError("Gemini output missing required sections")

    lowered = message.lower()
    missing_new = [word for word in selection["new_words"] if word.lower() not in lowered]
    if missing_new:
        raise ValueError(f"Gemini output missing new words: {', '.join(missing_new)}")

    missing_review_context = []
    for item in selection["review_words"]:
        if item["translation"] and item["translation"] not in message:
            missing_review_context.append(item["word"])
    if missing_review_context:
        raise ValueError(
            "Gemini output missing review sentence translations for: "
            + ", ".join(missing_review_context)
        )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", help="Gemini model override")
    parser.add_argument("--text", action="store_true", help="Print only the drafted message")
    args = parser.parse_args()

    selection = run_picker()
    message, stats = run_gemini(build_prompt(selection), args.model)
    validate_message(message, selection)

    if args.text:
        print(message)
        return 0

    output = {
        "message": message,
        "selection": selection,
        "stats": stats,
    }
    print(json.dumps(output, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
