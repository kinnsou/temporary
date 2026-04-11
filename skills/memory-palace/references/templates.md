# Memory Palace Templates

## Storage templates

### Palace

```text
Palace[<palace>]: Domain: <what this palace covers>. Halls or wings: <name1>, <name2>, <name3>. Retrieval anchors: <keywords>.
```

### Hall

```text
Palace[<palace>] Hall[<hall>]: Coarse corridor: <what belongs here>. Wings: <wing1>, <wing2>. Retrieval anchors: <keywords>.
```

### Wing

```text
Palace[<palace>] Hall[<hall>] Wing[<wing>]: Major slice: <project, subject, persona, or domain>. Rooms: <room1>, <room2>. Retrieval anchors: <keywords>.
```

### Room

```text
Palace[<palace>] Hall[<hall>] Wing[<wing>] Room[<room>]: Topic scope: <module, issue cluster, or memory category>. Retrieval anchors: <keywords>.
```

### Drawer

```text
Palace[<palace>] Hall[<hall>] Wing[<wing>] Room[<room>] Drawer[<drawer>]: <single atomic fact, rule, threshold, exception, example, or reminder>. Aliases: <optional aliases>.
```

## Example

```text
Palace[OpenClaw memory]: Domain: long-term memory design and operations for OpenClaw. Halls or wings: retrieval, authoring, maintenance. Retrieval anchors: OpenClaw, memory, LanceDB.

Palace[OpenClaw memory] Hall[authoring] Wing[mempalace terms]: Major slice: terminology inspired by MemPalace-style hierarchy. Rooms: hall-wing-room mapping, drawer writing. Retrieval anchors: Palace, Hall, Wing, Room, Drawer.

Palace[OpenClaw memory] Hall[authoring] Wing[mempalace terms] Room[drawer writing]: Topic scope: how to write atomic retrievable entries in memory-lancedb-pro. Retrieval anchors: atomic, memory_store, path.

Palace[OpenClaw memory] Hall[authoring] Wing[mempalace terms] Room[drawer writing] Drawer[one claim per entry]: Store one fact or rule per drawer so recall can fetch the exact leaf instead of a large blended summary. Aliases: atomic memory, leaf note.
```

## Query ladder

Verify retrieval with 3 query styles:

1. **Full path**: `OpenClaw memory authoring mempalace terms drawer writing one claim per entry`
2. **Node name**: `drawer writing memory`
3. **Natural language**: `why should a drawer contain only one claim?`

## Update pattern

When a fact changes, update the existing memory instead of storing a conflicting twin. Rename hall, wing, or room labels rarely, because descendants must be updated in the same pass.
