# OpenClaw Firebase 寵物養成 MVP 施工文件

版本：MVP-FeedPet-001  
目標：先快速上線寵物養成、餵食、HP、EXP、飼料功能。  
原則：目前玩家都是認識的人與小學生，暫時不做嚴格防作弊、不做 Cloud Functions、不做 Admin SDK。先用 Firebase Client SDK + Firestore + Anonymous Auth 完成。

---

## 0. 前提狀態

人類端已完成或需確認：

1. Firebase Project 已建立。
2. Firestore 已啟用。
   - 如果排行榜功能已經能寫入 / 讀取 Firestore，代表 Firestore 多半已經啟用。
3. Authentication 已啟用 Anonymous 匿名登入。
4. OpenClaw 已取得 Firebase Web Config / API Key。
5. 本次不做 Cloud Functions。
6. 本次不處理防駭、防偷改、防刷分，目標是快點讓小朋友能玩、能養、能餵。

---

## 1. MVP 功能範圍

請完成以下功能：

1. 玩家匿名登入。
2. 第一次進入時建立 `users/{uid}`。
3. 預設建立 8 隻公共寵物於 `pets` collection。
4. 玩家同時間只能持有 1 隻寵物。
5. 寵物有 HP，最高 100。
6. 寵物每經過 1 小時 HP -1。
7. HP 歸零後，該寵物變黑白，狀態改為 `disabled`，不可選。
8. 每答對題目獲得 EXP。
9. 每累計 200 EXP 產生 1 個飼料。
10. 玩家帳號持有飼料數量 `foodCount`。
11. 使用飼料餵目前寵物，HP +50，上限 100，超過部分消失。
12. 寵物可以重新命名。
13. 玩家換寵物時，原寵物釋放回公共池；如果原寵物 HP 已歸零，則改成 `disabled`。
14. 餵食成功後，前端顯示可愛反饋圖片與文字。

---

## 2. Firestore Collection 設計

只需要兩個核心 collection：

```txt
users
pets
```

---

## 3. users/{uid} 結構

建立玩家資料：

```json
{
  "name": "匿名玩家",
  "currentPetId": null,
  "exp": 0,
  "combo": 0,
  "foodCount": 0,
  "totalCorrect": 0,
  "createdAt": 1745568000000,
  "updatedAt": 1745568000000
}
```

### 欄位說明

| 欄位 | 用途 |
|---|---|
| `name` | 玩家名稱 |
| `currentPetId` | 目前持有的寵物 ID |
| `exp` | 目前累積 EXP，滿 200 後換飼料，保留餘數 |
| `combo` | 連續答對數 |
| `foodCount` | 飼料持有數量 |
| `totalCorrect` | 累計答對題數 |
| `createdAt` | 建立時間，使用 `Date.now()` |
| `updatedAt` | 更新時間，使用 `Date.now()` |

---

## 4. pets/{petId} 結構

每一隻公共寵物：

```json
{
  "type": "cat",
  "name": "小白貓",
  "ownerUid": null,
  "status": "available",
  "hp": 100,
  "lastHpUpdate": 1745568000000,
  "normalImage": "/images/pets/cat_normal.png",
  "feedImage": "/images/pets/cat_feed.png",
  "fullImage": "/images/pets/cat_full.png",
  "grayImage": "/images/pets/cat_gray.png",
  "createdAt": 1745568000000,
  "updatedAt": 1745568000000
}
```

### status 狀態

```txt
available = 可選
owned     = 已被玩家持有
disabled  = HP 歸零，黑白禁用
```

### 8 隻初始寵物建議

```txt
pet_001 cat
pet_002 dog
pet_003 bird
pet_004 fish
pet_005 hippo
pet_006 cheetah
pet_007 salamander
pet_008 axolotl
```

初始值：

```json
{
  "ownerUid": null,
  "status": "available",
  "hp": 100,
  "lastHpUpdate": Date.now()
}
```

---

## 5. HP 計算規則

不要每小時真的去更新資料庫。

每次顯示寵物、餵食、換寵物、選寵物前，才計算一次目前 HP。

```js
function calcCurrentHp(pet) {
  const now = Date.now();
  const last = pet.lastHpUpdate || now;
  const passedHours = Math.floor((now - last) / 3600000);
  const currentHp = Math.max(0, (pet.hp || 0) - passedHours);
  return currentHp;
}
```

如果 `currentHp <= 0`：

```js
{
  hp: 0,
  status: "disabled",
  ownerUid: null,
  lastHpUpdate: Date.now(),
  updatedAt: Date.now()
}
```

前端顯示：

```txt
黑白圖片 grayImage
不可選
不可餵
不可成為新寵物
```

---

## 6. 初始化玩家

函式名稱：

```txt
ensureUserProfile()
```

流程：

1. 呼叫 Firebase Anonymous Auth。
2. 取得 `uid`。
3. 檢查 `users/{uid}` 是否存在。
4. 如果不存在，建立：

```json
{
  "name": "匿名玩家",
  "currentPetId": null,
  "exp": 0,
  "combo": 0,
  "foodCount": 0,
  "totalCorrect": 0,
  "createdAt": Date.now(),
  "updatedAt": Date.now()
}
```

---

## 7. 選擇寵物

函式名稱：

```txt
claimPet(petId)
```

流程：

1. 取得目前登入玩家 uid。
2. 讀取 `users/{uid}`。
3. 如果 `users.currentPetId` 已存在，先導向 `switchPet(newPetId)`。
4. 讀取 `pets/{petId}`。
5. 先計算 pet 目前 HP。
6. 如果 HP <= 0：
   - 更新 pet 為 `disabled`
   - 回傳「這隻寵物已經餓壞了，不能選」
7. 如果 pet.status 不是 `available`：
   - 回傳「這隻已經被其他人帶走」
8. 更新 `pets/{petId}`：

```json
{
  "ownerUid": uid,
  "status": "owned",
  "hp": currentHp,
  "lastHpUpdate": Date.now(),
  "updatedAt": Date.now()
}
```

9. 更新 `users/{uid}`：

```json
{
  "currentPetId": petId,
  "updatedAt": Date.now()
}
```

---

## 8. 切換寵物

函式名稱：

```txt
switchPet(newPetId)
```

流程：

1. 取得 uid。
2. 讀取 `users/{uid}`。
3. 取得 `oldPetId = users.currentPetId`。
4. 如果有 oldPetId：
   - 讀取舊寵物。
   - 計算舊寵物目前 HP。
   - 如果舊寵物 HP <= 0：
     ```json
     {
       "ownerUid": null,
       "status": "disabled",
       "hp": 0,
       "lastHpUpdate": Date.now(),
       "updatedAt": Date.now()
     }
     ```
   - 否則：
     ```json
     {
       "ownerUid": null,
       "status": "available",
       "hp": currentHp,
       "lastHpUpdate": Date.now(),
       "updatedAt": Date.now()
     }
     ```
5. 讀取新寵物。
6. 計算新寵物目前 HP。
7. 若新寵物 HP <= 0 或 status 為 `disabled`，禁止切換。
8. 若新寵物 status 不是 `available`，禁止切換。
9. 將新寵物更新為：

```json
{
  "ownerUid": uid,
  "status": "owned",
  "hp": currentHp,
  "lastHpUpdate": Date.now(),
  "updatedAt": Date.now()
}
```

10. 更新 user：

```json
{
  "currentPetId": newPetId,
  "updatedAt": Date.now()
}
```

---

## 9. 答對題目取得 EXP 與飼料

函式名稱：

```txt
answerCorrect()
```

### 基礎規則

```txt
答對一題：+10 EXP
每累積 200 EXP：foodCount +1
EXP 保留餘數
```

如果已有 combo bonus，沿用現有邏輯。

範例：

```js
function calcExpGain(combo) {
  const base = 10;

  // 簡單加成，可自行替換成現有規則
  if (combo >= 10) return base + 20;
  if (combo >= 5) return base + 10;
  if (combo >= 3) return base + 5;

  return base;
}
```

更新流程：

```js
const gainExp = calcExpGain(user.combo);
const totalExp = user.exp + gainExp;
const addFood = Math.floor(totalExp / 200);
const remainExp = totalExp % 200;

update users/{uid}:
{
  exp: remainExp,
  combo: user.combo + 1,
  foodCount: user.foodCount + addFood,
  totalCorrect: user.totalCorrect + 1,
  updatedAt: Date.now()
}
```

### 飼料獲得提示

如果 `addFood > 0`，前端顯示：

```txt
獲得飼料 x{addFood}！
你的寵物又有東西吃了！
```

---

## 10. 答錯題目

函式名稱：

```txt
answerWrong()
```

簡單版：

```json
{
  "combo": 0,
  "updatedAt": Date.now()
}
```

---

## 11. 餵食

函式名稱：

```txt
feedMyPet()
```

流程：

1. 取得 uid。
2. 讀取 `users/{uid}`。
3. 確認 `foodCount > 0`。
4. 確認 `currentPetId` 存在。
5. 讀取 `pets/{currentPetId}`。
6. 確認 `pet.ownerUid == uid`。
7. 計算目前 HP。
8. 如果 HP <= 0：
   - 回傳「牠已經餓到不能餵了」
   - 可選：改為 disabled
9. 計算：

```js
const newHp = Math.min(100, currentHp + 50);
const newFoodCount = user.foodCount - 1;
```

10. 更新 `pets/{petId}`：

```json
{
  "hp": newHp,
  "status": "owned",
  "lastHpUpdate": Date.now(),
  "updatedAt": Date.now()
}
```

11. 更新 `users/{uid}`：

```json
{
  "foodCount": newFoodCount,
  "updatedAt": Date.now()
}
```

12. 回傳餵食結果：

```json
{
  "ok": true,
  "newHp": 100,
  "foodCount": 2,
  "message": "寵物開心地吃掉飼料！"
}
```

---

## 12. 餵食 UI 反饋

餵食成功後，顯示圖片：

```txt
如果 newHp >= 100：使用 fullImage
如果 newHp < 100：使用 feedImage
```

文字建議：

```txt
{name} 大口吃掉了飼料！
{name} 看起來精神好多了！
{name} 開心地跳了起來！
{name} 吃飽飽，眼睛都亮了！
```

HP 滿時：

```txt
{name} 已經吃飽飽了，HP 回滿！
```

如果沒有飼料：

```txt
你沒有飼料了，再答對一些題目吧！
```

---

## 13. 重新命名

函式名稱：

```txt
renameMyPet(newName)
```

流程：

1. 取得 uid。
2. 讀取 `users/{uid}.currentPetId`。
3. 讀取寵物。
4. 確認 `ownerUid == uid`。
5. 簡單檢查：
   - 不可空白
   - 最多 12 個中文字或 24 個英數字
6. 更新：

```json
{
  "name": newName,
  "updatedAt": Date.now()
}
```

備註：

這個名字會保留在公共寵物上。玩家換寵物後，下一個人看到的是前人取過的名字，這是預期玩法。

---

## 14. 取得可選寵物清單

函式名稱：

```txt
getPetList()
```

流程：

1. 讀取全部 `pets`。
2. 對每隻寵物計算目前 HP。
3. 若 HP <= 0：
   - 顯示黑白
   - 可順手更新 status = disabled
4. 分類顯示：
   - available：可選
   - owned：被別人持有，不可選
   - disabled：黑白，不可選

---

## 15. 最簡 Firestore Rules

目前不防作弊，但至少不要完全裸奔到無登入也能亂寫。

可先使用：

```js
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

    match /leaderboards/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

備註：

這不是正式安全版，只是 MVP 版。  
之後如果要公開給陌生人，再改成 Cloud Functions / 更嚴格 rules。

---

## 16. 不要做的事

本階段不要做：

1. 不要 Cloud Functions。
2. 不要 Admin SDK。
3. 不要複雜權限。
4. 不要真的每小時掃資料庫扣 HP。
5. 不要 deleteDoc 刪寵物。
6. 不要硬刪玩家。
7. 不要把資料庫設計複雜化。

---

## 17. 本階段完成標準

完成後，玩家應該可以：

1. 匿名進入遊戲。
2. 看到 8 隻寵物。
3. 選一隻寵物。
4. 看到寵物 HP。
5. 答題累積 EXP。
6. 每 200 EXP 自動增加 1 個飼料。
7. 按下餵食後，飼料 -1，寵物 HP +50。
8. 看到可愛餵食圖片。
9. 幫寵物改名。
10. 換寵物時，舊寵物回到池子。
11. HP 歸零的寵物變黑白且不可選。
