# 三尖法源與血統來源對照表

> 目的：把 `C:/TASK/MD/` 的舊文件、目前 workspace 內的 sanjian skill references、以及記憶宮殿節點對齊。
> 用途：之後整理理論、寫程式、補觀察、做 memory-palace 存檔時，都先看這張表，避免同一概念分散在不同名字下互相打架。

## 目前裁決

1. **`skills/sanjian-theory/references/*.md` 是日常工作的 working canon。**
   - 這不是說舊文件失效，而是說日常討論、程式化、回測、協作時，以 skill references 為先。
2. **`C:/TASK/MD/` 是血統來源與草案庫。**
   - 舊文件保留世界觀、角色語言、工程補丁、歷史裁決，但不直接和當前 skill references 同權。
3. **field observations 屬於 tentative layer。**
   - 新觀察先進 `field-observations.md`，案例夠多再升格到 `core-rules.md` / `baseline-v1-8h-2h-30m.md`。
4. **若 sanjian skill 要成為最終版，之後每次穩定共識都要雙寫：**
   - 先回寫 skill references
   - 再更新 memory-palace scaffold / seed

## 對照表

| 舊來源（C:/TASK/MD） | 主要貢獻 | 目前對應的 working canon | 建議 palace 節點 | 狀態 |
|---|---|---|---|---|
| `trispike_unified_core_strategy_v0_1_2026-04-09.md` | 04-09 主幹、8H/2H/30m/5m、`3+1b+2` 重新收斂 | `core-rules.md`, `baseline-v1-8h-2h-30m.md`, `timeframe-roles.md` | `Palace[Trispike] Hall[theory] Wing[structure]`, `Palace[Trispike] Hall[operations] Wing[baseline-v1]` | active lineage |
| `trispike_unified_source_v0_1_2026-04-01.md` | 母法源、事件層 / 血統層、入口文件思維 | `core-rules.md`, `worldview-sovereignty.md` | `Palace[Trispike] Hall[law-source] Wing[canon] Room[source-order]` | active lineage |
| `sanjian_skill_bootstrap.md` | 工作邊界、程式化順序、讀取規則 | `SKILL.md`, `coding-notes.md` | `Palace[Trispike] Hall[law-source] Wing[canon] Room[update-rules]` | active lineage |
| `三尖理論實驗室_核心總綱_v4.md` | 世界觀、生命週期、見切螺旋、角色總框架 | `worldview-sovereignty.md`, `timeframe-roles.md` | `Palace[Trispike] Hall[theory] Wing[worldview]` | active lineage |
| `將軍論_v1_4.md` | 皇帝 / 將軍 / Ghost / 諸侯、血統論、主權語言 | `worldview-sovereignty.md`, `t2-and-abc.md` | `Palace[Trispike] Hall[theory] Wing[worldview] Room[roles-and-sovereignty]` | active lineage |
| `鍊式連鎖_v1_4.md` | `t2_work`、鍊數、mixed handoff、Ghost 救駕 | `chain-and-campaign.md`, `chain-break.md` | `Palace[Trispike] Hall[theory] Wing[structure] Room[chain-engine]` | active lineage |
| `三尖新理論核心規範_v_0_1.md` | 新版語言草案、`+1b` 法律地位、多週期同步重疊 | `core-rules.md`, `timeframe-roles.md`, `t2-and-abc.md` | `Palace[Trispike] Hall[theory] Wing[structure] Room[3-plus-1b-plus-2]` | draft lineage |
| `三尖協議_v43.md` | Resolver / 工程補丁 / 主權掃描器 / 風控釘子 | `coding-notes.md`, `v10b-status-and-gaps.md`（部分），其餘待整理 | `Palace[Trispike] Hall[operations] Wing[engineering]` | partial, not yet canon |
| `v10b-status-and-gaps.md` | 舊 runner 已做 / 未做 / 缺口盤點 | `v10b-status-and-gaps.md` | `Palace[Trispike] Hall[operations] Wing[engineering] Room[v10b-gap-map]` | active canon |
| `God_of_War_v58_7_Strategy.md` | 舊策略零件庫、工程歷史 | `v10b-status-and-gaps.md`, `coding-notes.md`（僅零件庫角度） | `Palace[Trispike] Hall[law-source] Wing[lineage] Room[legacy-engineering]` | archive lineage |

## 對 workspace 現況的建議讀法

### 1. 想搞清楚「現在到底哪份算準」
先讀：
- `core-rules.md`
- `worldview-sovereignty.md`
- `baseline-v1-8h-2h-30m.md`

### 2. 想追舊文件血統
再看本表對應欄位，回頭打開 `C:/TASK/MD/...` 原文件。

### 3. 想做 memory palace
直接以這張表的 palace 節點欄位當骨架，不要重新發明 hall / wing 名字。

## 維護規則

- 新共識若只是觀察或待驗證，先進 `field-observations.md`。
- 新共識若已經影響日常判讀或程式法源，直接更新對應 working canon 檔。
- working canon 更新後，**同步更新**：
  - `memory-palace-map.md`
  - `memory-palace-seed.json`
  - 本表（若法源映射有變）
