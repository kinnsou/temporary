---
name: line-vocab-maximizer
description: Design, refine, or operate the daughter's LINE daily English vocab task. Use when creating or updating the 3-new + 2-review vocab format, enforcing non-repeating new words, limiting scope to Taiwan junior-high core 1000 words, turning review items into guided cloze grammar prompts, or syncing cron/task behavior with the shared vocab history files.
---

# Line Vocab Maximizer

Use this skill for the daughter's daily LINE vocab workflow.

## Core workflow

1. Read these files first when changing task logic or diagnosing repeats:
   - `/home/kurohime/.openclaw/workspace/memory/vocab-history.json`
   - `/home/kurohime/.openclaw/workspace/memory/daily-tasks.json`
   - `/home/kurohime/.openclaw/workspace/daughter-vocab.md`
2. If the work touches the scheduled task, also read `/home/kurohime/.openclaw/cron/jobs.json` and inspect the `每日英文單字（晚上7點）` payload.
3. Keep new words and review words separate:
   - **3 new words**: must be unseen in `vocab-history.json`
   - **2 review words**: may repeat, but should come from previously taught words with usable example sentences
4. Update both behavior and storage together. Do not change the prompt without updating the history model if the rule depends on it.

## Required teaching rules

- New-word scope: **Taiwan junior-high core 1000 words** level
- Chinese wording should prefer **Taiwan school usage + Traditional Chinese**; avoid Mainland phrasing, Simplified-Chinese sources, and awkward direct-translation wording
- If a Chinese gloss sounds unnatural in Taiwan (for example `早地`), rewrite it into natural Taiwan classroom wording before sending
- New words: **never repeat** until the pool is exhausted
- Review questions: **guided fill-in**, not “Do you remember this word?”
- Grammar teaching focus: **verb positioning first**
- `🔍 句型觀察` must be written fresh from that day's actual review sentence, not copied from the prompt examples
- `🔍 句型觀察` should explicitly point out the real verb / be-verb / tense or object position in that sentence, using child-friendly Chinese
- When the blank answer is **not a verb** (for example an adjective or noun), `🔍 句型觀察` should also name the tested word's part of speech in plain Chinese, and separately point out the sentence's real verb and tense
- Avoid abstract grammar labels like `S+V`, `S+V+O`, `S+V+C` in child-facing output
- Use simple Chinese hints such as:
  - `（發現）這裡要用過去式，發現了。`
  - `（優秀）放在 be 動詞後面，拿來形容 English。`
- Do **not** reveal the tested English answer directly under the question unless the user explicitly asks for an answer key version

## Output shape

Read `references/output-format.md` before drafting final copy.

Default child-facing structure:
- `📚 今日單字`
- 3 new words, each with:
  - word
  - pronunciation line using emoji only (`🎙️` / `🎤` / `🔊`)
  - meaning line using emoji only (`🏷️`)
  - example sentence
  - Chinese translation
- `🧠 複習挑戰`
- 2 review prompts, each with:
  - English cloze sentence
  - Chinese meaning
  - `🔍 句型觀察` in plain Chinese

## When changing automation

Read `references/data-sources.md` before editing cron prompts or storage.

When the user asks to improve the scheduled LINE vocab task:
- update the cron prompt in `/home/kurohime/.openclaw/cron/jobs.json`
- keep LINE output as **one single message**
- keep `vocab-history.json` as the hard source for uniqueness
- preserve `daughter-vocab.md` as the readable teaching log
- preserve `daily-tasks.json` as the daily send ledger

## When LINE delivery fails

Read `references/delivery-troubleshooting.md` when:
- cron runs show `status: "ok"` but messages never arrive in LINE group
- agent says "message 工具在這個 runtime 不可用"
- `deliveryStatus` is consistently `"not-delivered"`

Key facts:
- **`delivery.mode: "none"` + isolated session = broken** — the `message` tool is not available in isolated cron sessions
- **`delivery.mode: "announce"` is the correct mode** — cron system handles LINE push, agent just outputs the message text
- **`channels.line.allowFrom: ["*"]` is required** when `dmPolicy: "open"`
