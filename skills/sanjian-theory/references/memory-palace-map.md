# Trispike 記憶宮殿 v1（Sanjian Working Palace）

> 目的：把三尖理論整理成第一個完整可維護的 memory-palace 案子。
> 定位：這不是取代理論文件，而是把「法源順位、核心房間、更新路徑」固定下來，方便之後接到 memory-lancedb-pro 或其他長期記憶層。
> 狀態：scaffold v1
> 交付物：本檔負責人類可讀 scaffold，`memory-palace-seed.json` 負責 import-ready seed。

## Palace policy

1. **Palace[Trispike] 是三尖理論的總命名空間。**
2. **working canon 以 sanjian skill references 為準。**
3. **`C:/TASK/MD/` 舊文件進 lineage，不直接和 current canon 同權。**
4. **新觀察先進 evolution hall，不直接污染 theory hall。**
5. **若要升格為完整記錄案，每次穩定共識都要更新 palace scaffold 與 seed。**

## Hierarchy

```text
Palace[Trispike]
├── Hall[law-source]
│   ├── Wing[canon]
│   │   ├── Room[source-order]
│   │   └── Room[update-rules]
│   └── Wing[lineage]
│       ├── Room[legacy-docs]
│       └── Room[legacy-engineering]
├── Hall[theory]
│   ├── Wing[worldview]
│   │   ├── Room[event-and-lineage]
│   │   └── Room[roles-and-sovereignty]
│   └── Wing[structure]
│       ├── Room[3-plus-1b-plus-2]
│       ├── Room[core-chain]
│       └── Room[chain-engine]
├── Hall[operations]
│   ├── Wing[baseline-v1]
│   │   ├── Room[timeframe-roles]
│   │   ├── Room[execution-flow]
│   │   └── Room[exit-and-handoff]
│   └── Wing[engineering]
│       ├── Room[coding-order]
│       └── Room[v10b-gap-map]
└── Hall[evolution]
    ├── Wing[observations]
    │   ├── Room[sync-break]
    │   ├── Room[exhaustion-cascade]
    │   └── Room[phase-semantics]
    └── Wing[open-questions]
        └── Room[final-leg-qualification]
```

## Seed nodes and canonical drawers

下面這批是第一版最值得存進長期記憶的節點。格式照 memory-palace v2，未來若 memory-pro 恢復可直接拿去 import。

```text
Palace[Trispike]: Kind: map. Domain: working canon, legacy lineage, baseline operations, and evolving observations for 三尖理論. Halls: law-source, theory, operations, evolution. Retrieval anchors: 三尖, Trispike, source of truth, memory palace. Status: active.

Palace[Trispike] Hall[law-source]: Kind: map. Coarse corridor: source precedence, canonical references, and legacy documents. Wings: canon, lineage. Retrieval anchors: law source, canon, lineage. Status: active.

Palace[Trispike] Hall[law-source] Wing[canon] Room[source-order] Drawer[current-skill-is-working-canon]: Kind: canonical. Rule: skills/sanjian-theory/references/*.md is the working canon for daily use; C:/TASK/MD legacy docs are lineage sources unless newer consensus promotes them. Aliases: working canon, source precedence. Status: active.

Palace[Trispike] Hall[law-source] Wing[canon] Room[update-rules] Drawer[double-write-rule]: Kind: canonical. Rule: stable sanjian consensus must update both the current skill references and the memory-palace scaffold or seed; tentative observations go to evolution first. Aliases: update discipline, dual write. Status: active.

Palace[Trispike] Hall[theory]: Kind: map. Coarse corridor: worldview, structure, sovereignty, and chain logic. Wings: worldview, structure. Retrieval anchors: theory, worldview, chain, sovereignty. Status: active.

Palace[Trispike] Hall[theory] Wing[worldview] Room[event-and-lineage] Drawer[event-lineage-split]: Kind: canonical. Rule: event layer records what the market did now, while lineage layer records how that event is later absorbed, promoted, or reclassified by a larger structure. Aliases: event layer, lineage layer, bloodline split. Status: active.

Palace[Trispike] Hall[theory] Wing[worldview] Room[roles-and-sovereignty] Drawer[sovereignty-decides-death]: Kind: canonical. Rule: t2_root decides world survival, t2_work or t2′ decides campaign or promotion survival, and lower frames cannot overrule the sovereign frame. Aliases: sovereignty, emperor-general split. Status: active.

Palace[Trispike] Hall[theory] Wing[structure] Room[3-plus-1b-plus-2] Drawer[task-semantics]: Kind: canonical. Definition: 3 means world birth, +1b means qualification review or core-chain test, and +2 means the formal push after passing review. Aliases: 3+1b+2, task semantics. Status: active.

Palace[Trispike] Hall[theory] Wing[structure] Room[core-chain] Drawer[core-chain-is-legal-center]: Kind: canonical. Rule: +1b is the legal center of continuation; the question is not whether the chart still looks strong, but whether the core chain still has qualification to carry the final leg. Aliases: core chain, legal center, qualification review. Status: active.

Palace[Trispike] Hall[theory] Wing[structure] Room[chain-engine] Drawer[break-before-naming]: Kind: canonical. Rule: chain-break must appear before naming completion, counting, or promotion; without a valid break event, do not seal the segment too early. Aliases: break first, no early naming. Status: active.

Palace[Trispike] Hall[operations]: Kind: map. Coarse corridor: baseline timeframe roles, execution flow, exits, and engineering notes. Wings: baseline-v1, engineering. Retrieval anchors: baseline, execution, coding. Status: active.

Palace[Trispike] Hall[operations] Wing[baseline-v1] Room[timeframe-roles] Drawer[8h-2h-30m-5m-roles]: Kind: canonical. Rule: 8H provides world credit, 2H runs the main campaign, 30m bridges execution, and 5m only verifies micro triggers or break points in Baseline V1. Aliases: timeframe roles, baseline V1. Status: active.

Palace[Trispike] Hall[operations] Wing[baseline-v1] Room[execution-flow] Drawer[single-semantic-short-on-overlap-break]: Kind: canonical. Rule: Baseline V1 keeps one strategy language centered on 燕返→彈切→見切; shorts are not a separate mirrored doctrine and are only considered when multi-timeframe overlap-break or 補斷鍊重疊 signals defensive failure or exhaustion. Aliases: one semantics, no separate short version, overlap-break short. Status: active.

Palace[Trispike] Hall[operations] Wing[engineering] Room[coding-order] Drawer[battle-state-first]: Kind: canonical. Rule: implement BattleState and hard auditors before chain counter integration, campaign management, or entry-exit engines. Aliases: coding order, BattleState first. Status: active.

Palace[Trispike] Hall[evolution]: Kind: map. Coarse corridor: new observations, tentative patterns, and unresolved questions. Wings: observations, open-questions. Retrieval anchors: observation, tentative, unresolved. Status: active.

Palace[Trispike] Hall[evolution] Wing[observations] Room[sync-break] Drawer[second-leg-shakeout-review]: Kind: episodic. Date: 2026-04-12. Observation: Mark observed that multi-timeframe sync breaks often overlap on the second leg or core chain, where the market may shake holders out before the final leg; the event is a re-core-chain review point, not an automatic reversal verdict. Status: active.

Palace[Trispike] Hall[evolution] Wing[observations] Room[exhaustion-cascade] Drawer[shrinking-timeframe-plus2-relay]: Kind: episodic. Date: 2026-04-12. Observation: after an 8H pullback, the market may complete a 2H 燕返→彈切→見切→+2 recovery, then relay the same sequence down through 30m, 15m, and 5m; as the relay descends, t2 validation becomes shallower and the final 5m +2 can be a rushed terminal push before a sharp drop. Cross-check this with 30m/2H/8H second-leg sync-break overlap to judge exhaustion risk. Status: active.

Palace[Trispike] Hall[evolution] Wing[observations] Room[phase-semantics] Drawer[second-break-enters-t2-test]: Kind: episodic. Date: 2026-04-12. Observation: a second chain break may be the prelude to upper/lower t2 testing rather than an immediate end verdict; 燕返 stabilizes the structure, 彈切 performs the t2 test, and 見切 becomes the ignition point for the third major leg if the test passes. The same role split may recurse inside smaller three-leg structures. Status: active.

Palace[Trispike] Hall[evolution] Wing[open-questions] Room[final-leg-qualification] Drawer[how-to-separate-shakeout-from-cancelled-final-leg]: Kind: open_question. Question: when the second leg is damaged, how do we distinguish a shakeout from a true cancellation of the final leg qualification? Why unresolved: current evidence is observational and still needs case statistics. Status: tentative.
```

## Retrieval checks to use later

### Full path
- `Trispike law-source canon source-order current-skill-is-working-canon`
- `Trispike theory structure core-chain core-chain-is-legal-center`

### Node name only
- `source-order`
- `core-chain`
- `sync-break`
- `exhaustion-cascade`
- `phase-semantics`

### Natural language
- `現在三尖哪份文件算 working canon？`
- `三尖的 core chain 到底在審什麼？`
- `同步斷鍊在第二鍊時要拿來檢查什麼？`
- `為什麼最後的 5m +2 反而可能是衰竭終點？`
- `第二斷鍊是不是正在準備進入 t2 測試？`

## Maintenance rule

- **canonical 變動**：更新對應 reference 檔，再更新 palace seed。
- **只有案例、還沒升格**：留在 `Hall[evolution]`。
- **舊文件整理**：先補 `source-lineage-map.md`，再決定要不要升進 theory / operations。
