# LEARNINGS.md
_Auto-maintained by self-improving-agent skill_

## [LRN-20260302-001] correction

**Logged**: 2026-03-02T05:02:06Z
**Priority**: medium
**Status**: pending
**Area**: docs

### Summary
Day-trip itinerary should place lunch closer to 12:00 and must align with user-provided start stations.

### Details
User corrected the proposed 3/19 itinerary: lunch at ~14:00 was too late for a relaxed outing, and the practical MRT origin should be 景安站 or 南勢角站. Future plans should anchor times around user constraints first (start point, meal cadence, return deadline), then fit scenic stops.

### Suggested Action
- Rebuild itinerary with 09:00 departure from 景安/南勢角.
- Place lunch around 11:40–12:40.
- Keep route simple enough to return by 16:00 without rush.

### Metadata
- Source: user_feedback
- Related Files: (chat response only)
- Tags: itinerary, transit, timing, correction

---

## [LRN-20260302-002] correction

**Logged**: 2026-03-02T05:56:00Z
**Priority**: high
**Status**: pending
**Area**: docs

### Summary
In LINE group chats, never send duplicate follow-up replies for the same user message.

### Details
User explicitly corrected behavior: "不要多回話，一次而已" after the assistant posted two near-identical replies to one message. This creates noise in group chats and violates expected single-turn etiquette.

### Suggested Action
- Send exactly one concise reply per triggering group message.
- Before sending, check that no duplicate draft/queued response is about to be emitted.
- If duplication happens, apologize once and immediately resume single-reply behavior.

### Metadata
- Source: user_feedback
- Related Files: (chat response only)
- Tags: line, group-chat, duplication, correction

---
