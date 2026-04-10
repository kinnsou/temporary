---
name: sanjian-theory
description: Long-term working memory and workflow for Mark's 三尖理論 / 三尖新理論 and the 2026-04-09 unified quant strategy. Use when analyzing, coding, backtesting, debugging, or explaining Double Mikiri (燕返/彈切/見切成功), emperor/general/ghost/sovereignty logic, 3+1b+2, 核心鍊, t2, 斷鍊, chain counting, BattleState, Campaign/Sortie, or when translating the legacy worldview into a no-lookahead quantitative runner.
---

# 三尖理論工作規範

先記住三件事：

1. **`references/core-rules.md` 是目前最精簡的主幹。**
   - 它以 `trispike_unified_core_strategy_v0_1_2026-04-09.md` 為骨架。
   - 舊理論不是丟掉，而是只保留能支撐 04-09 主幹的部分。

2. **原版世界觀仍然有效。**
   - 皇帝 / 將軍 / Ghost / 主權 / 見切螺旋，不是裝飾語言。
   - 04-09 是把這套世界觀壓縮成更適合量化與協作開發的骨架。

3. **先學會描述場上位置，再寫交易引擎。**
   - BattleState、鍊數、見切審計、Campaign/Sortie，要先於 entry/exit engine 穩定。

## 讀取順序

### 一律先讀
- `references/core-rules.md`
- `references/worldview-sovereignty.md`

### 視任務再讀
- 討論 **燕返 / 彈切 / 見切成功 / 三尖點 / Double Mikiri** → `references/double-mikiri.md`
- 討論 **幾鍊、斷鍊、3鍊/6鍊、mixed handoff、Campaign/Sortie、BattleState** → `references/chain-and-campaign.md`
- 討論 **t2、核心鍊、ABC、下半弧健康度** → `references/t2-and-abc.md`
- 討論 **斷鍊定義、何時才有資格封段** → `references/chain-break.md`
- 討論 **週期職責、8H/2H/30m/5m 或其他比例映射** → `references/timeframe-roles.md`
- 寫 **runner / detector / backtest / 狀態機 / 審計欄位** → `references/coding-notes.md`
- 比對 **v10b 舊 runner 的已做/未做** → `references/v10b-status-and-gaps.md`
- 用 **頭肩底 / 旗型** 當教材翻譯結構 → `references/pattern-mapping.md`

## 硬規則

- **結構優先，指標為輔。** EMA / MACD 常是陰影層，不是最高法源。
- **先有斷鍊，才有資格回頭分析哪一鍊完成。**
- **下層不得篡位。** 5m/30m 可以點火與退場，不能單獨宣布母世界成立或死亡。
- **`+1b` 是審核區，不是戀戰區。**
- **Double Mikiri 是事件層，核心鍊是血統審核層，主權是生死裁決層。** 三層不要混寫。
- **任何 swing / t2 / 斷鍊 / 升格邏輯都不得偷看未來。** 一律使用已確認資料。
- **優先做多頭版。** 空頭版只有在 Mark 明確要求時才展開。

## 工作方法

先回答這五件事：
1. 誰是主權級別
2. 世界在做什麼
3. 主戰役在做什麼
4. 執行層現在能不能點火
5. 最小級別怎麼判失敗、退場後交給誰

然後再把它翻成：
- Double Mikiri 事件鏈
- `3 + 1b + 2` 任務語義
- t2 / 核心鍊 / 斷鍊狀態
- 鍊數與 handoff

## 寫程式時的固定順序

1. `describe_market_position()` / BattleState
2. Double Mikiri auditor（硬條件先行）
3. 鍊數計算機接入 BattleState
4. Campaign / Sortie 狀態與三層止損
5. 最後才寫 entry / exit engine

## 既有程式的定位

- `C:/TASK/chain_counter_state_machine_v0_7.py`
  - **可直接沿用的骨幹**
  - 用來承接鍊數 / relay / confirmed tx / mixed handoff
- `C:/TASK` 其他舊 runner / strategy
  - **零件庫，不是法源**
  - 可拆 data pipeline、merge_asof、指標工具
  - 不要把舊硬編碼門檻原封不動抄回新系統

## 協作原則

- OpenClaw 這邊：理論整理、法源校正、技能檔維護、審計與反作弊把關
- Claude Code：實作、重構局部模組、測試、回測
  - **協作方式固定用本機 Claude Code CLI**
  - **ACPX / ACP runtime 路線目前棄用**（backend 未配置，短期不修）
- 每次有新共識，要優先回寫到本 skill 的 references，而不是只留在聊天裡

## 禁忌

- 不要把整套理論一次公式化
- 不要因為畫面像，就提前命名 `b`、第三鍊、完成態
- 不要把 v58 / v10b 的工程妥協誤認成理論本體
- 不要在 `C:/TASK` live 目錄直接做高風險測試
- 不要為了績效去放寬前視限制
