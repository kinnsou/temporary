# Handoff: ENG EPOP 單字複習遊戲

> ⚠️ 注意：本資料夾內的 `vocab-game.html` 是**設計原型**（Design Prototype），使用 React + Babel 直接在瀏覽器運行。
> Claude Code 的任務是**將此設計原型重新實作**為正式專案（建議使用 React + Vite 或 Next.js），
> 請勿直接複製 HTML 上線。設計稿可在本地用瀏覽器直接打開預覽。

---

## 📋 專案概述

**產品名稱：** ENG EPOP 單字複習遊戲  
**目標用戶：** 國小低年級學生（6–9歲）  
**設計風格：** EPOP App 遊戲化風格 — 鮮豔色彩、大圓角、動畫回饋、XP 系統  
**設計保真度：** ⭐⭐⭐⭐ 高保真 (Hi-Fi) — 像素精準，可直接參考顏色、間距、字重

---

## ⚠️ 最新更新（2026-04-23 加入）
新增「建立角色」Onboarding 流程 + 寵物專屬密碼系統，詳見下方「頁面 0」與「LocalStorage」章節。

---

## ⚠️ 最新更新（2026-04-23 加入）
新增「建立角色」Onboarding 流程 + 寵物專屬密碼系統，詳見下方「頁面 0」與「LocalStorage」章節。

---

## 🗂 資料夾結構

```
design_handoff/
├── README.md          ← 本文件（開發規格）
├── vocab-game.html    ← 可在瀏覽器打開的完整設計原型
└── assets/
    ├── newcha1.png    ← 奶油貓
    ├── newcha2.png    ← 布丁狗
    ├── newcha3.png    ← 胖河馬
    ├── newcha4.png    ← 泡泡魚
    ├── newcha5.png    ← 點點獸
    ├── newcha6.png    ← 圓滾雞
    ├── newcha7.png    ← 六角龍
    └── newcha8.png    ← 豹豹
```

---

## 🎨 Design Tokens

### 顏色
```js
const colors = {
  primary:      '#b87de8',   // 主色 — 可由用戶 Tweaks 動態更改
  correct:      '#4CAF82',   // 答對綠
  wrong:        '#FF4D6D',   // 答錯紅
  xpGold:       '#FFB800',   // XP 金色
  bg:           '#fdf6ff',   // 頁面背景漸層起點
  bgEnd:        '#f0fdf4',   // 頁面背景漸層終點
  surface:      '#ffffff',   // 卡片白
  textPrimary:  '#1a1a2e',   // 主要文字
  textMuted:    '#aaaaaa',   // 次要文字
  border:       '#f0eaea',   // 淡邊框
};

// 每個單字類別的配色
const categoryColors = {
  '動物': '#4CAF82',
  '食物': '#FF9800',
  '形容詞': '#a78bfa',
  '動作': '#38bdf8',
  '物品': '#fb7185',
};
```

### 字型
```css
font-family: 'Nunito', sans-serif;

/* 標題 */     font-size: 26px; font-weight: 900;
/* 副標題 */   font-size: 17px; font-weight: 800;
/* 單字大字 */ font-size: 32–36px; font-weight: 900; letter-spacing: 2px;
/* 按鈕 */     font-size: 16px; font-weight: 900;
/* 小字說明 */ font-size: 11–13px; font-weight: 700;
```

### 圓角 & 陰影
```css
/* 大卡片 */   border-radius: 24–28px;
/* 按鈕 */     border-radius: 18–20px;
/* 小標籤 */   border-radius: 12–16px;
/* 卡片陰影 */ box-shadow: 0 4px 20px rgba(0,0,0,0.07);
/* 主按鈕影 */ box-shadow: 0 5px 18px {primary}44;
```

### 動畫
```css
@keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }
@keyframes pop      { from{transform:scale(0.93)} to{transform:scale(1)} }
@keyframes slideUp  { from{transform:translateY(14px);opacity:0} to{transform:translateY(0);opacity:1} }
@keyframes shake    { 0%,100%{translateX(0)} 25%{translateX(-7px)} 75%{translateX(7px)} }
@keyframes confettiFall { ... } /* 彩帶撒落 */
@keyframes xpRise   { ... }    /* XP 數字飄起 */
```

---

## 📱 頁面清單

### 0. 建立角色 Onboarding（首次進入）
**路由：** `/onboarding`（如無 profile → 自動導向）

**三步驟流程：**

#### Step 1 — 輸入姓名
- 大標題「歡迎來到 ENG EPOP！」+ 角色圖浮動
- 文字輸入框（最多 10 字），placeholder：「輸入你的名字…」
- 驗證：空白 → 錯誤提示；超過 10 字 → 錯誤提示
- 「下一步 →」按鈕（primary 漸層，未輸入時 opacity 0.5）

#### Step 2 — 選寵物
- 標題：「選一隻寵物，{name}！」
- 副標：「🔒 已被其他同學認養的需要密碼」
- 3 欄網格顯示 8 隻角色：
  - **空閒的**：白色卡，點擊即選中（✓ badge）
  - **已認養（別人的）**：灰階 + 🔒 右上角 + 顯示「XXX 的」小字 → 點擊彈出密碼 Modal
  - **自己的**（重新登入）：綠色 ✓ badge
- 「確認，這是我的寵物！🐾」按鈕（未選時 opacity 0.4）

#### Step 2b — 密碼 Modal
- 彈出覆蓋層（黑色半透明背景）
- 顯示角色圖 + 擁有者名稱
- 6碼密碼輸入框（monospace，自動大寫）
- 錯誤時顯示紅色提示
- 正確 → 換手認養，產生新密碼進入 Step 3

#### Step 3 — 顯示專屬密碼
- 角色圖（浮動）+ 「{name}，你的寵物是 {角色名} 🎉」
- 密碼卡片（monospace 大字，letter-spacing: 6px，primary 色背景 12%）
- 說明文字：「這隻寵物屬於你了！如果別人想認養同一隻，需要輸入這組密碼才行 🔒」
- 「我記住了，開始學習！→」按鈕
- 頁面撒彩帶 🎊

**密碼產生規則：**
```ts
// 6 碼大寫英數，排除易混淆字元 0/O/1/I
const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const password = Array.from({length: 6}, () =>
  chars[Math.floor(Math.random() * chars.length)]
).join('');
```

---

### 0b. 寵物認養系統（ClaimSystem）

**核心資料結構：**
```ts
interface Claim {
  name: string;      // 認養人姓名
  password: string;  // 6碼密碼
}
type ClaimsMap = Record<string, Claim>; // key = character id (e.g. 'newcha1')

interface UserProfile {
  name: string;      // 學生姓名
  charIdx: number;   // 選中的角色 index
  password: string;  // 自己的密碼
}
```

**認養規則：**
1. 空閒寵物 → 直接選取，產生新密碼，寫入 claims
2. 已認養寵物（別人的）→ 彈出密碼 Modal
3. 密碼正確 → 換手：舊記錄覆蓋，新認養記錄寫入，產生新密碼
4. 已認養寵物（自己的）→ 直接選取，不重新產生密碼

**重要提醒：** 目前設計為單裝置 localStorage 儲存（教室共用一台設備情境）。
若部署為多裝置使用，需改為後端 API 儲存 ClaimsMap。

---

### 1. 首頁 (Home)
**路由：** `/` 或 `/home`

**版面：**
- 上：問候語（「你好！同學 👋」）+ 日期 + 右上角角色頭像按鈕（點擊→選角色）
- 統計列：3個白色卡片並排 → 🔥連續天數、⭐XP 經驗、🏆最高分
- 角色卡片：白色圓角卡，左邊角色圖（浮動動畫），右邊文字「今天的夥伴 / [角色名] / 一起來複習單字吧！」
- 本週進度條：5格週一到週五打勾
- 今日單字：漸層色塊卡（`primary` 色漸層），顯示 TODAY'S WORD + 英文 + 中文
- 底部快捷列：3個按鈕（📖單字卡、🎮開始測驗、🏆排行榜）
- 底部導航 (BottomNav)

**State：**
```ts
interface Stats {
  streak: number;      // 連續天數
  xp: number;         // 累積 XP
  best: number;       // 測驗最高分
  weekPlayed: number; // 本週練習天數 (0–5)
}
```

---

### 2. 選角色 (CharacterSelect)
**路由：** `/character`  
**進入方式：** 點首頁右上角頭像

**版面：**
- 標題列：← 返回 + 「選擇角色」
- 副標題：「選一個陪你學習的夥伴吧！」
- 3欄網格，每格是角色卡：
  - 選中：彩色邊框 + 右上角 ✓ 圓形 badge
  - 未選：白色卡片、淡灰邊框
  - 每格：角色圖 60×60 + 名稱（bold）+ 描述（小字）
- 底部「確認選擇 ✓」按鈕（primary 漸層色）

**8個角色清單：**
```ts
const CHARACTERS = [
  { id: 'newcha1', img: 'assets/newcha1.png', name: '奶油貓', desc: '愛撒嬌的貓咪' },
  { id: 'newcha2', img: 'assets/newcha2.png', name: '布丁狗', desc: '忠心的好夥伴' },
  { id: 'newcha3', img: 'assets/newcha3.png', name: '胖河馬', desc: '萌萌的大塊頭' },
  { id: 'newcha4', img: 'assets/newcha4.png', name: '泡泡魚', desc: '藍藍的海洋寶' },
  { id: 'newcha5', img: 'assets/newcha5.png', name: '點點獸', desc: '斑點小可愛'   },
  { id: 'newcha6', img: 'assets/newcha6.png', name: '圓滾雞', desc: '圓圓愛學習'   },
  { id: 'newcha7', img: 'assets/newcha7.png', name: '六角龍', desc: '粉紅小精靈'   },
  { id: 'newcha8', img: 'assets/newcha8.png', name: '豹豹',   desc: '威風的小獵豹' },
];
```

**LocalStorage：** 選擇的角色 index 存入 `epopChar`

---

### 3. 單字卡模式 (Flashcard)
**路由：** `/flash`

**版面：**
- 頂部：← 返回 + 標題「📖 單字卡」 + 右側 「X/總數」 進度
- 進度條：primary 色漸層，寬度 = (idx+1)/total × 100%
- 進度說明：「✅ 已記住 N 個 ｜ 剩餘 M 個」
- **翻牌卡片**（點擊翻面）：
  - 正面：類別標籤（小字）+ 視覺圖（emoji 或彩色提示卡）+ 英文單字（大字）+ 「👆 點擊看中文」
  - 背面：視覺圖 + 中文（primary 色大字）+ 英文（灰色小字）
  - 卡頂有 4px primary 色漸層條
- 角色圖（浮動動畫）在卡片下方
- 底部 3 個按鈕：← 上一張 ｜ ✅ 我會了（標記已知）｜ 下一張 →

**單字視覺顯示規則：**
```ts
// 有 visual 欄位 → 顯示大 emoji
// visual 為 null → 顯示彩色提示卡（背景=類別色 22% opacity，顯示 hint 文字）
function WordVisual({ vocab, size }) {
  if (vocab.visual) return <span className="emoji">{vocab.visual}</span>;
  return (
    <div className="hint-card" style={{ background: categoryColor + '22' }}>
      <span className="category">{vocab.category}</span>
      <span className="hint">{vocab.hint || vocab.zh}</span>
    </div>
  );
}
```

---

### 4. 測驗模式 (Quiz)
**路由：** `/quiz`

**規則：**
- 從 40 個單字隨機抽 10 題
- 每題 4 個選項（1 個正確 + 3 個干擾項），中文選英文
- 3 條生命值（❤️ × 3），答錯扣 1 顆
- 生命歸零 → 遊戲結束
- 連續答對計 Combo（combo × 3 額外 XP）

**計分：**
```ts
const baseXP = 10;
const comboBonus = combo * 3;  // 連擊加成
const gainedXP = baseXP + comboBonus;
```

**版面：**
- 頂部：❤️❤️❤️ + 進度條 + X/10
- Combo 提示：「🔥 連續答對 N 題！」（出現於 combo ≥ 2）
- 角色圖（小，58×58，浮動）
- 問題卡（白色圓角）：
  - 提示文字「這個英文單字是什麼意思？」
  - WordVisual 組件
  - 英文單字（大字，letter-spacing: 2px）
  - 類別 badge（類別色背景）
- 4 個選項按鈕（直排）：
  - 未選：白色背景
  - 答對：`#4CAF82` 綠色 + ✓
  - 答錯：`#FF4D6D` 紅色 + ✗
  - 其他選項：opacity 0.45
- 選完後 1.1 秒自動跳下題
- 底部：「⭐ N XP 已獲得」小字

**動畫效果：**
- 答對 → 彩帶撒落（Confetti）+ XP 數字從中央飄起並消失
- 答錯 → 問題卡左右搖晃（shake 動畫）
- 進題 → 選項按鈕 slideUp 進場（0.04s 間隔依序）

**底部導航 BottomNav**

---

### 5. 排行榜 (Leaderboard)
**路由：** `/rank`

**版面：**
- 頂部標題「🏆 排行榜」
- Tab 切換：「本週排名 ｜ 全部排名」
- **頒獎台（Top 3）：**
  - 排列：第2名（左）、第1名（中，最高）、第3名（右）
  - 每位：角色圖 + 名字 + 分數 + 金/銀/銅色台座
  - 台座高度：120px（1st）、100px（2nd）、90px（3rd）
- **排名列表（第4名以後）：**
  - 每列：名次 ｜ 角色圖 38×38 ｜ 名字 + XP ｜ 分數
  - 「你」的那列：primary 色背景 10% + 加粗 + 有色邊框

**Demo 資料（後端未接通前使用）：**
```ts
const DEMO_RANKS = [
  { name: 'Emily',  score: 98, xp: 1240, charIdx: 0 },
  { name: 'Kevin',  score: 95, xp: 1180, charIdx: 2 },
  { name: 'Sophia', score: 92, xp: 1100, charIdx: 4 },
  // ... 共 10 筆
];
// 將目前用戶（name:'你', score: stats.best, xp: stats.xp）合併排序後顯示
```

**底部導航 BottomNav**

---

### 6. 結果頁 (Result)
**路由：** `/result`（或 Modal 覆蓋）

**版面（滾動）：**
- 角色圖（浮動）+ 評語大字 + 副標（角色說話）
- 評分卡：
  - 圓形分數圈（primary 漸層，顯示 % 正確率）
  - 3格統計：✅答對題數 ｜ ⭐XP獲得 ｜ 🎯等級
  - 等級規則：正確率 ≥ 80% → S 🌟 ｜ ≥ 50% → B 👍 ｜ 其他 → C 💪
- 鼓勵文字卡（primary 10% 背景）
- 按鈕：「🔄 再玩一次」（primary）+ 「🏠 回首頁」（白色）
- 正確率 ≥ 80% → 頁面頂部撒彩帶

---

### 7. 底部導航 (BottomNav)
**出現於：** 首頁、單字卡、測驗、排行榜

```ts
const tabs = [
  { id: 'home',  icon: '🏠', label: '首頁'  },
  { id: 'flash', icon: '📖', label: '單字卡' },
  { id: 'quiz',  icon: '🎮', label: '測驗'  },
  { id: 'rank',  icon: '🏆', label: '排行榜' },
];
```

- 選中 tab：primary 色文字 + 底部 18px 寬 3px 高圓角指示線
- 未選：`#cccccc`

---

## 📦 單字資料庫

共 40 個單字，分 5 類。完整資料在 `vocab-game.html` 的 `VOCAB` 陣列中。

```ts
interface VocabItem {
  word: string;       // 英文
  zh: string;         // 中文
  visual: string | null; // emoji，null = 用 hint card 顯示
  hint?: string;      // 給 hint card 的中文提示（abstract words）
  category: '動物' | '食物' | '形容詞' | '動作' | '物品';
}
```

**無 emoji 的單字（顯示彩色提示卡）：**
- `happy` → 「開心、笑咪咪」
- `sad` → 「心情不好、想哭」
- `big` → 「非常非常大！」
- `small` → 「小小小的一點」

---

## 💾 LocalStorage

| Key | 型別 | 說明 |
|-----|------|------|
| `epopProfile` | `JSON string` | `{ name, charIdx, password }` 當前用戶資料 |
| `epopClaims` | `JSON string` | `{ [charId]: { name, password } }` 全部認養記錄 |
| `epopStats2` | `JSON string` | `{ streak, xp, best, weekPlayed }` 遊戲統計 |

**流程邏輯：**
```ts
// App 啟動時
const profile = JSON.parse(localStorage.getItem('epopProfile'));
if (!profile) {
  // → 導向 Onboarding
} else {
  // → 直接進首頁，用 profile.name 顯示問候語
}
```

---

## 🔧 建議技術架構

```
React + Vite (或 Next.js App Router)
├── src/
│   ├── components/
│   │   ├── BottomNav.tsx
│   │   ├── Confetti.tsx
│   │   ├── WordVisual.tsx
│   │   └── CharacterImg.tsx
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── CharSelectScreen.tsx
│   │   ├── FlashScreen.tsx
│   │   ├── QuizScreen.tsx
│   │   ├── ResultScreen.tsx
│   │   └── RankScreen.tsx
│   ├── data/
│   │   ├── vocab.ts        ← VOCAB 資料
│   │   └── characters.ts   ← CHARACTERS 資料
│   ├── hooks/
│   │   └── useStats.ts     ← localStorage 讀寫
│   └── constants/
│       └── tokens.ts       ← 顏色、字型 design tokens
└── public/
    └── assets/             ← 8 個角色 PNG
```

---

## 🚀 Claude Code 任務指令（可直接貼入）

```
請根據 design_handoff/ 資料夾內的設計原型，實作 ENG EPOP 英語單字複習遊戲。

設計原型：design_handoff/vocab-game.html（可用瀏覽器打開預覽）
角色圖片：design_handoff/assets/newcha1.png ~ newcha8.png
開發規格：design_handoff/README.md

技術要求：
- React + Vite（TypeScript）
- React Router v6 做頁面導航
- Nunito 字型（Google Fonts）
- 不需要後端，資料全部 hardcode 在前端
- LocalStorage 儲存角色選擇與遊戲統計
- 請完全依照 README.md 的設計規格實作，包含顏色、圓角、動畫

請先建立專案結構，然後依序實作各頁面。
```

---

## 📞 設計聯絡

設計原型製作於 Claude (Opus) 設計工具。  
如有任何設計疑問或需要新版原型，請回到原始設計對話修改。
