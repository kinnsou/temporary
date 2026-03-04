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

## [ERR-20260304-001] git_safe_directory_block

**Logged**: 2026-03-04T03:16:00Z
**Priority**: low
**Status**: pending
**Area**: config

### Summary
`git status` failed in workspace due Git safe.directory ownership protection.

### Error
```
fatal: detected dubious ownership in repository at '/home/node/.openclaw/workspace'
To add an exception for this directory, call:
	git config --global --add safe.directory /home/node/.openclaw/workspace
```

### Context
- Operation: commit learning-log update per workspace rule
- Command: `git status --short`
- Environment: OpenClaw container workspace mount ownership differs from current user

### Suggested Fix
- Add workspace to git safe.directory before git commands:
  `git config --global --add safe.directory /home/node/.openclaw/workspace`

### Metadata
- Reproducible: yes
- Related Files: /home/node/.openclaw/workspace/.learnings/ERRORS.md

---
