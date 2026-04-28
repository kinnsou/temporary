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

## Gameplay constants (current as of 2026-04-27)

Pinning the values that drove design decisions, so future sessions don’t have to re-derive them. Source of truth is the code; update this section if you change a constant.

- **Quiz length**: 15 questions (`QuizScreen TOTAL = Math.min(15, quizPool.length)`).
- **Quiz pool**: level-based study path from `vocab-difficulty.json` plus daily focus. LV1 gets the 15 easiest ranked words **excluding today's focus words**, then today's newest 3 are appended; each additional LV unlocks the next 5 ranked words. The quiz samples 15 questions from that pool and prioritizes daily focus words first.
- **Flashcard pool**: same level-based study path + daily focus pool, split into 未熟練 / 已會 tabs by `knownWords`. Do not revert to recent-15-only or full corpus without Mark confirming; progression should move easy → hard.
- **Cloze cap per quiz**: 3 (`MAX_CLOZE`). Down from 5 when length was 20.
- **Pet hint budget**: 3 per quiz (`HINT_BUDGET = 3`). zh2en eliminates 2 wrong options, cloze speaks target via TTS, tense reveals `tenseHintText(form, base)` together with the base form (e.g. "（原形：wear）"). Hint state resets per question, budget persists across questions. **Per-question lock**: `hintUsedThisQ` flag — the pet can be tapped only once per question; subsequent taps do nothing (don't re-debit). The pet image acts as the hint button; the pill reads "{petName}提示 N/3" (e.g. "奶油貓提示 3/3"). Tense card **must not** show 原形 outside the hint — it leaks the answer when one of the 4 options equals the base form.
- **EXP per correct answer**: `calcExpGain(combo)` = 10, +5 at combo≥3, +10 at combo≥5, +20 at combo≥10.
- **Level XP curve** (`levelXpRequirement(level)`): 100, 130, 176, 246, 357, **536**, then **caps linear at 536** for every higher level. Multiplier sequence is 1.30, 1.35, 1.40, 1.45, 1.50, then stays at 1.70 with `Math.min(LEVEL_XP_CAP, ...)`. Earlier exponential curve was explicitly rejected by Mark.
- **Food**: 1 food per level-up (`addFood = levelUp` inside `answerCorrect`). HP decay is on `pets/{petId}` only when `status===’owned’`.
- **Starvation rebirth**: HP_DECAY_MS = 30 min/point, so an idle owned pet hits 0 HP in ~50h. `listPets` and `claimPet` then auto-rebirth the pet (hp=100, status='available', ownerUid=null) and clear the previous owner's `currentPetId`. There is **no permanent disabled state** — abandoned pets always return to the available pool. `'pet-disabled'` is not user-visible anymore.
- **Level-up modal**: fired on home only when `pendingLevelUp > 0`. Closing calls `ackLevelUp(uid)`. The close handler must `ack→refresh→setLevelUpInfo(null)` in that order, with a `useRef` lock — the inverse order races and re-opens the modal with stale pending>0.
- **`vocab-difficulty.json`**: active study-path source. The first 100 curated words are the easy→hard ranking; rank 101+ falls back to `firstSeen` oldest-first. `perLevel.lv1Size=15`, `lvIncrement=5`.

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

- 2026-04-27 [OpenClaw] `c9eb9a0` — Restored level-based study path: LV1 gets 15 easiest ranked words plus today's 3; each level unlocks +5; quiz prioritizes daily focus; totalExp is persisted and shown on the home pet card.
- 2026-04-28 [Claude Code] `b7ca2a9` — pet emoji moodlets on PetCard (animation-free, same absolute-overlay pattern as the quiz hint badge). Feeding success → 2x ❤️ to the pet's left, offset (large 20px at left:-12 top:-2, small 13px at left:-18 top:22) so they don't line up; auto-clears 1.6s. HP in (0,20) → 😢 at right:0 bottom:6 (under the right-eye region). Both wrapped in overflow:visible button with pointer-events:none on the spans so the tap-to-charselect click still works.
- 2026-04-27 [Claude Code] `7ad9ab4` — (1) hint ✨ sparkle no longer bleeds across questions: per-question reset clears `hintFx`, plus a 500ms auto-clear effect so the overlay self-dismisses. (2) **Starved pets auto-rebirth into the available pool** — Mark wanted to stop one-time players from locking pets forever. listPets now writes hp=100 / status='available' / ownerUid=null when it sees an owned pet at hp≤0, and clears the previous owner's `currentPetId`. claimPet treats starved/disabled pets as reborn-on-claim (hp=100, prev-owner cleared in the same tx), so 'pet-disabled' is no longer thrown to the player. Net effect: ~50h of inactivity (30min/HP × 100) returns the pet to the pool.
- 2026-04-27 [Claude Code] `2a22928` — pet-hint per-question lock (`hintUsedThisQ`). Bug: zh2en/cloze had no guard against tapping the pet repeatedly on the same question, so a 3-hint budget could be drained on one question. Tense's old `hintRevealed` early-return covered itself, but the other two leaked. Now a single per-question flag (reset alongside hintRevealed/hiddenOpts on idx change) covers all three types and disables the pet visually after the first debit per question.
- 2026-04-27 [Claude Code] `28c7408` — polish pass: (1) Home PetCard collapses 「⭐ LV4」+「總EXP 550」 into one purple #a78bfa line `⭐ LV{n} ∣ EXP {totalExp}`. (2) CharSelect 釋放這隻寵物 button moved from a full-width red row to a compact pink pill next to 改名, label shortened to 💔 釋放. (3) Flashcard 已會 tab drops the corner ✅ indicator (collided with floating pet at top:15/right:12). (4) Tense question card no longer prints "原形：xxx" outside the hint — it leaked the answer when an option matched the base form; base form now appears only inside the revealed hint pill `(原形：wear)`. (5) Hint budget 2 → 3, pill text "{petName}提示 N/3" (threaded charName into QuizScreen).
- 2026-04-27 [Claude Code] `e3bf34b` — FlashScreen pool scoped to quizPool (recent 15 by firstSeen) instead of full vocabAll. New players landing on 120 cards was overwhelming; cards now follow the same daily-rolling 15-word window as the quiz. 未熟練/已會 tabs split this 15.
- 2026-04-27 [Claude Code] `f835d67` — flashcard pet position to top:15 right:12 (inside card top-right corner), per Mark's preference.
- 2026-04-27 [Claude Code] `d020113` — flashcard pet floats absolute on the card top-right (54x54, drop-shadow + float anim) so SE3 / short phones see it without scrolling. Tap pet=speak, tap card=flip. Action row buttons trimmed to padding '6px 10px'/font 12 (now visibly shorter than tab pills). 放棄此題 button moved out of the always-visible XP footer back into each answerArea's last child — only reachable by scrolling, so it doesn't tempt children to bail.
- 2026-04-27 [Claude Code] `4eed3d5` — flashcard layout fix: don't shrink the working card to dodge a mobile bug. Use `.scroll-body` (the same flex:1+overflow-y:auto trick RankScreen uses) on the card container so the body scrolls when viewport is short, while keeping card minHeight 240/gap 16 unchanged. **Lesson (Mark's note)**: a one-bug fix that redesigns working layout is wrong; mirror an existing working pattern in the same project first.
- 2026-04-27 [Claude Code] `395bfaa` — level XP requirement caps at 536 (linear after LV6→7); quizPool simplified to "most-recent 15 by firstSeen, regardless of LV/known"; FlashScreen decoupled from LV unlock; cloze max 3; LV modal trimmed to a celebration card (no unlocked-word chip list); MAX_CLOZE pinned to 3. Followed by no-commit Firestore admin reset: users/* (15 docs) + leaderboard/* (9 docs) deleted, pets/* (16 docs) released to ownerUid=null status=available hp=100. Mark wanted everyone to start fresh under the new curve.
- 2026-04-27 [Claude Code] `92175cb` — fix bundle: (F1) LV modal duplicate — handleCloseLevelUp had a race where `setLevelUpInfo(null)` ran before refreshFb, so the effect re-fired on stale pending>0; ack→refresh first, then close, with a useRef lock during the round-trip. (F2) FlashScreen mobile BottomNav clipping — initial fix shrank card minHeight 240→200 (reverted in `4eed3d5`). (F3) Quiz pet hint visuals — wrap pet+badge in inner span that takes the float anim so the outer button can host an absolute 💡 badge that doesn't get clipped at the float peak; outer container paddingTop:22 + overflow:visible. (F4) Leaderboard `level` mirrored on upsert; podium/list rows show `name LV<n>` (gold #ffb300). (F5) Quiz length 20→15. (F6) Old level curve `exp%200` could deliver 4 levels in one transaction; replaced with `levelXpRequirement(level)` (100,130,176,246,357 then 1.30→1.70 multiplier sequence) and a bounded while-loop in answerCorrect.
- 2026-04-27 [Claude Code] `c09e74c` — podium medals moved to bottom of column; column top now shows score sized by rank (1st=30, 2nd=22, 3rd=17). Quiz pet hint system (2 hints/quiz): zh2en eliminates 2 wrong options, cloze speaks the target word, tense reveals previously always-on cue text via `tenseHintText(form,base)` keyed off the verb form. Flashcards split into 未熟練/已會 tabs (default 未熟練); 我會了 → markWordKnown (arrayUnion), ↩ 移回未熟練 → markWordUnknown (arrayRemove). Quiz wrong answers + new 放棄此題 button both call markWordUnknown. Today's 3 new words inherently land in 未熟練 because they're not in knownWords. Firebase imports gain `arrayUnion`/`arrayRemove`; `users/{pid}.knownWords:[]` defaulted in ensureUserProfile.
- 2026-04-27 [Claude Code] `4b9bb6d` — Home stat boxes: `%` removed (avgScore now 1 decimal), 最高分 → 今日題數. Leaderboard 分數排行 sorts by `avgScore` (so 95.8 vs 99.6 spread is visible); streak subtitle shows 今日 X 題. New `vocab-difficulty.json` (AI-curated easy→hard 100-word ordering; rank 101+ falls back to firstSeen). Initial LV system: every 200 XP wraps both food and level; pendingLevelUp drives a level-up modal on home; LevelUpModal shows newly unlocked 5 words. PetCard 今天的夥伴 → ⭐ LV n. ensureUserProfile backfills level=21 for existing accounts (later moot — full reset on `395bfaa`). New op `ackLevelUp`. **Note**: this was the initial design; superseded by `395bfaa`'s recency-based pool which removed LV's effect on quiz/flash.
- 2026-04-26 [Claude Code] `a5f8d34` — pin "Google US English" as `FEMALE_VOICE_PIN` (was Zira). Confirmed via cross-device diagnostic that Google US English is the desired tone. Zira / Samantha remain as Windows / iOS fallbacks for devices without the Google voice.
- 2026-04-26 [Claude Code] `14c5635` — show picked voice name on rename card (🎙 <name>) so Mark can read what each device picked without needing F12 console access (which Edge/Chrome's self-XSS guard blocks). Voice resolution is per-device — `speechSynthesis` voice catalog differs across Windows / macOS / iOS / Android, so cross-device uniformity requires a cloud TTS rather than priority-list tuning.
- 2026-04-26 [Claude Code] `b474afc` — LINE WebView detection + dismissable banner. LINE's in-app browser blocks the cookies/storage Firebase Anonymous Auth needs, so links opened from LINE chats fail to sign in even after refresh. There's no JS-only way to break out (LINE's `openExternalBrowser=1` is sender-side only) — banner now instructs users to use the right-side ⋯ → 在瀏覽器中開啟. Detection: `/\bLine\//i.test(navigator.userAgent)`. CharSelect's firebase-not-ready error reuses the same hint when in LINE.
- 2026-04-26 [Claude Code] `4408143` — fix mobile false-negative "Firebase 還沒連上" on CharSelect: replaced 3s polling (20×150ms) in `loadPets` with `fbready` event race vs 12s timeout. Mobile cold-start Anonymous Auth + Firestore commonly takes 5–10s on cellular — old timeout under-served mobile users while desktop wifi met it. Lesson: Firebase boot wait windows in the UI must accommodate cellular cold start, not just desktop wifi.
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
