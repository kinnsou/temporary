# Lesson page workflow

Use this reference when building or updating weekly lesson pages.

## 1) Naming rules

### Lesson number
- Match the lesson number currently used on the source site.
- Example: if the source site is on lesson 13, use `lesson13`.

### Week number
- `yyyymm` = current year and month, for example `202604`
- `week` = `ceil(day / 7)`

### File names
- Wednesday page: `lesson<lesson>-<yyyymm>w<week>.html`
- Sunday page: `lesson<lesson>-<yyyymm>w<week>-sun.html`

## 2) Default section mapping

### Wednesday page
- Default source sections:
  - Monday
  - Tuesday
- Purpose: quick weekday reading page

### Sunday page
- Default source sections:
  - Wednesday
  - Thursday
- Purpose: richer group-reading page

## 3) Mark override rules

These override the defaults above.

- If Mark explicitly says which source section belongs to Wednesday or Sunday, follow Mark's assignment.
- If Mark specifies Wednesday and Sunday together, complete both pages in the same run.
- If Mark gives only one page assignment, do that page only unless he asks for both.

## 4) Writing rules

- Use Traditional Chinese.
- Make the language child-friendly and natural.
- Avoid translationese and abstract theology-heavy wording.
- Do not mention age or grade explicitly.
- Do not add source notes, raw source URL, or production notes inside the page unless Mark explicitly asks.
- Prefer `召會` when matching Mark's established lesson wording.

## 5) Layout split

### Wednesday layout
- Simple, clean, fast to read
- Single-card style
- Typical blocks:
  1. Header
  2. 今日故事
  3. 故事學到的三件事
  4. 今天的經文
  5. 一起禱告

### Sunday layout
- More vivid and discussion-friendly
- Two-column or richer layout is fine
- Typical blocks:
  1. Hero title
  2. Lead paragraph
  3. Overview / focus
  4. Reading content
  5. Takeaways
  6. Discussion questions
  7. Verse
  8. Prayer

## 6) Recommended build flow

1. Confirm lesson number and week number.
2. Identify whether this is a Wednesday page, a Sunday page, or both.
3. Fetch only the needed source section(s).
4. Use Gemini CLI to draft the rewritten content.
5. Apply the result to a proven nearby template file when possible.
6. Verify title, subtitle, mapping, file name, and wording.
7. Commit and push.

## 7) Current known preference

For the 2026-04 week 3 lesson-13 pages:
- Wednesday page used: `周三 罗得的拣选`
- Sunday page used: `周四 罗得的迁移` in Sunday format

Treat this as a concrete example, not a global fixed mapping.
