---
name: vocab-game-maintainer
description: Maintain the CLAW ENG vocab web game (vocab-review.html), including vocab data pipeline, quiz rules, UI/UX, avatars/POS dots, Firebase Anonymous Auth, Firestore pets/EXP/food/HP system, public pet rename/release/claim flows, uid-based leaderboard, and daily auto-update. Use when updating the daughter’s English vocab game, adding new pets/characters, fixing pet selection/loading/Firebase issues, changing quiz reward logic, updating “today’s 3 new words”, or troubleshooting cloud leaderboard/pet state.
---

# Vocab Game Maintainer

Work on these files (repo root unless noted):
- `vocab-review.html` (single-file React/Babel UI + Firebase v10 module script)
- `memory/vocab-history.json` (source of truth for meanings/examples/translations, optional POS)
- `scripts/build_vocab_data.py` (build `vocab-data.json`)
- `vocab-data.json` (generated)
- `scripts/update_vocab_game_weekly.sh` (auto-update + git push)
- `Claw_ENG/design_handoff/assets/` (current pet/character PNGs: `newcha1.png`, ...)
- `Claw_ENG/design_handoff/PHASE3_REPORT_AND_NEW_PETS.md` (project report + new-pet guide)

## Hard rules

- Do not add secrets (no service account JSON). Firebase web config is OK in frontend.
- Keep GitHub Pages working: use relative paths; avoid build steps required for production.
- Stage only relevant files. Do **not** use `git add -A` / `git add .` in this workspace.
- Do not push frontend/Firebase changes after syntax checks only. Run a browser/runtime check first.
- Preserve `window.FB` bridge: Babel script and module script do not share lexical variables.
- Keep localStorage compatibility where still used:
  - `epopProfile`
  - `epopStats3`
  - legacy `vocabReview.v1.players`
  - legacy `vocabReview.v1.currentPlayerId`

## Firebase pet MVP

For pet/Firestore/Phase 3 work, read `references/firebase-pet-mvp-phase3.md` before editing.

Current model:
- Firebase project: `vocab-eng2026`
- Auth: Anonymous Auth
- Collections:
  - `users/{playerId}` (name-derived after player enters a name)
  - `pets/{petId}`
  - `leaderboard/{playerId}`
- Pet source list: `SEED_PETS` inside the module script of `vocab-review.html`.
- Public pet names are intentional. `renameMyPet(uid, petId, newName)` updates `pets/{petId}.name` only if the pet is currently owned by that uid.

When adding new pets:
1. Add transparent PNG under `Claw_ENG/design_handoff/assets/` (`newcha9.png`, `newcha10.png`, ...).
2. Add a new unique `pet_###` item to `SEED_PETS`.
3. Verify locally that pet cards appear.
4. Commit/push only relevant files.

## Verification gate

Minimum before claiming success or pushing UI/Firebase changes:

1. Extract module script and run `node --check`.
2. Extract Babel/JSX script and bundle with esbuild.
3. Run browser/runtime verification (Playwright preferred):
   - page loads
   - no fatal console/page error
   - `window.FB` exists
   - Firebase ready log/state exists
   - pet selection page shows pet names/cards when pet work is touched

Known regression to avoid: deleting or renaming an op still referenced in `window.FB.ops` (for example `feedMyPet`) breaks Firebase boot and makes pet selection spin forever.

## Daily focus (today’s 3 new words)

- “Today’s new words” = the 3 words whose `firstSeen` equals the newest date in `vocab-data.json`.
- Cards tab renders a highlighted “今日 3 個新單字” block; older words appear below.
- Quiz item pool should bias toward focus words.
- If the focus block looks wrong, fix `memory/vocab-history.json:first_seen` (`YYYY-MM-DD`) and rebuild `vocab-data.json`.

## Quick vocab workflow

1. Edit `memory/vocab-history.json` for translations/meanings/examples/POS.
2. Rebuild: `python scripts/build_vocab_data.py`.
3. Smoke check cards + quiz + relevant cloud/pet UI.
4. Commit only relevant files.
5. Push to `origin master`.

## POS conventions

- Store explicit POS in `memory/vocab-history.json` using `pos`.
- Accept string (`"n"`) or list (`["n","v"]`).
- Supported: `n, v, adj, adv, prep, pron, conj, interj, det, num`.
- UI renders POS dots; multiple dots are supported.

## Name identity and leaderboard

- Anonymous Auth uid is only the Firebase access pass; named players use a stable name-derived `playerId`.
- Same entered name across devices intentionally shares one record.
- Same-name collisions are accepted for this classroom MVP.
- Current Firestore key: `leaderboard/{playerId}`.
- Compare the current player by playerId/uid field, not display name.
- Streak date uses Asia/Taipei.
- If cloud reads fail, UI should remain playable.

## Common fixes

- Pet list spins forever: check console for Firebase boot failure; verify all `window.FB.ops` names exist.
- Pet cards empty: verify `window.FB` exists and `listPets()` returns data/fallback.
- Avatars cropped: ensure image CSS uses `object-fit: contain`.
- Wrong POS inference: prefer explicit `pos` in `vocab-history.json`.
- Bad translations or stray notes: fix source JSON then rebuild.

## Auto-update

- Script: `scripts/update_vocab_game_weekly.sh` regenerates `vocab-data.json` and pushes if changed.
- Cron job: “每日更新單字遊戲詞庫” (Asia/Taipei 19:10). Verify with `openclaw cron list`.
