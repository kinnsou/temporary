# Vocab Review Phase 3 Report + 新寵物擴充指南

建立時間：2026-04-25
負責：哈酷

## 1. 目前狀態

Phase 3 A/B/C/D 已完成並推到 `origin/master`。

最新關鍵 commit：

- `a01c294` — Phase 3 主功能：EXP/飼料、Firestore 寵物池、release、rename、uid leaderboard、stats migration
- `02de052` — CharSelect 在 Firebase ready 後重拉寵物清單
- `add9872` — `renameMyPet(uid, petId, newName)` 對齊 handoff 規格
- `da4ece4` — 防止 CharSelect 無限 spinner
- `870b1fb` — 修復 Firebase boot；恢復 `feedMyPet`；本地 Playwright 驗證寵物清單可見

## 2. 實際踩到的 bug

### 問題
進入「更換夥伴」頁面後一直轉圈，或沒有任何寵物可選。

### 真因
我在 Phase 3 module rewrite 時誤刪了原本的 `feedMyPet` 函式，但 `window.FB.ops` 仍引用它，導致 Firebase boot 直接噴：

```text
ReferenceError: feedMyPet is not defined
```

結果 `window.FB` 沒有建立，`listPets()` 永遠不能被呼叫。

### 修復
- 補回 `feedMyPet(uid)`
- 改成先建立 `window.FB`，不要被 `seedPets()` 或 bridge claim 卡住
- `seedPets()` 失敗不阻塞 UI
- `listPets()` 在 `pets` collection 空的時候會嘗試 seed；若 seed 也失敗，前端仍可顯示 seed fallback list

## 3. 已驗證

本地用 Playwright 開頁面驗證：

- `window.FB` 已建立
- console 出現 `[FB] phase3 ready`
- onboarding 選寵頁可看到 8 隻寵物卡：
  - 奶油貓
  - 布丁狗
  - 胖河馬
  - 泡泡魚
  - 點點獸
  - 圓滾雞
  - 六角龍
  - 豹豹

## 4. 新寵物擴充機制

目前寵物來源在 `vocab-review.html` module script 的 `SEED_PETS` 陣列。

位置大約：

```js
const SEED_PETS = [
  { id:'pet_001', type:'cat', name:'奶油貓', desc:'愛撒嬌的貓咪', img:'Claw_ENG/design_handoff/assets/newcha1.png' },
  ...
];
```

要新增寵物，只要：

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

## 5. 新寵物圖片規格

建議你製作角色時照這個規格：

- 檔名：`newcha9.png`, `newcha10.png`, ...
- 格式：PNG，透明背景
- 尺寸：建議 512×512 或至少 256×256
- 主體置中，四周留白 8–12%
- 不要做太細的線條，手機上會縮到約 56–100px 顯示
- 風格：跟現有 `newcha1~8.png` 一致，圓潤、可愛、低年級友善

## 6. 建議下一批新增寵物 id

目前已有 `pet_001` ~ `pet_008`。

下一批建議：

```js
{ id:'pet_009',  type:'rabbit',  name:'月亮兔', desc:'蹦蹦跳跳的月光小夥伴', img:'Claw_ENG/design_handoff/assets/newcha9.png' },
{ id:'pet_010',  type:'panda',   name:'湯圓熊', desc:'軟綿綿的黑白糰子', img:'Claw_ENG/design_handoff/assets/newcha10.png' },
{ id:'pet_011',  type:'fox',     name:'棉花狐', desc:'尾巴像雲一樣蓬鬆', img:'Claw_ENG/design_handoff/assets/newcha11.png' },
{ id:'pet_012',  type:'otter',   name:'河寶獺', desc:'抱著小石頭愛游泳', img:'Claw_ENG/design_handoff/assets/newcha12.png' },
```

## 7. 注意事項

- `seedPets()` 只會新增 Firestore 不存在的寵物。
- 如果 Firestore 已有 `pets/pet_009`，之後改 `SEED_PETS` 裡的 name/desc/img 不會自動覆蓋現有資料。
- 這是預期行為，避免覆蓋玩家改過的公開寵物名字。
- 如果要強制更新既有寵物圖片或描述，需要另做 admin/update 流程。

## 8. Firestore Rules

Task E 暫時跳過，等 Mark 進 Firebase Console 手動貼 rules。

目前程式已改用 Firebase client SDK + Anonymous Auth，不需要 Firebase CLI 才能跑 Phase 3 A/B/C/D。
