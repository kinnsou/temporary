---
name: vocab-game-maintainer
description: Maintain the Chiikawa-themed vocab web game (vocab-review.html) and its data pipeline (memory/vocab-history.json → scripts/build_vocab_data.py → vocab-data.json). Use when updating UI/UX (including “today’s 3 new words” highlight), quiz rules (20Q mix), avatars, POS dots, translation fixes, auto-update script/cron (daily), or the Firebase/Firestore cloud leaderboard (best score + streak).
---

# Vocab Game Maintainer

Work on these files (repo root unless noted):
- `vocab-review.html` (UI + quiz + localStorage + Firebase REST)
- `memory/vocab-history.json` (source of truth for meanings/examples/translations, optional POS)
- `scripts/build_vocab_data.py` (build `vocab-data.json`)
- `vocab-data.json` (generated)
- `scripts/update_vocab_game_weekly.sh` (legacy name, now used for auto-update + git push)
- `assets/avatars/` (PNG characters)

## Hard rules

- Do not add any secrets (no service account JSON).
- Firebase `apiKey/authDomain/projectId/...` is OK to embed in frontend.
- Keep GitHub Pages working: only relative paths, no external CDN required.
- Keep localStorage keys stable:
  - `vocabReview.v1.players`
  - `vocabReview.v1.currentPlayerId`

## Daily focus (today’s 3 new words)

- “Today’s new words” = the **3 words whose `firstSeen` equals the newest date** in `vocab-data.json`.
- Cards tab renders:
  - a highlighted “今日 3 個新單字” block with different color + divider
  - older words automatically appear below (next day, the new `firstSeen` becomes the focus, yesterday’s drops down)
- Quiz item pool is biased to include those focus words first.

If the focus block looks wrong, fix `memory/vocab-history.json:first_seen` (must be `YYYY-MM-DD`) and rebuild `vocab-data.json`.

## Quick workflow

1) Edit `memory/vocab-history.json` (fix translations, meanings, examples, add POS if needed).
2) Rebuild:
   - `python scripts/build_vocab_data.py`
3) Smoke check:
   - Open `vocab-review.html` (cards render, quiz works, cloud leaderboard status OK)
4) Commit only relevant files.
5) Push to `origin master`.

## POS (詞性) conventions

- Store explicit POS in `memory/vocab-history.json` using `pos`.
  - Accept either a string (`"n"`) or a list (`["n","v"]`) for multi-POS.
- Abbreviations supported: `n, v, adj, adv, prep, pron, conj, interj, det, num`.
- UI renders POS dots bottom-right; multiple dots are supported.

## Firebase cloud leaderboard (Firestore REST)

- Collection: `leaderboard`
- docId: normalized from name (lowercase, non-alnum → `_`).
- Fields: `name, avatarId, plays, bestScore, recentScores[], streakCur, streakBest, lastPlayDate, updatedAt`.
- Streak is computed by **Asia/Taipei date**.
- If cloud reads fail (rules/index), UI should fall back to local mode and still be playable.

If you see “本機模式/雲端未連線” unexpectedly, check Firestore rules first. For the simplest working rules, see `references/firestore-rules.md`.

## Common fixes

- Avatars look cropped: ensure `.avatar img { object-fit: contain; }`.
- Wrong POS inference (example: “Spring is …”): prefer explicit `pos` in `vocab-history.json`.
- Bad translations or stray notes (e.g., 重音在…): fix at the source (`vocab-history.json`) then rebuild.

## Auto-update (daily)

- Script: `scripts/update_vocab_game_weekly.sh` regenerates `vocab-data.json` and pushes if changed.
- Cron job: “每日更新單字遊戲詞庫” (Asia/Taipei 19:10). Verify with `openclaw cron list`.
