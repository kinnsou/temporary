---
name: japanese-n4-classroom
description: "Build, maintain, or redesign Mark's standalone Japanese N4 classroom app, quiz types, data pipeline, Firebase namespace, daily release flow, and separation from the English vocab app or JP N3 classroom."
---

# Japanese N4 Classroom

Use for the standalone 日文 N4 小教室. The goal is to reuse the proven classroom/game mold while keeping N4 content, data, storage, cron, and app files separate from the English app.

## Hard Rules

- Do not edit English app files for N4 work unless Mark explicitly asks:
  - `vocab-review.html`
  - `memory/vocab-history.json`
  - `vocab-data.json`
  - `vocab-difficulty.json`
  - `scripts/build_vocab_data.py`
  - `Claw_ENG/`
- Do not put new Japanese classroom notes into `vocab-game-maintainer`; use this skill for N4 work.
- Keep N4 separate from JP N3. Do not reuse `jp-n3-*` output files as N4 state.
- Use N4 as the target level. N5 may be used only as assumed foundation/review scaffolding, not as the daily new-word target unless Mark says so.
- Prefer fresh N4-specific names over generic `jp` names.
- Before sending public links, cron messages, or LINE messages, ask if delivery was not explicitly requested.
- After an N4 change is implemented and verified, commit and push it by default unless Mark explicitly says to keep it local.

## Canonical N4 Files

Use these paths unless Mark chooses different names:

- App: `jp-n4-review.html`
- Source data: `memory/jp-n4-vocab-history.json`
- Generated data: `jp-n4-data.json`
- Difficulty/progression: `jp-n4-difficulty.json`
- Build script: `scripts/build_jp_n4_data.py`
- Daily updater: `scripts/update_jp_n4_classroom_daily.sh`
- Design handoff/assets: `Claw_JP_N4/design_handoff/`

If copying the English mold, copy structure and interaction patterns only. Rename localStorage keys, Firestore ids, constants, generated filenames, script names, page title, and UI labels to N4-specific names before doing feature work.

## Question Design

Read `references/question-types.md` before changing quiz behavior or adding new item types.

Default N4 quiz mix:

- Vocabulary meaning: Japanese kana/kanji -> Chinese meaning.
- Reverse recall: Chinese meaning -> Japanese kana or kanji/kana form.
- Particle fill-in: choose the missing particle in a short sentence.
- Conjugation: choose the correct polite/plain/te/ta/nai form.
- Sentence chunks: order natural chunks, not individual characters.
- Grammar pattern: choose the best N4 pattern for a situation.

Avoid blindly porting English cloze/tense logic. Japanese needs particle, conjugation, and phrase-chunk handling.

Example sentences must be natural, useful daily-life Japanese. Create or adapt each
sentence for the target word's real usage, then verify its kana and Chinese
translation. Do not mass-generate examples from one part-of-speech template such
as `先生は○○について説明しました。` or `明日までに○○しなければなりません。`

## Data Contract

Read `references/data-contract.md` before editing source data, build scripts, Firebase behavior, localStorage keys, or cron release behavior.

Minimum item fields:

- `id`
- `jlpt`
- `kind`
- `kana`
- `kanji`
- `meaning_zh`
- `example_ja`
- `example_kana`
- `translation_zh`

Optional fields should support question generation instead of UI hacks: `particles`, `conjugations`, `grammar`, `chunks`, `distractors`, `audioText`, `firstSeen`, `rank`.

## Firebase And Storage

If current Firestore rules still only allow top-level `users`, `pets`, `leaderboard`, and `mapStages`, keep N4 separated with prefixed document ids such as `jpN4_<playerId>` rather than nested `classrooms/jp-n4/...` paths.

Use N4-specific local keys:

- `jpN4Profile`
- `jpN4Stats`
- `jpN4KnownWords`
- `jpN4CurrentPlayerId`

Do not reuse English keys like `epopProfile` or `vocabReview.v1.players`.

## Workflow

1. Read this skill, then load only the referenced file needed for the task.
2. Inspect current English and JP N3 implementations for patterns, not as shared state.
3. Create or edit N4 files only.
4. Run data build and syntax checks.
5. Browser-check the app before claiming UI/Firebase success.
6. Commit and push verified N4 changes by default.

## Verification Gate

Before saying an N4 app change works:

- Confirm no unintended diff in English app/data files.
- Run the N4 data build script if data or question generation changed.
- Syntax-check extracted module/Babel scripts when editing the HTML app.
- Browser-check first screen, quiz start, at least one particle question, one conjugation question, and flashcard display.
- If Firebase was touched, verify `window.FB` boot, profile load, pet claim/list if pets are still enabled, and leaderboard write/read.
