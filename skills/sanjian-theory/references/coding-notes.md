# 程式化備忘（整理版）

> 本檔整合 `sanjian_skill_bootstrap.md`、Trispike Lab 開發守則、現有 v7~v10b 教訓，只保留接下來真的要用的開發規範。

## 1. 寫程式的順序，不得跳層

1. `describe_market_position(asof_time) -> BattleState`
2. Double Mikiri auditor
3. 鍊數計算機接入 BattleState
4. Campaign / Sortie manager
5. 最後才是 entry / exit engine

若前一層還在飄，不要跳去追績效。

## 2. 先做結構診斷，再做績效

優先回答：
- 世界是否仍有效
- 主戰役現在是哪一段
- 核心鍊是否存在
- 有沒有斷鍊事件
- `t2_root / t2′ / t2_work / local t3` 的關係是什麼
- 下層是主攻型 `+2` 還是脈衝型 `+2`

## 3. 不偷看未來

這是硬鐵律：
- swing point 必須等右側確認
- `t2` 升格必須有時間方向
- 斷鍊判定不可用未來極值回填
- 回測與實盤的欄位時間語義要一致

任何漂亮績效，只要靠偷看，全部作廢。

## 4. 對 legacy code 的態度

- **能動的 live code，不要為了美觀重構。**
- 修 bug 用外科手術，不是拆遷。
- 新增 patch 變數時，避免污染既有 `state`、`wallet`、runner prompt 等敏感欄位。
- 人類依賴的提示句，不要擅自改口吻或改欄位。

## 5. 可沿用的零件

### 可直接沿用的骨幹
- `C:/TASK/chain_counter_state_machine_v0_7.py`
  - 狀態機骨架
  - relay / confirmed tx 設計
  - mixed handoff 提示

### 可拆零件用
- 舊 runner / strategy 的 `merge_asof` 多週期管線
- 指標計算工具
- 已驗證過的資料整理流程

### 不可直接搬回來當法源
- v58 / v10b 的固定 EMA 硬門檻
- 舊版 Commander / Sniper 倉位話術
- 為了回測可跑而臨時塞入的 stop placeholder

## 6. 目前最該優先做的模組

### A. BattleState
至少先固定這幾欄：
- `world_state`
- `campaign_state`
- `execution_state`
- `micro_fail_rule`
- `next_handoff`
- `local_structure_state`
- `parent_structure_cap`

### B. Double Mikiri auditor
先做硬條件：
- 反轉軸
- 彈切測試
- 授權低點防守
- 再次見切

### C. Chain integration
讓鍊數直接更新：
- execution_state
- micro_fail_rule
- next_handoff

## 7. 舊 runner 的定位

### v10b
- 是目前最有價值的**過渡版 benchmark**
- 代表哪些工程近似曾經有效
- 不代表理論已完整落地

### v58 及更早版本
- 視為零件庫或歷史樣本
- 可借資料管線與審計思路
- 不再把其硬編碼規則視為現行法源

## 8. 開發場地規則

- `C:/TASK` 是 live trader 目錄，除非明確要查線上檔案，否則不要在那裡直接高風險測試
- 回測、實驗、重構，優先在隔離副本或 workspace 進行
- 修改後先驗已知案例，再跑大回測

## 9. 與 Claude Code 的協作方式

- OpenClaw：理論整理、規格校正、技能檔維護、審計與反作弊把關
- Claude Code：模組實作、局部重構、測試與回測
- 任何新共識，最後都要回寫到 skill references，不能只留在聊天或 commit 訊息裡

## 10. 最後提醒

- 不要把第三鍊判定寫死
- 不要把小週期變成大結構判官
- 不要因為像樣，就提前切 a/b/c
- 不要為了績效放寬主權、斷鍊、確認時間這些硬邊界
