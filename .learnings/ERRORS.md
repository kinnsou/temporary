# ERRORS.md
_Auto-maintained by self-improving-agent skill_

## [ERR-20260302-001] web_search.search_lang_validation_mismatch

**Logged**: 2026-03-02T04:02:06Z
**Priority**: medium
**Status**: pending
**Area**: config

### Summary
`web_search` failed when using `search_lang=zh` and `search_lang=zh-hant`, with conflicting validation expectations.

### Error
```
Brave Search API error (422): search_lang expects zh-hans/zh-hant enum (provider-side)
Then tool wrapper error: search_lang must be 2-letter ISO code (tool-side)
```

### Context
- Operation: retrieve Taiwan Chinese search results for New Taipei mayor polls
- Inputs attempted: `search_lang=zh`, then `search_lang=zh-hant`
- Outcome: both rejected for different reasons

### Suggested Fix
- Omit `search_lang` for Chinese queries and rely on `country=TW` + Chinese query text.
- Add this gotcha to tool notes if it recurs.

### Metadata
- Reproducible: yes
- Related Files: /home/node/.openclaw/workspace/.learnings/ERRORS.md

---
