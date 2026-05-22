---
name: market-brief-builder
description: Build, update, debug, or manually rerun Mark's one-link Taiwan market morning brief / 早報 pages and cron. Use when editing `market-briefs/`, `prompts/morning-news-cron-prompt.txt`, the 每日早報 cron, or the approved `NEWS/market-brief-package` template.
---

# Market Brief Builder

## Non-negotiables

- Approved visual template: `/home/kurohime/.openclaw/workspace/NEWS/market-brief-package/market-brief-2026-05-21-noon.html`.
- The generated page must use that package template's masthead/news-grid/tweet-card/dividend/table visual system. Do **not** revive the older `market-briefs` card layout.
- Builder path: `/home/kurohime/.openclaw/workspace/market-briefs/scripts/build_market_brief.py`.
- Output path: `market-briefs/market-brief-YYYY-MM-DD.html`; LINE sends only that URL.
- Content source/cache: `memory/daily-tasks.json` → `YYYY-MM-DD.morning_news.content`.
- Dividend source: builder fetches TWSE / TPEx official APIs. Do not have the model invent dividend rows.

## Layout rules

- News first: masthead → pulse → hero → international news → Taiwan news → topic voices → dividend radar.
- No `📈 台股焦點` section.
- The visible page must read like a finished publication. Do not expose workflow terms such as `source-first`, `no filler`, `Filler Removed`, `0段`, `單一 responsive HTML`, or quality/debug notes.
- Topic voices are 3 cards. Prefer @elonmusk, @realDonaldTrump, @saylor first-party/current-day speech; if missing, fill with current high-profile direct quotes. Do not write “not found” style placeholders.
- One-week dividend rows must be fully expanded. The 1–2 month queue shows 15 rows and may say how many more are hidden.

## Run / verify

1. If manually running the periodic task, first read `/home/kurohime/.openclaw/cron/jobs.json` and follow the job's payload prompt exactly.
2. Build: `python3 /home/kurohime/.openclaw/workspace/market-briefs/scripts/build_market_brief.py --date YYYY-MM-DD`.
3. Verify the generated HTML contains the approved template markers: `class="masthead"`, `class="news-grid"`, `class="tweet-card"`, `class="div-table"`.
4. Verify it does not contain old-layout markers or forbidden text: `story-item`, `source-links`, `台股焦點`, `source-first`, `Filler Removed`, `午間快報`.
5. Commit only relevant market-brief files and push `origin master`.

## Persistent update rule

If Mark corrects the morning-brief format, update all applicable persistent places in the same pass:

- this skill (`skills/market-brief-builder/SKILL.md`),
- `prompts/morning-news-cron-prompt.txt`,
- the live cron job payload via the cron tool,
- and the builder/template if needed.
