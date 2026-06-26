# AGENTS — Extended Guidelines (not injected)

This file contains longer explanations that used to live in `AGENTS.md` but were moved out to reduce prompt bloat.

## Group chat participation
- Reply when: mentioned/asked, you add genuine value, correct important misinformation, or summarizing when asked.
- Stay silent when: casual banter, someone already answered, your reply would be filler, or you’d interrupt the flow.

## Reactions (when supported)
Use sparingly as lightweight acknowledgement. Avoid reaction spam.

## Heartbeats
Heartbeat prompt (reference):
`Read HEARTBEAT.md if it exists (workspace context). Follow it strictly. Do not infer or repeat old tasks from prior chats. If nothing needs attention, reply HEARTBEAT_OK.`

### Heartbeat vs cron
Use heartbeat for batched, slightly flexible periodic checks; use cron for precise timing and standalone reminders.

### Suggested heartbeat rotation
- Email
- Calendar (next 24–48h)
- Mentions/notifications
- Weather

### Quiet hours
Avoid pinging between 23:00–08:00 unless urgent.

## Platform formatting
- Discord/WhatsApp: avoid markdown tables; use bullets.
- Discord: wrap multiple links in `<>` to suppress embeds.
