---
name: vocab-game-maintainer
description: Maintain the CLAW ENG vocab web game (vocab-review.html), including vocab data pipeline, quiz rules, UI/UX, avatars/POS dots, Firebase Anonymous Auth, Firestore pets/EXP/food/HP system, public pet rename/release/claim flows, uid-based leaderboard, and daily auto-update. Use when updating the daughter’s English vocab game, adding new pets/characters, fixing pet selection/loading/Firebase issues, changing quiz reward logic, updating “today’s 3 new words”, or troubleshooting cloud leaderboard/pet state.
---

# Vocab Game Maintainer

> **Co-maintained by OpenClaw + Claude Code.** Either side may pick up next.
> Mark explicitly asked for shared maintenance because both agents can hit
> quota limits mid-task and need to hand off.
>
> **Canonical state of truth (read both before touching anything substantial):**
> - This file (`SKILL.md`) — OpenClaw’s primary source
> - `Claw_ENG/design_handoff/PHASE3_REPORT_AND_NEW_PETS.md` — most recent OpenClaw → Claude Code handoff
> - `Claw_ENG/design_handoff/PHASE3_HANDOFF.md` — earlier Claude Code → OpenClaw handoff (Phases 1–2 background)
> - `/home/kurohime/.claude/projects/-home-kurohime/memory/project_vocab_classroom.md` — Claude Code’s project memory (richer Changelog, accessible to Claude Code only but mirrored here in summary form)
> - Recent `git log --oneline` in `/home/kurohime/.openclaw/workspace/` — most recent commits show who did what (commit messages start `vocab review:`)
>
> **Handoff convention:** when wrapping a session, append a Changelog entry under §Changelog below with date + commit hash + 1-line summary. Don’t rewrite history; append-only.

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

Current `SEED_PETS` count: **16** (pet_001~008 = original CHARACTERS; pet_009~016 added 2026-04-25).

When adding new pets:
1. Add transparent PNG under `Claw_ENG/design_handoff/assets/` (`newcha17.png`, ...).
2. **Open every PNG before naming.** Past mistake (2026-04-25): an agent named pet_009~016 from filename guesses; the actual images were dragon/parrot/whale-shark/panda/penguin/koala/hamster/alpaca but had been labelled rabbit/panda/fox/otter/penguin/koala/lion/seal in the suggested names. Always view the image first.
3. Add a new unique `pet_###` item to `SEED_PETS`. Match the existing 3–4 char Chinese name style (奶油貓 / 雲朵樹熊 etc).
4. **`seedPets()` does not overwrite existing pet docs.** It only creates missing ones. To change `name`/`desc`/`img` of a pet that already exists in Firestore, run a REST batch upsert (see `references/firebase-pet-mvp-phase3.md` for the pattern, or copy from the 2026-04-25 reset commit).
5. Verify locally that pet cards appear.
6. Commit/push only relevant files (vocab-review.html + the new PNGs).

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

> **Origin note (added 2026-04-26 by Mark):** Step 3 exists because past sessions
> pushed broken builds without self-checking and Mark had to debug them. The real
> requirement is **functional self-verification**, not Playwright specifically. If
> the change is small and you can confirm correctness by code reading + syntax
> gates + reasoning that the diff matches the requested behavior, and you have no
> browser tooling available, it's OK to ship — Mark will report visual-only
> regressions as a follow-up. Hard blockers (syntax gate failure, missing/renamed
> ops in `window.FB.ops`, Firebase boot breakage, pet/profile schema breaks) still
> mean **do not ship**. The rule is "self-QA before push," not "Playwright or
> bust."

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

- Cron job: “每日更新 CLAW ENG 首頁 3 個新單字（晚上7點）” (Asia/Taipei 19:00).
- The daily job no longer sends LINE/Telegram vocab content. It updates `memory/vocab-history.json`, rebuilds `vocab-data.json`, updates `daughter-vocab.md` / `memory/daily-tasks.json`, commits, and pushes.
- “Today’s 3 new words” are the newest `firstSeen` date in `vocab-data.json`; previous-day words automatically move into the flashcard and quiz pools because the app filters words older than today/latest.
- Pronunciation direction: stop relying on Chinese homophone text for the game path; use the web speaker button / speech output as the short-term UI direction.
- Legacy helper script: `scripts/update_vocab_game_weekly.sh` only regenerates and pushes `vocab-data.json`; the old 19:10 cron that called it is disabled.
- Verify with `openclaw cron list`.

## Firestore admin operations (REST batch commit)

When pet pool resets, test data cleanup, or merging duplicate player records is needed,
use REST `:commit` against `firestore.googleapis.com` with `?key=<apiKey>` (no auth header
needed while rules are still permissive — Phase E tightens this).

- **Single-shot batch up to 500 writes** (`update` / `delete` / `transform`) per commit.
- **Pet pool reset** (preferred over deleting + reseeding): write all `pets/pet_###` docs
  with `updateMask` listing the fields to overwrite and **omitting** `createdAt`. This
  preserves original creation time on existing docs and works as upsert for new ones.
  Defaults: `ownerUid=null, ownerName=null, status='available', hp=100, lastHpUpdate=now`.
- **Test user cleanup criteria** (per Mark, 2026-04-25):
  - delete `users/*` where `name == "匿名玩家"` AND all of `currentPetId/exp/foodCount/bestScore/totalCorrect` are 0/null
  - delete `users/*` and `leaderboard/*` named `"測試哈酷"` or `"測試同名玩家"`
  - **never delete** real names (Jun, 珺爸, Kuro, Yuki, etc.) or `name_<base64>` keys without explicit OK
- **Merge duplicate player records** (legacy anon uid → new name-based playerId): sum `foodCount`/`exp`/`totalCorrect`, take `max` of `bestScore`/`streakBest`, write to canonical `name_<base64>`, then delete the legacy uid docs. Always include `updatedAt: Date.now()`.
- **Dangling `currentPetId`**: after a pet pool reset, also clear `currentPetId` on remaining users so they re-pick from the fresh pool (their EXP/food carries over).

Reference implementation: 2026-04-25 cleanup pass — see Changelog below for commit/timestamp markers, or `git log --grep "phase3\|reset\|cleanup"`.

## Changelog (append-only handoff log)

Newest first. Format: `YYYY-MM-DD [agent] commit `hash` — one-line summary`.

- 2026-04-26 [Claude Code] `da140f1` — hard-pin Zira (female) and David (male) ahead of priority list; Mark confirmed Zira is the desired female tone, David is "good enough, no stuttering" for male. Male pitch reset 0.95→1.0. Pin degrades gracefully on iOS/macOS (where Zira/David don't exist) by falling through to the keyword priority list.
- 2026-04-26 [Claude Code] `2608db3` — pickVoice prefers `localService===true` voices first; Jenny (Online streaming, was stuttering) demoted to last; Zira / Google US English promoted on the local-voice tier; David promoted on male side. Lesson: avoid online neural voices in `speechSynthesis` priority lists — they break up under load.
- 2026-04-26 [Claude Code] `c094efb` — younger female voice tuning (Jenny/Zira/Google US English ranked above Aria) + Verification-gate origin note clarifying the rule is self-QA, not Playwright.
- 2026-04-26 [Claude Code] `a022d0d` — pet voice gender + flashcard speak-on-pet: dropped speaker icons from flashcard front/back, bumped back-of-card example to 18px, pet image now a stationary speaker with 5-line vertical-centered radial burst, `speakText(text,{gender})` picks en-* voice via priority list, new `setPetVoiceGender` op + Boy/Girl segmented toggle on rename card, voiceGender stored on `pets/{petId}` and threaded into FlashScreen.
- 2026-04-25 [OpenClaw] `f84d3ad` — leaderboard avatar fix: expanded client avatar map to pet_001~016, leaderboard writes now prefer currentPetId, and speaker buttons can read full example sentences.
- 2026-04-25 [OpenClaw] `5b17911` — daily game update pivot: homepage words agree/ugly/catch, speaker buttons, POS-colored meaning box, 640px pet assets, no-LINE daily status.
- 2026-04-25 [OpenClaw] no-commit cron — changed 19:00 vocab cron to update CLAW ENG files and push with delivery none; disabled redundant 19:10 rebuild cron.
- 2026-04-25 [OpenClaw] `b409718` — locked HP decay to owned pets only; restored flashcard meaning dashed box; changed today-new-word fallback chip to POS label.
- 2026-04-25 [Claude Code] no-commit Firestore admin (round 2) — duplicate leaderboard cleanup: `leaderboard/jun` plays merged into `leaderboard/name_anVu` (best=16, plays=7), `leaderboard/kuro` plays merged into `leaderboard/name_a3Vybw` (best=20, plays=8), old ASCII keys deleted; Jun's residual anon-uid user `HhpNlw4aWMPO7TPsGXwmIt00CWe2` (0 progress) deleted. Outstanding: `leaderboard/yuki` orphan (no name-based mirror, no users doc — left as-is, will resolve when Yuki next logs in).
- 2026-04-25 [Claude Code] no-commit Firestore admin — pets reset (16 docs to defaults, 9 test users deleted, 2 anon-uid 珺爸 records merged into `name_54-654i4` foodCount=25, 1 Kuro anon mirror cleaned, dangling `currentPetId` cleared on Jun/Kuro). 
- 2026-04-25 [Claude Code] `155b050` — pet_009~016 added (嫩芽龍/橄欖鸚/繁星鯊/湯圓貓熊/冰棒企鵝/雲朵樹熊/奶茶鼠/棉花羊駝). Names re-derived after viewing each PNG.
- 2026-04-25 [OpenClaw] `08f4e91` — wrote PHASE3_REPORT_AND_NEW_PETS.md handoff back to Claude Code.
- 2026-04-25 [OpenClaw] `958e93e` — playerId switched from anon uid to name-based (`name_<base64>`) so same name shares record across devices.
- 2026-04-25 [OpenClaw] `870b1fb` — restored deleted `feedMyPet` op that broke Firebase boot and made CharSelect spin forever. **Lesson**: always grep `window.FB.ops.<name>` before removing a function from the module script.
- 2026-04-25 [OpenClaw] `a01c294` — Phase 3 main: quiz wired to Firestore EXP/combo/food, public pet rename/release/claim, leaderboard keyed by playerId, local stats migrated to `users/{uid}`.
- 2026-04-25 [Claude Code] `750fb00` — HP swap lock: `claimPet` uses `Math.min(curHp, releasedHp)` so kids can't refill by switching pets.
- 2026-04-25 [Claude Code] `2fb1567` — Phase 2: `PetCard` UI + `feedMyPet` + `FeedReaction` modal + visitor mode (🐈‍⬛) + `numToEnglish` + bridge from old onboarding.
- 2026-04-25 [Claude Code] `297015b` — Phase 1: Firebase v10 modular SDK + Anonymous Auth + `ensureUserProfile` + `seedPets` (8 initial pets).
- 2026-04-25 [Claude Code] `8720c6a` — UI simplifications per fix3-5.jpg (drop redundant home buttons, dashed hint card, “點擊看中文”→“點擊看例句”, restructure flashcard back).
- 2026-04-24 [Claude Code] no-commit — Firestore leaderboard cleared (6 test rows deleted via REST commit) before pivoting to MVP.
- 2026-04-24 [OpenClaw] `3736683` — added cloze + tense quiz question types.
