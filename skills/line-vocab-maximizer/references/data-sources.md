# Data sources and automation notes

## Files

### `/home/node/.openclaw/workspace/memory/vocab-history.json`
Hard registry for uniqueness.

Use it for:
- checking whether a candidate new word has ever been taught
- pulling past example sentences for review prompts
- updating first/last seen dates and example metadata after successful sends

### `/home/node/.openclaw/workspace/daughter-vocab.md`
Human-readable teaching log.

Use it for:
- keeping a readable record by date
- quick manual review of what was taught

Do not rely on it alone for exact uniqueness.

### `/home/node/.openclaw/workspace/memory/daily-tasks.json`
Daily send ledger.

Use it for:
- skip logic (`done=true`)
- preserving same-day content and send state

### `/home/node/.openclaw/cron/jobs.json`
Scheduled-task source of truth.

When manually executing or modifying the vocab task, inspect the `每日英文單字（晚上7點）` job first.

## Design rules

- `vocab-history.json` decides whether a word is new
- `daughter-vocab.md` is the readable archive
- `daily-tasks.json` decides whether tonight's message already ran
- cron prompt must reflect the same logic as the storage layer

## Failure pattern to avoid

Do not rely on free-form markdown alone for dedupe. That caused soft matching and allowed accidental repeats.
