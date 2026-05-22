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
- Masthead fixed labels: the large Chinese title is `新聞摘要`; the right-side Edition value is English-only: `Daily Express`.
- Heading/display typography must stay at `font-weight <= 700`. Do not use 800/900 for masthead, section titles, hero numbers, stats, or other title-like text.
- In the three-big-block hero layout, the second block is fixed to Taiwan index futures night-session close (`TX Night · 昨夜盤 05:00`, TAIFEX); do not replace it with a world-news summary. Fetch by the brief date itself, because TAIFEX labels the after-hours session by the calendar date it ends at 05:00. The dividend block comes after it.
- No `📈 台股焦點` section.
- The visible page must read like a finished publication. Do not expose workflow terms such as `source-first`, `no filler`, `Filler Removed`, `0段`, `單一 responsive HTML`, or quality/debug notes.
- All visible Chinese copy must be 繁體中文 / Traditional Chinese (`zh-Hant`). Convert Simplified snippets from sources/model output before rendering; e.g. `炼油廠` must become `煉油廠`.
- Topic voices are 3 cards. Prefer @elonmusk, @realDonaldTrump, @saylor first-party/current-day speech; if missing, fill with current high-profile direct quotes. Do not write “not found” style placeholders.
- One-week dividend rows must be fully expanded. The 1–2 month queue shows 15 rows and may say how many more are hidden.
- Mobile body text is intentionally about 2px larger than desktop/base for readability: news body and voice content around `16.5px`, lead body around `17px`, table body around `15px` in the template's mobile media query.
- Do not end the page with Chinese newspaper-like signoffs such as `今日早報完` / `午間快報完`. Use an English mark such as `END OF BRIEF`, or omit the signoff entirely.

## Run / verify

1. If manually running the periodic task, first read `/home/kurohime/.openclaw/cron/jobs.json` and follow the job's payload prompt exactly.
2. Build: `python3 /home/kurohime/.openclaw/workspace/market-briefs/scripts/build_market_brief.py --date YYYY-MM-DD`.
3. Verify the generated HTML contains the approved template markers: `class="masthead"`, `class="news-grid"`, `class="tweet-card"`, `class="div-table"`.
4. Verify it does not contain old-layout markers or forbidden text: `story-item`, `source-links`, `台股焦點`, `source-first`, `Filler Removed`, `午間快報`.
4a. Verify visible Chinese is 繁體中文 / Traditional Chinese; spot-check common Simplified chars such as `炼`, `厂`, `后`, `发`, `国`, `际`, `与`, `关`, `联`, `战`, `风`, `险`, `经`, `济`, `财`, `务`, `办`, `会`, `议`, `数`, `据`, `价`, `场`, `业`, `产`, `万`, `亿`, `报`, `涨`, `盘`, `开`, `预`, `计`.
5. Verify masthead / hero requirements: `<h1>新聞摘要</h1>`, `Edition` = `Daily Express`, heading/display `font-weight` never exceeds 700, and the second hero stat is `TX Night · 昨夜盤 05:00` with a TAIFEX source.
6. Commit only relevant market-brief files and push `origin master`.

## Persistent update rule

If Mark corrects the morning-brief format, update all applicable persistent places in the same pass:

- this skill (`skills/market-brief-builder/SKILL.md`),
- `prompts/morning-news-cron-prompt.txt`,
- the live cron job payload via the cron tool,
- and the builder/template if needed.
