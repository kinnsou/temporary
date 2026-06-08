# Japanese N4 Data Contract

Use one source JSON and generate app-ready JSON from it. Do not hand-edit generated files except for emergency diagnosis.

## Source Item Shape

Recommended source fields:

```json
{
  "id": "n4_0001",
  "jlpt": "N4",
  "kind": "vocab",
  "kana": "あんしん",
  "kanji": "安心",
  "meaning_zh": "放心、安心",
  "example_ja": "母に電話して、安心しました。",
  "example_kana": "ははに でんわして、あんしんしました。",
  "translation_zh": "打電話給媽媽後，我安心了。",
  "firstSeen": "2026-06-04",
  "rank": 1
}
```

## Optional Question Fields

- `particles`: particle blanks with answer, choices, and explanation.
- `conjugations`: explicit forms keyed by target form; include acceptable alternatives when needed.
- `grammar`: pattern name, Chinese situation prompt, answer choices, explanation.
- `chunks`: sentence-order chunks in natural phrase units.
- `distractors`: curated wrong choices.
- `audioText`: text to speak when kana/kanji display is not the best audio source.

## Generated Data Expectations

The generated `jp-n4-data.json` should include:

- Normalized ids.
- Current daily focus items.
- Question-ready records with stable `questionType`.
- Difficulty/progression ranking.
- No English-only fields that the N4 UI does not use.

## Namespace Rules

Use N4-specific names everywhere:

- HTML root ids/classes may share style names, but app constants should use `JP_N4` or `jpN4`.
- localStorage prefix: `jpN4`.
- Firebase document id prefix: `jpN4_`.
- Cron names should include `JP N4` or `日文 N4`.
- Git commit prefix: `jp n4:`.

Do not reuse `jpN3_`, `epop`, `vocabReview.v1`, or `vocabReview.v2` namespaces for N4.
