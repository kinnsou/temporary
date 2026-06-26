# 🔍 設計審計報告 v2 — ENG EPOP
> 審計日期：2026-04-24  
> 比較：設計原型 `vocab-game.html` vs 部署版 `https://kinnsou.github.io/temporary/vocab-review.html`

---

## 🚨 P0 緊急修復

### 1. 頁面卡在「載入中…」
**原因：** 程式嘗試 fetch 外部 API，但資料全部應為 hardcode。  
**修復：**
```ts
// ❌ 不要這樣
useEffect(() => { fetch('/api/vocab').then(...) }, []);

// ✅ 正確做法 — 直接 import 靜態資料
import { DAILY_SETS } from './data/dailySets';
import { CHARACTERS } from './data/characters';
```

---

## 🎨 P1 視覺修復

### 2. 字型未載入
```html
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
```
```css
body, * { font-family: 'Nunito', sans-serif; }
```

### 3. 主色調 Design Tokens
```ts
const theme = {
  primary:     '#61c2ff',   // 用戶可在 Tweaks 調整
  correct:     '#4CAF82',
  wrong:       '#FF4D6D',
  xpGold:      '#FFB800',
  bg:          'linear-gradient(170deg, #fafeff 0%, #f0fdf8 100%)',
  surface:     '#ffffff',
  textPrimary: '#1a1a2e',
  textMuted:   '#aaaaaa',
  border:      '#f0eaea',
};
const CAT_COLORS = {
  '動物': '#4CAF82', '食物': '#FF9800', '形容詞': '#a78bfa',
  '動作': '#38bdf8', '物品': '#fb7185',
};
```

---

## 📐 P1 版面與功能修復

### 4. 首頁版面（完整規格）

**版面由上到下：**
```
1. 問候語「你好！{name} 👋」+ 日期  +  右上角角色頭像（點擊→換角色）
2. 3格統計列（白色卡）：🔥連續天數 | 📊平均分數% | 🏆最高分/20
3. 📅 今日新單字（3張彩色卡，可點擊展開例句）
4. 今天的夥伴卡片（角色圖 + 名字 + 開始按鈕）
5. 底部快捷按鈕：[📖單字卡 N個] [🎮開始測驗] [🏆排行榜]
6. BottomNav（4個頁籤）
```

**今日新單字卡片規格：**
```tsx
// 3張卡各有不同底色（橘/藍/紫輪替）
// 點擊展開例句
<DailyWordCard
  word="star"
  zh="星星"
  visual="⭐"          // emoji 或 null（null 時顯示提示文字卡）
  exampleEN="I can see many stars at night."
  exampleZH="我晚上可以看到很多星星。"
  accentColor="#FF9800"
/>

// 例句文字規格：
// 英文例句：fontSize 15px, color #333, fontStyle italic
// 中文例句：fontSize 13px, color #777
```

---

### 5. 今日單字系統（核心邏輯）

```ts
// 每天發 3 個新單字，含例句
interface DailyWord {
  word: string;
  zh: string;
  visual: string | null;   // emoji；null = 顯示提示卡
  hint?: string;           // visual=null 時顯示
  cat: string;             // 分類
  en: string;              // 英文例句
  zh2: string;             // 中文例句
  date: string;            // YYYY-MM-DD
}

// 今日單字 = 當天日期對應的 3 個
const todayWords = DAILY_SETS.find(s => s.date === today)?.words ?? [];

// 單字卡池 = 今天以前所有日期的單字（今天的明天才進去）
const flashPool = DAILY_SETS
  .filter(s => s.date < today)
  .flatMap(s => s.words);

// 測驗池 = 同 flashPool（只考已學過的）
const quizPool = flashPool.length >= 4 ? flashPool : DAILY_SETS.flatMap(s => s.words);
```

**單字視覺顯示組件（WordVisual）：**
```tsx
function WordVisual({ vocab, size = 48 }) {
  const catColor = CAT_COLORS[vocab.cat] ?? '#94a3b8';
  if (vocab.visual) {
    return <span style={{ fontSize: size }}>{vocab.visual}</span>;
  }
  // 抽象詞 → 彩色提示卡
  return (
    <div style={{
      background: catColor + '22',
      border: `2px dashed ${catColor}66`,
      borderRadius: 14, padding: '8px 14px',
    }}>
      <div style={{ fontSize: 10, color: catColor }}>{vocab.cat}</div>
      <div style={{ fontSize: 14, fontWeight: 900, color: catColor }}>
        {vocab.hint ?? vocab.zh}
      </div>
    </div>
  );
}
```

---

### 6. 單字卡模式（Flashcard）

**規格：**
- 只顯示 flashPool（今天以前學過的單字）
- 若 flashPool 為空 → 顯示空狀態：「今日新單字明天才會加入！」
- 翻到背面時顯示例句
- 例句字型：**fontSize 13px, color #555**
- 「✅ 我會了」僅標記當次 session，不影響下次出現頻率（目前無後端）

**卡片背面規格：**
```tsx
// 背面顯示
<div style={{ fontSize: 30, fontWeight: 900, color: primary }}>{card.zh}</div>
<div style={{ fontSize: 14, color: '#aaa', fontStyle: 'italic' }}>{card.word}</div>
{card.en && (
  <div style={{
    fontSize: 13, color: '#555',        // ← 13px #555
    fontStyle: 'italic', lineHeight: 1.6,
    borderTop: '1px dashed #f0eaea',
    paddingTop: 8, marginTop: 4,
  }}>
    "{card.en}"
  </div>
)}
```

---

### 7. 測驗模式（Quiz）

**重要：無生命值系統！**
```
❌ 移除：❤️❤️❤️ 生命值
✅ 改為：答完 20 題後結算
✅ 進度顯示：1/20, 2/20 … 20/20
✅ 答完全部 20 題才結束（不會中途結束）
```

**規格：**
- 題數：20 題（或 quizPool 長度取較小值）
- 進度條：`(idx / TOTAL) * 100%` 寬度
- 無生命值，答錯只是搖晃動畫，繼續答題
- 連擊系統保留（combo ≥ 2 顯示🔥提示）
- XP：基礎 10 + combo × 3

---

### 8. 排行榜（Leaderboard）

**頒獎台順序（重要！）：**
```
左邊 = 第 2 名（銀牌 🥈）
中間 = 第 1 名（金牌 🥇）← 最高台
右邊 = 第 3 名（銅牌 🥉）
```

**台座高度：**
```ts
const PODIUM_H = [100, 148, 96]; // [左/2nd, 中/1st, 右/3rd]
const PODIUM_C = ['#C0C0C0', '#FFD700', '#CD7F32']; // 銀、金、銅
```

**分數顯示：** 答對題數（例：`9 分`，不是百分比）

---

## 💾 LocalStorage Keys

| Key | 型別 | 說明 |
|-----|------|------|
| `epopProfile` | JSON | `{ name, charIdx, password }` |
| `epopClaims` | JSON | `{ [charId]: { name, password } }` 寵物認養 |
| `epopStats3` | JSON | `{ streak, avgScore, best, totalGames }` |

**統計更新邏輯：**
```ts
// 每次測驗完後更新
const newAvg = Math.round(
  (stats.avgScore * stats.totalGames + Math.round(score / total * 100))
  / (stats.totalGames + 1)
);
```

---

## 🔧 建議專案結構

```
src/
├── data/
│   ├── dailySets.ts      ← DAILY_SETS（每天3個單字+例句）
│   └── characters.ts     ← CHARACTERS（8隻角色）
├── components/
│   ├── WordVisual.tsx
│   ├── Confetti.tsx
│   └── BottomNav.tsx
├── screens/
│   ├── OnboardingScreen.tsx   （3步驟：姓名→選寵物→顯示密碼）
│   ├── HomeScreen.tsx
│   ├── CharSelectScreen.tsx
│   ├── FlashScreen.tsx
│   ├── QuizScreen.tsx
│   ├── ResultScreen.tsx
│   └── RankScreen.tsx
├── hooks/
│   └── useStats.ts       ← localStorage 讀寫
└── constants/
    └── tokens.ts         ← 顏色 design tokens
```

---

## 🚀 Claude Code 任務指令（可直接貼入）

```
請根據 design_handoff/ 資料夾內的設計原型，修正並實作 ENG EPOP 英語單字複習遊戲。

設計原型：design_handoff/vocab-game.html（可用瀏覽器打開預覽）
角色圖片：design_handoff/assets/newcha1.png ~ newcha8.png
審計報告：design_handoff/AUDIT_REPORT.md（本文件，列出所有要修正的問題）

最高優先修復：
1. 移除所有 API fetch，改為 hardcode 靜態資料（參考 AUDIT_REPORT 第1項）
2. 載入 Nunito 字型
3. 測驗改為 20 題全部答完才結算，移除生命值❤️
4. 首頁加入「今日新單字」3張卡（含例句展開功能）
5. 排行榜頒獎台：左銀右銅中金

技術需求：React + Vite（TypeScript）、React Router v6、無後端。
```

---

*設計原型製作於 Claude 設計工具。如有疑問請回到設計對話修改原型。*
