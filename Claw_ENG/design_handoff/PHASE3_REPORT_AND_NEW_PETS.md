# Vocab Review Phase 3 Report + 新寵物擴充指南

建立時間：2026-04-25  
更新時間：2026-04-25 20:25  
負責：哈酷  
下一棒：Claude Code

---

## 0. 給 Claude Code 的 TL;DR

Mark 要請 Claude 接手後續升級。請先做三件事：

1. **Firestore 清理 / 重置**
   - 重置 `pets` collection，讓所有寵物回到可選狀態。
   - 清掉哈酷本地 Playwright 測試產生的匿名 / 測試 users 與 leaderboard。
2. **新增新寵物**
   - Mark 已新增 `newcha9.png` ~ `newcha16.png` 到：
     `Claw_ENG/design_handoff/assets/`
   - 請把 `pet_009` ~ `pet_016` 加進 `vocab-review.html` 的 `SEED_PETS`。
3. **驗證後再推**
   - 不要只做 syntax check。
   - 必須用 browser/runtime check 確認 pet list 真的顯示。

---

## 1. Skill 歸檔位置

這個案子已歸檔為 OpenClaw skill，之後升級請優先讀 skill。

### Skill 主檔

```text
/home/kurohime/.openclaw/workspace/skills/vocab-game-maintainer/SKILL.md
```

### Phase 3 / Firebase Pet MVP 參考檔

```text
/home/kurohime/.openclaw/workspace/skills/vocab-game-maintainer/references/firebase-pet-mvp-phase3.md
```

### 本 handoff 報告

```text
/home/kurohime/.openclaw/workspace/Claw_ENG/design_handoff/PHASE3_REPORT_AND_NEW_PETS.md
```

Skill 觸發關鍵：

- 單字小教室
- vocab-review.html
- Firebase / Firestore
- 寵物養成
- 新角色 / 新寵物
- EXP / 飼料 / HP
- 排行榜
- 今日 3 個新單字

---

## 2. 目前已完成工作

Phase 3 A/B/C/D 已完成並推到 `origin/master`。

關鍵 commit：

- `a01c294` — Phase 3 主功能：EXP/飼料、Firestore 寵物池、release、rename、uid leaderboard、stats migration
- `02de052` — CharSelect 在 Firebase ready 後重拉寵物清單
- `add9872` — `renameMyPet(uid, petId, newName)` 對齊 handoff 規格
- `da4ece4` — 防止 CharSelect 無限 spinner
- `870b1fb` — 修復 Firebase boot；恢復 `feedMyPet`；本地 Playwright 驗證寵物清單可見
- `d2a5277` — 把 Phase 3 / 新寵物流程寫入 skill
- `958e93e` — 改成「玩家名字 = 共享玩家 ID」，同名跨裝置共用資料

### 已完成功能

- Firebase Anonymous Auth：仍保留，但只當 Firebase 存取通行證。
- 真正玩家身份：改成玩家輸入名字產生的 `playerId`。
  - 例：輸入 `珺爸` → 固定 `playerId = name_54-654i4`
  - 手機 / 桌機 / 筆電輸入同名會共用同一份資料。
  - 同名撞名會共用資料，這是 Mark 目前接受的 MVP 行為。
- `users/{playerId}`：玩家資料。
- `pets/{petId}`：公共寵物池。
- `leaderboard/{playerId}`：排行榜。
- Quiz 答對：寫入 Firestore EXP / combo / foodCount。
- Quiz 答錯：combo 歸零。
- 每累積 **200 EXP → +1 飼料**，EXP 保留餘數。
- 餵食：消耗 1 飼料，HP +50，上限 100。
- CharSelect：讀 Firestore 真實寵物狀態。
- 寵物改名：`renameMyPet(uid, petId, newName)`，只允許目前 owner 改自己的寵物。
- 釋放寵物：`releasePet(uid)`。
- legacy merge：若舊寵物 `ownerName` 等於玩家輸入名字，會轉掛到新的 name-based `playerId`。

---

## 3. 實際踩到的 bug / 注意事項

### 問題

進入「更換夥伴」頁面後一直轉圈，或沒有任何寵物可選。

### 真因

Phase 3 module rewrite 時誤刪了原本的 `feedMyPet` 函式，但 `window.FB.ops` 仍引用它，導致 Firebase boot 直接噴：

```text
ReferenceError: feedMyPet is not defined
```

結果 `window.FB` 沒有建立，`listPets()` 永遠不能被呼叫。

### 修復

- 補回 `feedMyPet(uid)`。
- 改成先建立 `window.FB`，不要被 `seedPets()` 或 bridge claim 卡住。
- `seedPets()` 失敗不阻塞 UI。
- `listPets()` 在 `pets` collection 空的時候會嘗試 seed；若 seed 也失敗，前端仍可顯示 seed fallback list。

### 重要驗證門檻

請 Claude 後續不要只做 syntax check。

最低驗證：

1. 抽出 module script 跑 `node --check`。
2. 抽出 Babel/JSX script 用 esbuild bundle。
3. 用 Playwright 或瀏覽器確認：
   - 頁面能載入。
   - console 沒有 fatal error。
   - `window.FB` 存在。
   - console 出現 `[FB] phase3 ready` 或等價 ready 狀態。
   - 進入選寵頁能看到寵物卡。

哈酷已在本地 Playwright 驗證過：

- `window.FB` 已建立。
- console 出現 `[FB] phase3 ready`。
- onboarding 選寵頁可看到原 8 隻寵物。
- 兩個 fresh browser contexts 輸入同名會得到同一個 `playerId`。
- 輸入 `珺爸` 會對到 `name_54-654i4`，且現有同名寵物顯示為「我的」。

---

## 4. Firestore 清理 / 重置需求

Mark 決定：**不用全刪玩家資料，寵物重置即可**。  
但 Firebase 裡現在有不少匿名玩家 / 測試玩家，應清理掉。

### 4.1 這些測試資料是不是被駭？

高機率不是被駭，是哈酷本地 Playwright / browser runtime 驗證產生的。

原因：

- Firebase Anonymous Auth 每個 fresh browser context 都會產生一個匿名 auth uid。
- 哈酷為了驗證跨裝置同名機制，用 Playwright 開過多個 fresh contexts。
- 測試時使用過名字：
  - `測試哈酷`
  - `測試同名玩家`
  - `珺爸`（用來驗證 legacy same-name merge；這個不要當作測試玩家刪掉）
- 因為進頁面初期還沒輸入名字時，程式會先建立 anonymous `users/{authUid}`，所以 Firebase 會看到很多 `匿名玩家`。

### 4.2 Claude 請清掉的測試 users / leaderboard

建議刪除條件：

1. `users` 裡 `name == "匿名玩家"`，且：
   - `currentPetId == null` 或不存在
   - `totalGames == 0` 或不存在
   - `totalCorrect == 0` 或不存在
   - `foodCount == 0` 或不存在
   - `bestScore == 0` 或不存在
2. `users` 裡 `name == "測試哈酷"`
3. `users` 裡 `name == "測試同名玩家"`
4. `leaderboard` 裡 `name == "測試哈酷"`
5. `leaderboard` 裡 `name == "測試同名玩家"`
6. `leaderboard` 裡 anonymous / empty test rows, if any

注意：

- 不要刪 `name == "珺爸"` 或 `playerId == name_54-654i4`。
- 不要刪真實小朋友名字，除非 Mark 明確要求。
- 如果不確定，先列出候選 docs 給 Mark 看，不要直接刪。

### 4.3 寵物重置方式

Mark 要的是「寵物池重置」，不是刪掉整個 `pets` collection。

建議 Claude 對 `pets/pet_001` ~ `pets/pet_016` 做 full reset / upsert：

```js
{
  type: <from SEED_PETS>,
  name: <from SEED_PETS>,
  desc: <from SEED_PETS>,
  img: <from SEED_PETS>,
  ownerUid: null,
  ownerName: null,
  status: 'available',
  hp: 100,
  lastHpUpdate: Date.now(),
  updatedAt: Date.now(),
  createdAt: existing.createdAt || Date.now()
}
```

理由：

- 清掉 owner，讓全部寵物重新可選。
- HP 回滿。
- disabled 寵物重新啟用。
- public rename 回到預設名，讓新一輪乾淨開始。
- 新增 `pet_009` ~ `pet_016` 時也能一起建立。

---

## 5. 新寵物擴充機制

目前寵物來源在 `vocab-review.html` module script 的 `SEED_PETS` 陣列。

位置大約：

```js
const SEED_PETS = [
  { id:'pet_001', type:'cat', name:'奶油貓', desc:'愛撒嬌的貓咪', img:'Claw_ENG/design_handoff/assets/newcha1.png' },
  ...
];
```

要新增寵物：

1. 放入圖片到：

```text
Claw_ENG/design_handoff/assets/
```

2. 在 `SEED_PETS` 後面新增一筆：

```js
{ id:'pet_009', type:'rabbit', name:'月亮兔', desc:'跳跳的月光小夥伴', img:'Claw_ENG/design_handoff/assets/newcha9.png' },
```

3. commit + push。
4. 下一次有人打開網頁時，`seedPets()` 會自動建立 Firestore 裡缺少的 `pets/pet_009`。
5. 若 Mark 要立即乾淨上線，請搭配上面的 Firestore pet reset/upsert。

---

## 6. Mark 已新增的新角色 assets

Mark 已在 assets 目錄加入新的 8 隻角色圖：

```text
Claw_ENG/design_handoff/assets/newcha9.png
Claw_ENG/design_handoff/assets/newcha10.png
Claw_ENG/design_handoff/assets/newcha11.png
Claw_ENG/design_handoff/assets/newcha12.png
Claw_ENG/design_handoff/assets/newcha13.png
Claw_ENG/design_handoff/assets/newcha14.png
Claw_ENG/design_handoff/assets/newcha15.png
Claw_ENG/design_handoff/assets/newcha16.png
```

Claude 下一步請把這 8 隻加入 `SEED_PETS`。

建議資料如下，可直接採用或依圖片外觀微調名稱：

```js
{ id:'pet_009',  type:'rabbit',  name:'月亮兔', desc:'蹦蹦跳跳的月光小夥伴', img:'Claw_ENG/design_handoff/assets/newcha9.png' },
{ id:'pet_010',  type:'panda',   name:'湯圓熊', desc:'軟綿綿的黑白糰子',     img:'Claw_ENG/design_handoff/assets/newcha10.png' },
{ id:'pet_011',  type:'fox',     name:'棉花狐', desc:'尾巴像雲一樣蓬鬆',     img:'Claw_ENG/design_handoff/assets/newcha11.png' },
{ id:'pet_012',  type:'otter',   name:'河寶獺', desc:'抱著小石頭愛游泳',     img:'Claw_ENG/design_handoff/assets/newcha12.png' },
{ id:'pet_013',  type:'penguin', name:'冰棒企鵝', desc:'搖搖晃晃的冰原小隊長', img:'Claw_ENG/design_handoff/assets/newcha13.png' },
{ id:'pet_014',  type:'koala',   name:'雲朵無尾熊', desc:'慢慢抱住每一個單字', img:'Claw_ENG/design_handoff/assets/newcha14.png' },
{ id:'pet_015',  type:'lion',    name:'小鬃獅', desc:'勇敢吼出英文答案',       img:'Claw_ENG/design_handoff/assets/newcha15.png' },
{ id:'pet_016',  type:'seal',    name:'奶泡海豹', desc:'圓滾滾地滑進學習時間', img:'Claw_ENG/design_handoff/assets/newcha16.png' },
```

---

## 7. 新寵物圖片規格

建議角色圖規格：

- 檔名：`newcha9.png`, `newcha10.png`, ...
- 格式：PNG，透明背景
- 尺寸：建議 512×512 或至少 256×256
- 主體置中，四周留白 8–12%
- 不要做太細的線條，手機上會縮到約 56–100px 顯示
- 風格：跟現有 `newcha1~8.png` 一致，圓潤、可愛、低年級友善

---

## 8. Firestore Rules 注意

Task E 暫時跳過，等 Mark 進 Firebase Console 手動貼 rules。

重要：現在已改成 **name-based playerId**，所以 rules 不能再用：

```js
allow read, write: if request.auth != null && request.auth.uid == uid;
```

因為 `users/{playerId}` 的 doc id 不等於 Firebase anonymous auth uid。

MVP 版 rules 應允許「有登入即可寫」：

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /pets/{document=**} {
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

這不是正式防作弊版，但符合目前小朋友學習 MVP：不防冒名、不防刷分，必要時 Mark 可從資料庫補數值。
