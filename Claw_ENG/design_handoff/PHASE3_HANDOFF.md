# Vocab Review — Firebase Pet MVP **Phase 3 Handoff**

> **接手人**：OpenClaw（或下一輪 Claude Code session）
> **建立日期**：2026-04-25
> **建立人**：Claude Code（Opus 4.7，session 即將窗口耗盡）
> **單一真相來源**：`vocab-review.html`（部署在 GitHub Pages）+ Firestore `vocab-eng2026`

---

## 0. 任務 TL;DR

依 `firebase_pet_mvp_spec.md` 與 `fix6.jpg`，把女兒英文單字複習網站做成「玩家匿名登入 → 養 8 隻公共寵物 → 答題賺飼料 → 餵食 → HP 衰減」的養成系統。**Phase 1（後端骨架）、Phase 2（首頁 UI + 餵食循環）、HP 鎖（防換寵刷血）已完成並上線**。本輪要接的 Phase 3 是把**遊戲循環閉合**：Quiz 接到 Firestore EXP/飼料、CharSelect 改成真正的 Firestore 認領流程、leaderboard 鍵遷移到 uid、清理 dev 按鈕。

請完成這份文件第 4 節的 **Phase 3 Task List** 後 push，**不要重新設計架構**。如有疑問先讀第 5 節（Gotchas）再問。

---

## 1. 環境

- **Repo**：`git@github.com:kinnsou/temporary.git`，分支 `master`
- **本地路徑**：`/home/kurohime/.openclaw/workspace/`（WSL2 Ubuntu_Work，使用者 `kurohime`）
- **核心檔案**：`vocab-review.html`（單檔 HTML，~1500 行，React inline + babel + Firebase v10 modular）
- **Firebase Project**：`vocab-eng2026`
  - apiKey：`AIzaSyB1c6yopEMzDxbYBrgkqr_3Rsr9KqKwNbA`
  - authDomain：`vocab-eng2026.firebaseapp.com`
  - Anonymous Auth 已啟用並驗證
  - Firestore collections：`users`、`pets`、`leaderboard`
  - Firestore rules **目前是寬鬆模式**（test mode 或允許所有讀寫），Phase 3 結束時要套 spec §15 規則
- **Git 約定**：
  - 只 stage 自己動到的檔案（**禁用 `git add -A` / `git add .`**），repo 工作區有大量無關本地變更
  - Commit message 風格：短句首行 `vocab review: ...`（小寫冒號），詳細描述用 bullet points
  - Push 到 `origin/master`（直接 push 即可，沒有 PR 流程）
- **沒有測試套件**，靠 commit message + 用戶在瀏覽器手動驗證

## 2. 已完成（不要重做）

| Commit | 日期 | 內容 |
|---|---|---|
| `8720c6a` | 2026-04-25 | UI 簡化（fix3-5）：移除首頁 3 大按鈕、簡化單字卡正反面 |
| `297015b` | 2026-04-25 | **Phase 1 後端骨架**：Firebase v10 modular SDK + Anonymous Auth + `ensureUserProfile` + `seedPets`（8 隻 pet_001~008） |
| `2fb1567` | 2026-04-25 | **Phase 2 寵物卡 UI + 餵食循環**：`PetCard` + 訪客模式 + `FeedReaction` modal + `claimPet`/`feedMyPet`/`devGrantFood` ops + `numToEnglish` + bridge 機制 |
| `750fb00` | 2026-04-25 | HP 鎖（防換寵刷血）：`claimPet` 用 `Math.min(curHp, releasedHp)` |
| (剛 commit) | 2026-04-25 | 修 CharSelect 換寵 silent-fail：claimPet 拋例外時 alert 並 bail（不更新 localStorage） |

## 3. 當前架構

### 3.1 兩條並行 script

`vocab-review.html` 同時跑兩個 script：

1. **`<script type="text/babel">`**（~1100 行）：React 主應用，inline JSX。透過 `window.FB` 與 module script 通信。
2. **`<script type="module">`**（~150 行，檔案末段）：載入 Firebase v10 modular SDK，做 Anonymous Auth、ensureUserProfile、seedPets，把 ops 暴露在 `window.FB`，完成後 dispatch `fbready` 事件。

兩者**不能 import 對方變數**（一個是 babel 編譯，一個是原生 ES module）。靠 `window.FB` + 自訂事件橋接。

### 3.2 `window.FB` 結構（Phase 2 後）

```js
window.FB = {
  app, auth, db,           // Firebase 物件
  uid: '<anon-uid>',       // 當前匿名 uid
  profile: {...},          // users/{uid} 的 snapshot（boot 時抓的，不會自動更新）
  config: { HP_DECAY_MS: 1800000, SEED_PETS: [...] },
  helpers: { calcCurrentHp },
  ops: {
    loadPet(petId),
    refreshProfile(uid),
    claimPet(uid, petId),     // transaction，含 HP lock
    feedMyPet(uid),           // transaction，HP+50 cap 100，foodCount-1
    devGrantFood(uid, n=5),   // 暫時的測試用，Phase 3 完成後拆掉
    ensureUserProfile, seedPets,
  },
  modular: { doc, getDoc, setDoc, updateDoc, getDocs, collection, runTransaction },
};
```

### 3.3 React 端使用方式

`useFb()` hook 在 React 內維護 `{ ready, uid, profile, pet }` 狀態：

```js
const [fb, refreshFb] = useFb();
// fb.pet 是 await loadPet(profile.currentPetId) 的結果，可能 null（訪客）
// 寫入 Firestore 後要 await refreshFb() 把 React 狀態拉新
```

### 3.4 雙態並存：localStorage vs Firestore

目前 **同時存兩份玩家資料**：
- **localStorage**（legacy，Phase 2 前唯一來源）：
  - `epopProfile`：`{ name, charIdx, password }` — 學生姓名 + 角色 index + 6 碼密碼
  - `epopClaims`：`{ [charId]: { name, password } }` — 6 碼密碼認養機制
  - `epopStats3`：`{ streak, xp, best, weekPlayed, avgScore, ... }` — XP/連勝/最高分等
- **Firestore `users/{uid}`**（Phase 1 引入）：
  - `{ name, currentPetId, exp, combo, foodCount, totalCorrect, createdAt, updatedAt }`

**Bridge 機制**（Phase 2 加的，兩處同時做）：
1. **module script boot**：偵測 localStorage 已有 `charIdx` → 自動 `claimPet(pet_00<charIdx+1>)` 寫進 Firestore
2. **App-level useEffect**（用 `claimAttempted` ref 防重複）：fb 已 ready 但 fb.pet 是 null 且 profile.charIdx 存在 → claim

**6 碼密碼機制已決議廢除**（Anonymous uid 已綁瀏覽器，等同身份），但 OnboardingScreen 與 CharSelectScreen 還在跑舊密碼邏輯。Phase 3 任務 #2 要把這個拔掉。

### 3.5 資料模型

#### `users/{uid}`
```js
{
  name: '匿名玩家',          // 學生姓名
  currentPetId: 'pet_001',   // null = 訪客
  exp: 0,                    // 答對累積，滿 200 → foodCount +1
  combo: 0,                  // 連續答對數
  foodCount: 0,              // 飼料持有
  totalCorrect: 0,
  createdAt, updatedAt,      // Date.now() ms
}
```

#### `pets/{petId}`（pet_001 ~ pet_008，未來可由 SEED_PETS 陣列加更多）
```js
{
  type, name, desc, img,     // 顯示用
  ownerUid: null | uid,
  status: 'available' | 'owned' | 'disabled',
  hp: 0~100,
  lastHpUpdate,              // ms，calcCurrentHp 用 (now - last) / HP_DECAY_MS 推算
  createdAt, updatedAt,
}
```

**HP 衰減**：每 `HP_DECAY_MS = 30 分鐘` -1（spec 寫 1 小時，與用戶確認後加速 2 倍）。**不寫 cron**，靠 `calcCurrentHp(pet)` lazy 計算，僅在 `claimPet` / `feedMyPet` 時實際寫回。

#### `leaderboard/{cloudDocId(name)}`（**legacy，Phase 3 要遷移**）
目前用 `cloudDocId(name)` 為文件 ID（name 為主鍵），Phase 3 要遷移到 `leaderboard/{uid}`。已決議全面替換，舊資料不需保留（之前用戶清空過）。

## 4. Phase 3 Task List（請依序完成）

### Task A — Quiz 接 Firestore EXP/飼料（**最重要**）

當前 `QuizScreen` 答對只更新 `localStorage epopStats3.xp`，Firestore `users.exp` 完全沒動。需要：

1. 在 module script 加 `answerCorrect(uid, isVerb=false)` 與 `answerWrong(uid)` ops（spec §9 §10）
2. `answerCorrect` 邏輯：
   - 讀 user.exp + user.combo
   - 計算 gainExp（spec §9）：base 10，combo ≥ 3 +5、≥ 5 +10、≥ 10 +20
   - totalExp = exp + gainExp
   - addFood = floor(totalExp / 200)
   - 更新 `{ exp: totalExp % 200, combo: combo+1, foodCount: foodCount+addFood, totalCorrect: totalCorrect+1, updatedAt }`
   - 回傳 `{ gainExp, addFood, newCombo }`
3. `answerWrong`：`{ combo: 0, updatedAt }`
4. 在 `QuizScreen` 答題分支呼叫對應 op，並在 UI 浮現「+10 EXP」「🍖 ×N！」訊息（已有 `xpRise` 動畫可用）
5. 刪除 PetCard 角落的 **🧪 +5 dev 按鈕**（搜 `devGrantFood` 與 `🧪`）；module script 的 `devGrantFood` 函式也清掉
6. **記得 await refreshFb()** 在答題後，PetCard 才會顯示新的 foodCount

### Task B — CharSelect 改用 Firestore pets 列表

當前 `CharSelectScreen` 從硬編碼 `CHARACTERS` 陣列拉，且還在跑 6 碼密碼邏輯（雖然 onSelect 同時也會 claim Firestore）。需要：

1. 在 module script 加 `listPets()` op：`getDocs(collection(db, 'pets'))` → 回傳陣列含每隻 `{ id, name, img, ownerUid, status, hp: calcCurrentHp(...) }`
2. CharSelect 改用 `listPets()` 動態載入
3. UI 顯示三種狀態：
   - **available** + ownerUid=null：可選，正常
   - **owned by me**（ownerUid === uid）：標 ✓，可繼續持有
   - **owned by others**：灰階 + 顯示「被 OO 帶走」+ 禁選
   - **disabled**（HP=0）：黑白 + 「💤 餓壞了」+ 禁選
4. **完全移除 6 碼密碼 modal**（OnboardingScreen 也要拔掉密碼相關邏輯與 `epopClaims` localStorage 寫入）
5. CharSelect 加「💔 釋放這隻寵物」按鈕，呼叫 `releasePet(uid)`（要新增 op：把 currentPetId 設 null + pet 改回 available 並寫回現 HP）。釋放後玩家進入訪客狀態

### Task C — Leaderboard 鍵遷移到 uid

`vocab-review.html` 內的 `cloudDocId(name)` / `cloudUpsertScore(name, ...)` / `cloudGetEntry(name)` / `cloudRunQuery(...)` 全部改成以 uid 為文件 ID，name 變欄位（顯示用）。
- 舊 6 筆已清空，無需資料遷移
- 寫入時加 `uid` 欄位
- 排行榜顯示時用 name + avatarId（從 currentPetId 對應）
- RankScreen 內 `RankList` 比對「你」用 uid 匹配（不再用 studentName）

### Task D — localStorage stats 一次性遷移到 Firestore

`epopStats3` 內的 `streak / best / avgScore / xp / weekPlayed` 應該整合進 `users/{uid}`（spec 沒明寫所有欄位，但 streak 與 best 至少要進 Firestore 才能跨裝置）。建議：

1. `users` 加欄位：`streakCur`、`streakBest`、`bestScore`、`avgScore`、`weekPlayed`、`lastPlayDate`
2. **Migration 跑一次**：在 module script boot 時，若 users 文件沒有 `streakBest` 欄位且 localStorage 有 `epopStats3` → 把舊資料寫進 users，並標記 `migratedFromLocalAt: Date.now()`
3. App 端讀 stats 改從 fb.profile 拿，不再讀 localStorage（保留 saveStats 寫 localStorage 作為備份，或全廢）
4. HomeScreen 統計列（連續天數/平均分數/最高分）改用 fb.profile 數值

### Task E — Firestore Rules 套 spec §15

把以下 rules 貼進 Firebase Console → Firestore → Rules：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /pets/{petId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /leaderboard/{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

⚠️ **重要**：套 rules 前請先確認所有寫入都已改用 SDK auth（任務 A/B/C/D 都做完）。如果還有 REST 無 auth 的寫入會被擋掉。

### Task F（選做）— 訪客模式減少 flash

當前用戶剛做完 onboarding 後第一秒會閃過「訪客喵」再變寵物。可改善：在 `PetCard` 內，當 `!fb.ready || (fb.ready && !fb.pet && profile?.charIdx != null)` 時顯示 loading skeleton，等狀態穩定再渲染真實內容。

## 5. Gotchas（踩過的雷）

1. **Firestore REST 不接受 Firebase idToken**：用 curl + `Authorization: Bearer <idToken>` 直打 `firestore.googleapis.com` 會回 `ACCESS_TOKEN_TYPE_UNSUPPORTED`。必須用 SDK 走它的 gRPC-Web gateway。要從 CLI 測 Firestore 規則只能透過瀏覽器 + console。
2. **Module script 與 babel script 不共享變數**：要傳值只能透過 `window.*`。
3. **修 git commit 時只能 stage 自己動的檔案**：`/home/kurohime/.openclaw/workspace/` 工作區有 100+ 個無關本地變更，**禁用 `git add -A`**。每次 commit 前 `git status --short | head` 自查。
4. **不要砍 `vocab-review.v2.bak.html`**：是備份檔。
5. **OnboardingScreen 與 CharSelectScreen 共用 6 碼密碼邏輯**：拔密碼時兩邊都要清。`epopClaims` localStorage 也要 cleanup。
6. **HP lock**：`claimPet` 已實作 `Math.min(curHp, releasedHp)`。新增 `releasePet` op 時要保持「釋放時把當前 HP 寫回 pet.hp」這個語意，否則下次 claim 拿到的會是過時值。
7. **訪客模式從前端進不去**：因為 OnboardingScreen 強制要求選角色。Task B 的「釋放寵物」按鈕做完後就能進得去了。
8. **`runTransaction` 在 transaction 內必須先讀後寫**：別在 tx.update 之後再呼叫 tx.get，會錯。

## 6. 測試流程（Phase 3 完成後）

1. F12 console 看 `[FB] phase3 ready`（boot log 改個版本識別）
2. 答題（zh2en / cloze / tense 各幾題），Firestore `users/{uid}.exp` 應該累積、滿 200 自動 +1 飼料
3. 連續答對 3 題：UI 顯示「🔥 連續 3 題」+ 下次答對 +15 EXP（base 10 + combo bonus 5）
4. 答錯：combo 歸零
5. CharSelect：應該看到 8 隻寵物的真實狀態（被別人帶走的灰階禁選）
6. 「釋放寵物」→ 回首頁應該看到訪客喵
7. Leaderboard：以 uid 為主鍵，自己那筆有「你」標記
8. 多裝置/隱私視窗測試：同一 uid 在另一裝置（用 idToken 不行，得用 anon refresh）會看到同樣資料 — 實務上 anon uid 綁瀏覽器，這條暫時不可測，註記即可

## 7. 待用戶決定的事項

- **訪客 EXP**：訪客（無寵物）目前無法從 quiz 賺 EXP（因為要寫 currentPetId 連動）。要不要讓訪客也能累積 EXP/飼料，等之後選了寵物再餵？決定權留用戶。
- **改名功能**：spec §13 提到 `renameMyPet`，但 fix6 沒畫 UI。要不要做？放在 Task B 的 CharSelect 裡比較順手。
- **新角色擴充流程**：用戶提到要能輕易加新寵物。SEED_PETS 陣列已經是資料驅動的，加一筆下次有人開頁面就會自動建。但目前沒有「強制重新 seed」機制（已存在的 pet 不會被 SEED_PETS 內容覆蓋）。如果要支援「修改現有寵物的 desc/img」，需要加 force-update 邏輯或改 schema 版本號。

## 8. 結束時請更新

- `/home/kurohime/.claude/projects/-home-kurohime/memory/project_vocab_classroom.md` 加 Phase 3 changelog 條目（commit hash + 完成項目）
- 若有非顯而易見的 debug 過程，視情況用 claudeception 抽 skill
