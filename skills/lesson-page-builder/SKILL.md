---
name: lesson-page-builder
description: Build or update weekly lesson web pages from the Bible lesson source site, especially Wednesday and Sunday reading pages like `lesson13-YYYYMMwN.html` and `lesson13-YYYYMMwN-sun.html`. Use when Mark asks to make a lesson page, convert a named weekday section into Wednesday or Sunday format, create both pages in one go, fix lesson page week naming, or standardize the lesson-page workflow for future runs.
---

# Lesson Page Builder

Build lesson web pages for the weekly reading workflow.

## Quick start

1. Read `references/lesson-page-workflow.md` first.
2. Determine the current lesson number from the source site before naming files.
3. Calculate week number with `ceil(day / 7)`.
4. If Mark explicitly assigns which source section goes to Wednesday or Sunday, follow that instead of the default mapping.
5. If Mark specifies both Wednesday and Sunday in one request, finish both in the same run.
6. Prefer Gemini CLI for draft generation, keep local model usage for orchestration, validation, and file edits only.
7. After edits, commit and push unless Mark says not to.

## Default content mapping

- Wednesday page: use the source lesson's Monday + Tuesday sections, with the simple single-card weekday layout.
- Sunday page: use the source lesson's Wednesday + Thursday sections, with the richer two-column Sunday layout.
- Mark override wins over these defaults.

## Output rules

- Wednesday file: `lesson<lesson>-<yyyymm>w<week>.html`
- Sunday file: `lesson<lesson>-<yyyymm>w<week>-sun.html`
- Use Traditional Chinese.
- Keep wording child-friendly, natural, and not childish.
- Do not mention age or grade.
- Do not include source notes or raw URLs in the page unless Mark explicitly asks.
- Keep Wednesday visually simple, Sunday visually richer.

## Gemini-first workflow

When generating new page content:

1. Fetch or read only the needed source section(s).
2. Ask Gemini CLI to rewrite the content into structured fields suited for the target template.
3. Apply the result into an existing proven template when possible instead of redesigning the page from scratch.
4. Do a quick local sanity check on title, subtitle, file name, section mapping, and wording like `召會` vs `教會` when Mark has established a preference.
5. Save, verify, commit, and push.

## References

- Read `references/lesson-page-workflow.md` for naming, section-selection, layout split, and Mark-specific override rules.
- Reuse nearby successful `lesson*.html` and `lesson*-sun.html` files as live template examples when making the next page.
