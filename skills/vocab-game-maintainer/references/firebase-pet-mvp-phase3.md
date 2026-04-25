# Firebase Pet MVP Phase 3 Reference

Use this when changing `vocab-review.html` pet/Firestore features.

## Current architecture

- Single-file app: `vocab-review.html`.
- React app runs in `<script type="text/babel">`.
- Firebase v10 modular SDK runs in `<script type="module">`.
- The two scripts communicate only through `window.FB` and the `fbready` event.
- Do not assume variables are shared between Babel and module scripts.

## Core Firebase project

- Project: `vocab-eng2026`.
- Auth: Anonymous Auth.
- Collections:
  - `users/{playerId}` where `playerId` is name-derived when a player name exists (for example `name_<base64url(normalizedName)>`)
  - `pets/{petId}`
  - `leaderboard/{playerId}`

## Required `window.FB.ops`

Keep these available after Firebase boot:

- `loadPet(uidOrPetId)` / `loadPet(petId)`
- `refreshProfile(uid)`
- `updateUserName(uid, name)`
- `listPets()`
- `claimPet(uid, petId)`
- `releasePet(uid)`
- `renameMyPet(uid, petId, newName)`
- `feedMyPet(uid)`
- `answerCorrect(uid, isVerb=false)`
- `answerWrong(uid)`
- `getLeaderboardEntry(uid)`
- `listLeaderboard(orderField, limit)`
- `upsertLeaderboardScore(uid, name, avatarId, score, total)`
- `ensureUserProfile(uid, defaultName)`
- `seedPets()`

Regression note: `feedMyPet` was once accidentally removed during module rewrite, causing Firebase boot to fail with `ReferenceError: feedMyPet is not defined`; this made pet lists spin forever because `window.FB` never existed.

## Pet seeding and new pets

Pets are defined in the module script `SEED_PETS` array:

```js
{ id:'pet_009', type:'rabbit', name:'月亮兔', desc:'蹦蹦跳跳的月光小夥伴', img:'Claw_ENG/design_handoff/assets/newcha9.png' }
```

Rules:

- Add new PNG assets under `Claw_ENG/design_handoff/assets/`.
- Prefer `newcha9.png`, `newcha10.png`, etc.
- Use transparent PNG, 512×512 preferred, centered character with 8–12% padding.
- Add a unique `pet_###` entry to `SEED_PETS`.
- `seedPets()` only creates missing Firestore documents; it intentionally does not overwrite existing pet names/images/descriptions because players can publicly rename pets.
- `listPets()` should not depend on successful seeding to avoid blank UI.

## Name-based player identity

Anonymous Auth is only the Firebase access pass. The game identity is the player name when available.

- `normalizePlayerName(name)` trims/collapses whitespace.
- `playerIdFromName(name)` creates a stable `name_...` id from the normalized name.
- Entering the same name on phone/desktop/laptop maps to the same `users/{playerId}`, `leaderboard/{playerId}`, and `pets.ownerUid`.
- Same-name collisions are accepted by design for this classroom MVP; anyone using the same name shares that record.
- When a player enters a name, call `switchPlayerByName(name)` before pet selection so owned pets display as “我的”.
- `mergePetsByOwnerName(name, playerId)` migrates legacy pets whose public `ownerName` matches the entered name.

## Pet rules

- A player can hold one current pet: `users/{playerId}.currentPetId`.
- `claimPet(uid, petId)` releases the old pet and claims the new one.
- HP lock: switching pets must not refill HP; new claim HP is capped by released pet current HP.
- `releasePet(uid)` sets `currentPetId:null` and returns current HP to the pet doc.
- `renameMyPet(uid, petId, newName)` must verify both:
  - `users/{uid}.currentPetId === petId`
  - `pets/{petId}.ownerUid === uid`
- Pet names are public; this is intended gameplay.

## Quiz rewards

- Correct answer:
  - base +10 EXP
  - combo >= 3: +5 bonus
  - combo >= 5: +10 bonus
  - combo >= 10: +20 bonus
  - every 200 EXP grants `foodCount +1`, EXP keeps remainder
- Wrong answer: reset combo to 0.
- Guest/no-pet mode currently returns no EXP/food.

## Leaderboard

- Current key is `leaderboard/{playerId}`; with named players this is the stable name-derived id, not the Anonymous Auth uid.
- Store `uid` as a field too.
- Compare “you” by `playerId`/uid field, not display name.

## Verification gate before pushing

Do not push pet/Firebase/UI changes after syntax checks only.

Minimum checks:

1. Extract module script and run `node --check`.
2. Extract Babel/JSX script and bundle with esbuild.
3. Run a browser/runtime check (Playwright preferred) that confirms:
   - page loads
   - no fatal `pageerror`
   - `window.FB` exists
   - `[FB] phase3 ready` appears or equivalent Firebase ready state exists
   - pet selection page shows pet cards/names

Known local Playwright setup issue in WSL: if Chromium misses `libnspr4.so` / `libnss3.so`, download Debian packages with `apt-get download libnspr4 libnss3`, extract to `/tmp/pwlibs/root`, then run Playwright with `LD_LIBRARY_PATH=/tmp/pwlibs/root/usr/lib/x86_64-linux-gnu`.

## Rules

Firestore Rules are intentionally not automated here unless Firebase CLI/auth is available. Mark may apply rules manually in Firebase Console after app writes use SDK Auth.
