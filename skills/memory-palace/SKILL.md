---
name: memory-palace
description: Structure long-term memory using a palace/hall/wing/room/drawer hierarchy on top of memory-lancedb-pro. Use when the user asks for a memory palace, hierarchical memory, nested memory, hall/wing/room/drawer layout, domain map, structured recall, or memory-lancedb-pro organization, or when a large topic needs atomic memories that survive context-window limits.
---

# Memory Palace

Encode a MemPalace-inspired hierarchy directly in `memory_store` text so hybrid retrieval matches both semantic meaning and exact path anchors. No plugin changes required, everything runs on existing memory-lancedb-pro primitives.

## Hierarchy

| Layer   | Purpose                                       | Optional? |
|---------|-----------------------------------------------|-----------|
| Palace  | Top-level domain namespace                    | No        |
| Hall    | Coarse corridor / major category              | Yes       |
| Wing    | Project, subject, persona, or domain slice    | No        |
| Room    | Concrete module, topic, or memory category    | No        |
| Drawer  | Smallest retrievable unit, one claim per entry | No        |

Stop early when a topic does not need every layer. If `Hall` adds no value, omit it consistently across the whole palace.

## Path format

```
Palace[<palace>]
Palace[<palace>] Hall[<hall>]
Palace[<palace>] Hall[<hall>] Wing[<wing>]
Palace[<palace>] Hall[<hall>] Wing[<wing>] Room[<room>]
Palace[<palace>] Hall[<hall>] Wing[<wing>] Room[<room>] Drawer[<drawer>]
```

Labels: short, stable, noun-based. Put alternate names in `Aliases:` inside the text, not in the path label.

## Workflow

1. **Choose the palace** - one stable noun phrase per domain. If several layouts are plausible, propose 2-3 and let the user choose.
2. **Map top-down** - store the palace map first, then hall or wing summaries, then room summaries, then drawer entries.
3. **Store atomic entries** - one claim per `memory_store` call, under 500 chars, full path repeated in text.
4. **Verify with `memory_recall`** - query by full path, by wing or room name alone, and by natural language. If retrieval is noisy, shorten the entry or strengthen anchors.
5. **Update, don't duplicate** - use `memory_update` for changed facts. Rename descendants in the same pass when relabelling a node.

## Category and importance defaults

- Palace, hall, or wing map: `fact` or `decision`, importance `0.70-0.80`
- Room summary: `fact` or `decision`, importance `0.75-0.85`
- Preference drawer: `preference`, importance `0.85+`
- Entity drawer: `entity`, importance `0.75-0.90`
- Rule, threshold, or exception drawer: `fact` or `decision`, importance `0.70-0.90`

## Retrieval ladder

- Broad, fuzzy intent: query palace or hall or wing level.
- Targeted, named topic: query room level.
- Precise, specific question: pull drawer entries.

## Rules

- Do not store raw chat transcripts or long summaries.
- Do not create empty placeholder nodes.
- Do not repeat the same fact at every layer.
- Store exceptions as separate drawers, not by bloating a room summary.
- Prefer multiple short drawers over one long blob.
- Do not claim source-level MemPalace compatibility.

Read `references/templates.md` for exact storage templates and examples.
