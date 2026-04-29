#!/usr/bin/env python3
import argparse
import datetime as dt
import html
import json
import math
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Tuple

import requests

WORKSPACE = Path('/home/kurohime/.openclaw/workspace')
STATE_PATH = WORKSPACE / 'memory' / 'lesson-page-sequence.json'
SITE_TEMPLATE = 'https://ezoe.work/books/2/2264-1-{lesson}.html'
DAY_ORDER = ['周一', '周二', '周三', '周四', '周五', '周六', '主日']
SITE_ROOT = 'https://kinnsou.github.io/temporary'
MODEL = 'gemini-3-flash-preview'
TIMEZONE = dt.timezone(dt.timedelta(hours=8))

HEADING_RE = re.compile(
    r"<div style='display:flex;' class=cn1 id=[^>]+><div style='font-weight:bold;'>(周一|周二|周三|周四|周五|周六|主日)</div>　<div>(.*?)</div></div>",
    re.S,
)

DEFAULT_STATE = {
    'mode': 'sequential-single-section-pair',
    'siteTemplate': SITE_TEMPLATE,
    'stopAfterLesson': 18,
    'next': {
        'lesson': 13,
        'day': '主日'
    },
    'lastBuilt': None,
}


def now_taipei() -> dt.datetime:
    return dt.datetime.now(TIMEZONE)


def current_week_tag(now: dt.datetime | None = None) -> str:
    now = now or now_taipei()
    return f"{now.year}{now.month:02d}w{math.ceil(now.day / 7)}"


def zh_number(num: int) -> str:
    zh_digits = {
        1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '七', 8: '八', 9: '九',
        10: '十', 11: '十一', 12: '十二', 13: '十三', 14: '十四', 15: '十五', 16: '十六',
        17: '十七', 18: '十八', 19: '十九', 20: '二十'
    }
    return zh_digits.get(num, str(num))


def human_week_label(now: dt.datetime | None = None) -> str:
    now = now or now_taipei()
    month_map = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
    return f"{now.year} {month_map[now.month - 1]}第{zh_number(math.ceil(now.day / 7))}週"


def lesson_label(lesson: int) -> str:
    return f"第{zh_number(lesson)}課"


def load_state() -> dict:
    if not STATE_PATH.exists():
        return json.loads(json.dumps(DEFAULT_STATE))
    return json.loads(STATE_PATH.read_text(encoding='utf-8'))


def save_state(state: dict) -> None:
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    STATE_PATH.write_text(json.dumps(state, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def fetch_html(lesson: int) -> str:
    url = SITE_TEMPLATE.format(lesson=lesson)
    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    resp.encoding = 'utf-8'
    return resp.text


def clean_html_text(snippet: str) -> str:
    text = snippet.replace('<br><br>', '\n\n').replace('<br>', '\n')
    text = re.sub(r'<[^>]+>', '', text)
    text = html.unescape(text)
    text = text.replace('\r', '')
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip().replace('　', '')


def split_section_fields(text: str) -> Tuple[str, str, str]:
    main_text = text
    verse_text = ''
    practice_text = ''
    if '祷读经文：' in text:
        main_text, rest = text.split('祷读经文：', 1)
        rest = rest.strip()
        if '§' in rest:
            verse_text, practice_text = rest.split('§', 1)
            verse_text = verse_text.strip()
            practice_text = practice_text.strip()
        else:
            verse_text = rest.strip()
    return main_text.strip(), verse_text.strip(), practice_text.strip()


def extract_sections(lesson: int) -> Dict[str, dict]:
    page_html = fetch_html(lesson)
    matches = list(HEADING_RE.finditer(page_html))
    if not matches:
        raise RuntimeError(f'No day headings found for lesson {lesson}')
    sections: Dict[str, dict] = {}
    for idx, match in enumerate(matches):
        day = match.group(1)
        title = clean_html_text(match.group(2))
        content_start = match.end()
        content_end = matches[idx + 1].start() if idx + 1 < len(matches) else len(page_html)
        raw_content = page_html[content_start:content_end]
        text = clean_html_text(raw_content)
        main_text, verse_text, practice_text = split_section_fields(text)
        sections[day] = {
            'lesson': lesson,
            'day': day,
            'title': title,
            'body': main_text,
            'verse': verse_text,
            'practice': practice_text,
            'url': SITE_TEMPLATE.format(lesson=lesson),
        }
    return sections


def advance_pointer(pointer: dict) -> dict:
    lesson = int(pointer['lesson'])
    day = pointer['day']
    idx = DAY_ORDER.index(day)
    if idx == len(DAY_ORDER) - 1:
        return {'lesson': lesson + 1, 'day': DAY_ORDER[0]}
    return {'lesson': lesson, 'day': DAY_ORDER[idx + 1]}


def get_section(pointer: dict) -> dict:
    lesson = int(pointer['lesson'])
    day = pointer['day']
    sections = extract_sections(lesson)
    if day not in sections:
        raise RuntimeError(f'Lesson {lesson} missing section {day}')
    return sections[day]


def shell_json_response(prompt: str) -> dict:
    cmd = [
        'gemini',
        '--model', MODEL,
        '--output-format', 'json',
        '-p',
        prompt,
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, check=True)
    outer = json.loads(proc.stdout)
    response = outer.get('response', '').strip()
    if not response:
        raise RuntimeError('Gemini returned empty response')
    return json.loads(response)


def build_wednesday_payload(section: dict) -> dict:
    prompt = f"""
你是兒童帶讀網頁編輯。請把下面這一段來源，改寫成適合周三單頁帶讀的繁體中文內容。

硬規則：
- 只輸出 JSON，不要 markdown，不要額外解釋。
- 語氣自然、孩子易懂，但不要幼稚。
- 用繁體中文，偏召會用語，優先用「召會」不用「教會」。
- 不要提年齡、年級、來源網址、製作備註，也不要用「年輕時」「這個年紀」這類年齡暗示。
- 忠於原意，但可改寫成更順的敘述。
- storyParagraphs 4~5 段；takeaways 恰好 3 點；prayerParagraphs 3~4 段。
- verseText 只放經文內容；verseRef 只放出處。

回傳 schema：
{{
  "lessonTheme": "...",
  "pageSubtitle": "...",
  "storyParagraphs": ["..."],
  "takeaways": ["...", "...", "..."],
  "verseText": "...",
  "verseRef": "...",
  "summary": "...",
  "prayerParagraphs": ["..."]
}}

來源資訊：
- 課次：第{section['lesson']}課
- 段落：{section['day']}．{section['title']}
- 正文：
{section['body']}

可參考的禱讀經文：
{section['verse'] or '（請從正文中選一節最貼切的經文）'}

操練重點：
{section['practice'] or '請依正文自然整理。'}
""".strip()
    return shell_json_response(prompt)


def build_sunday_payload(section: dict) -> dict:
    prompt = f"""
你是兒童主日帶讀網頁編輯。請把下面這一段來源，改寫成適合主日版閱讀頁的繁體中文內容。

硬規則：
- 只輸出 JSON，不要 markdown，不要額外解釋。
- 語氣自然、孩子易懂，但不要幼稚。
- 用繁體中文，偏召會用語，優先用「召會」不用「教會」。
- 不要提年齡、年級、來源網址、製作備註，也不要用「年輕時」「這個年紀」這類年齡暗示。
- 忠於原意，但可整理成「主日帶讀」節奏。
- overviewParagraphs 恰好 2 段；focusPoints 恰好 3 點；readingParagraphs 4~5 段；applicationParagraphs 3 段；takeaways 3 點；questions 3 題；prayerParagraphs 2 段。
- verseText 只放經文內容；verseRef 只放出處。

回傳 schema：
{{
  "pageTitle": "...",
  "pageDescription": "...",
  "lead": "...",
  "overviewParagraphs": ["...", "..."],
  "focusPoints": ["...", "...", "..."],
  "readingTitle": "...",
  "readingParagraphs": ["..."],
  "applicationTitle": "...",
  "applicationParagraphs": ["...", "...", "..."],
  "applicationQuote": "...",
  "takeaways": ["...", "...", "..."],
  "questions": ["...", "...", "..."],
  "verseText": "...",
  "verseRef": "...",
  "prayerParagraphs": ["...", "..."]
}}

來源資訊：
- 課次：第{section['lesson']}課
- 段落：{section['day']}．{section['title']}
- 正文：
{section['body']}

可參考的禱讀經文：
{section['verse'] or '（請從正文中選一節最貼切的經文）'}

操練重點：
{section['practice'] or '請依正文自然整理。'}
""".strip()
    return shell_json_response(prompt)


def html_paragraphs(items: List[str]) -> str:
    return '\n'.join(f'            <p>{html.escape(item)}</p>' for item in items)


def html_list_items(items: List[str], indent: str = '            ') -> str:
    return '\n'.join(f'{indent}<li>{html.escape(item)}</li>' for item in items)


def render_wednesday(section: dict, payload: dict, week_label: str, week_tag: str) -> str:
    file_title = f"Lesson{section['lesson']} — {payload['pageSubtitle']}"
    return f"""<!DOCTYPE html>
<html lang=\"zh-Hant\">
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
  <title>{html.escape(file_title)}</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Georgia', 'Noto Serif TC', '思源宋體', serif;
      background: #f9f4ec;
      color: #3a2e24;
      min-height: 100vh;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 2rem 1rem;
    }}
    .card {{
      background: #fff8f0;
      border-radius: 18px;
      box-shadow: 0 6px 32px rgba(120, 80, 30, 0.13);
      max-width: 720px;
      width: 100%;
      overflow: hidden;
      border: 1px solid #f0dfc8;
    }}
    .header {{
      background: linear-gradient(135deg, #8f5a2f 0%, #b27442 62%, #d19859 100%);
      padding: 2rem 2rem 1.5rem;
      text-align: center;
    }}
    .lesson-label {{ font-size: 0.82rem; letter-spacing: 0.18em; color: rgba(255, 240, 215, 0.85); margin-bottom: 0.45rem; }}
    .lesson-title {{ font-size: 1.6rem; font-weight: 700; color: #fff8ee; letter-spacing: 0.05em; margin-bottom: 0.5rem; text-shadow: 0 2px 8px rgba(80, 30, 0, 0.28); }}
    .lesson-subtitle {{ font-size: 1.08rem; font-weight: 700; color: rgba(255, 235, 185, 0.96); letter-spacing: 0.08em; }}
    .divider-line {{ height: 3px; background: linear-gradient(90deg, transparent, rgba(255, 235, 190, 0.55), transparent); margin-top: 1.2rem; }}
    .body {{ padding: 1.8rem 2rem 2rem; display: flex; flex-direction: column; gap: 1.6rem; }}
    .section-title {{ font-size: 1.05rem; font-weight: 700; color: #8b4513; margin-bottom: 0.7rem; display: flex; align-items: center; gap: 0.4rem; }}
    .story-box, .three-things, .scripture-box, .summary-box, .prayer-box {{ border-radius: 12px; padding: 1.25rem 1.4rem; }}
    .story-box {{ background: #fffaf4; border: 1px solid #f0dfc8; }}
    .story-text, .summary-text, .prayer-text {{ font-size: 1.03rem; line-height: 2; color: #3a2e24; text-align: justify; }}
    .story-text p + p, .prayer-text p + p {{ margin-top: 0.9em; }}
    .three-things {{ background: #fef9ef; border-left: 4px solid #d4924a; }}
    .three-things ol {{ padding-left: 1.4rem; display: flex; flex-direction: column; gap: 0.65rem; }}
    .three-things li {{ font-size: 1.02rem; line-height: 1.75; color: #4a3020; }}
    .scripture-box {{ background: linear-gradient(135deg, #fdf3e3, #fae8cc); text-align: center; }}
    .scripture-text {{ font-size: 1.08rem; font-style: italic; line-height: 1.9; color: #5c3d1e; font-weight: 500; }}
    .scripture-ref {{ margin-top: 0.6rem; font-size: 0.88rem; color: #8b6040; }}
    .summary-box {{ background: #fffdf7; border: 1px dashed #d9b17a; }}
    .prayer-box {{ background: #fdf6ee; border: 1px dashed #d4a070; }}
    .footer-divider {{ text-align: center; padding: 0.7rem 2rem 0.5rem; font-size: 0.82rem; color: #c0a080; letter-spacing: 0.12em; border-top: 1px solid #f0dfc8; }}
    .footer {{ text-align: center; padding: 0.3rem 2rem 1.2rem; font-size: 0.78rem; color: #b08060; letter-spacing: 0.08em; }}
  </style>
</head>
<body>
  <div class=\"card\">
    <div class=\"header\">
      <div class=\"lesson-label\">Lesson {section['lesson']} · {week_label}</div>
      <div class=\"lesson-title\">{html.escape(payload['lessonTheme'])}</div>
      <div class=\"lesson-subtitle\">周三 {html.escape(payload['pageSubtitle'])}</div>
      <div class=\"divider-line\"></div>
    </div>

    <div class=\"body\">
      <div>
        <div class=\"section-title\">📖 今日故事</div>
        <div class=\"story-box\">
          <div class=\"story-text\">
{html_paragraphs(payload['storyParagraphs'])}
          </div>
        </div>
      </div>

      <div>
        <div class=\"section-title\">✨ 故事學到的三件事</div>
        <div class=\"three-things\">
          <ol>
{html_list_items(payload['takeaways'], indent='            ')}
          </ol>
        </div>
      </div>

      <div>
        <div class=\"section-title\">📜 禱讀經文</div>
        <div class=\"scripture-box\">
          <div class=\"scripture-text\">{html.escape(payload['verseText'])}</div>
          <div class=\"scripture-ref\">{html.escape(payload['verseRef'])}</div>
        </div>
      </div>

      <div>
        <div class=\"section-title\">📝 每日信息總結</div>
        <div class=\"summary-box\">
          <div class=\"summary-text\">{html.escape(payload['summary'])}</div>
        </div>
      </div>

      <div>
        <div class=\"section-title\">🙏 一起禱告</div>
        <div class=\"prayer-box\">
          <div class=\"prayer-text\">
{html_paragraphs(payload['prayerParagraphs'])}
          </div>
        </div>
      </div>
    </div>

    <div class=\"footer-divider\">——————END——————</div>
    <div class=\"footer\">聖經之旅 第一冊 · {lesson_label(section['lesson'])} · {week_tag}</div>
  </div>
</body>
</html>
"""


def render_sunday(section: dict, payload: dict, week_label: str, week_tag: str, filename: str) -> str:
    title = payload['pageTitle']
    description = payload['pageDescription']
    return f"""<!doctype html>
<html lang=\"zh-Hant\">
<head>
  <meta charset=\"utf-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
  <title>{html.escape(title)}</title>
  <meta name=\"description\" content=\"{html.escape(description)}\" />
  <style>
    :root {{
      --bg: #f6f1e8;
      --paper: #fffaf2;
      --ink: #2f2a25;
      --muted: #6f6559;
      --line: #e6d7bf;
      --gold: #c29045;
      --gold-deep: #966b2f;
      --olive: #6f7d55;
      --rose: #b56a59;
      --shadow: 0 16px 40px rgba(88, 63, 30, 0.12);
    }}
    * {{ box-sizing: border-box; }}
    html {{ scroll-behavior: smooth; }}
    body {{
      margin: 0;
      color: var(--ink);
      font-family: \"Noto Sans TC\", \"PingFang TC\", \"Microsoft JhengHei\", sans-serif;
      line-height: 1.9;
      background:
        radial-gradient(1000px 480px at 110% -10%, rgba(194, 144, 69, 0.16), transparent 55%),
        radial-gradient(900px 420px at -10% 100%, rgba(111, 125, 85, 0.16), transparent 55%),
        var(--bg);
    }}
    .grain::before {{
      content: \"\";
      position: fixed;
      inset: 0;
      pointer-events: none;
      opacity: 0.05;
      background-image: radial-gradient(rgba(68, 48, 24, 0.28) 0.7px, transparent 0.7px);
      background-size: 4px 4px;
      z-index: 0;
    }}
    .wrap {{ position: relative; z-index: 1; width: min(1020px, 92vw); margin: 28px auto 56px; }}
    .hero {{ position: relative; overflow: hidden; border: 1px solid var(--line); border-radius: 28px; padding: clamp(26px, 5vw, 48px); background: linear-gradient(140deg, #fffdf8 0%, #fff5e7 100%); box-shadow: var(--shadow); }}
    .hero::after {{ content: \"\"; position: absolute; right: -120px; top: -120px; width: 320px; height: 320px; border-radius: 50%; background: radial-gradient(circle, rgba(194, 144, 69, 0.28) 0%, rgba(194, 144, 69, 0) 70%); }}
    .badge-row {{ display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }}
    .badge {{ display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 999px; border: 1px solid #ebd6b0; background: #fff7e8; color: var(--gold-deep); font-size: 13px; font-weight: 700; letter-spacing: 0.02em; }}
    h1 {{ margin: 0 0 12px; font-family: \"Noto Serif TC\", \"PMingLiU\", serif; font-size: clamp(34px, 6vw, 58px); line-height: 1.15; color: #2d2419; }}
    .lead {{ margin: 0; max-width: 66ch; color: var(--muted); font-size: clamp(16px, 2.1vw, 19px); }}
    .hero-actions {{ margin-top: 22px; display: flex; flex-wrap: wrap; gap: 12px; }}
    .button {{ display: inline-block; padding: 12px 18px; border-radius: 14px; text-decoration: none; font-weight: 700; transition: transform .18s ease, box-shadow .18s ease; }}
    .button.primary {{ color: white; background: linear-gradient(180deg, var(--gold) 0%, var(--gold-deep) 100%); box-shadow: 0 10px 20px rgba(150, 107, 47, 0.28); }}
    .button.secondary {{ color: var(--ink); background: rgba(255,255,255,0.74); border: 1px solid var(--line); }}
    .button:hover {{ transform: translateY(-1px); }}
    .intro-grid, .content-grid, .summary-grid {{ display: grid; gap: 18px; margin-top: 22px; }}
    .intro-grid {{ grid-template-columns: 1.15fr 0.95fr; }}
    .content-grid {{ grid-template-columns: 1fr 1fr; }}
    .summary-grid {{ grid-template-columns: 1fr 1fr; }}
    .card {{ border: 1px solid var(--line); border-radius: 22px; background: var(--paper); padding: 22px; box-shadow: 0 10px 24px rgba(88, 63, 30, 0.08); }}
    .card h2, .card h3 {{ margin: 0 0 12px; font-family: \"Noto Serif TC\", serif; color: #352a1e; line-height: 1.45; }}
    .eyebrow {{ margin: 0 0 8px; color: var(--gold-deep); font-size: 13px; text-transform: uppercase; letter-spacing: .09em; font-weight: 700; }}
    .section-tag {{ display: inline-flex; align-items: center; gap: 8px; margin-bottom: 12px; padding: 6px 12px; border-radius: 999px; font-size: 13px; font-weight: 700; color: #fff; }}
    .wednesday {{ background: linear-gradient(180deg, #6f7d55 0%, #53613e 100%); }}
    .thursday {{ background: linear-gradient(180deg, #b56a59 0%, #8f4d40 100%); }}
    p {{ margin: 0 0 14px; }}
    ul, ol {{ margin: 0; padding-left: 22px; }}
    li + li {{ margin-top: 8px; }}
    .focus-box {{ background: linear-gradient(180deg, #fffdf9 0%, #f7efe2 100%); }}
    .scripture {{ border-left: 4px solid var(--gold); background: #fff3df; border-radius: 12px; padding: 14px 16px; color: #5f4b31; margin-top: 14px; }}
    .prayer {{ background: #fdf6ee; border: 1px dashed #d4a070; border-radius: 14px; padding: 16px; }}
    .footer-note {{ margin-top: 22px; text-align: center; color: #8a7a66; font-size: 13px; }}
    @media (max-width: 920px) {{ .intro-grid, .content-grid, .summary-grid {{ grid-template-columns: 1fr; }} }}
    @media (max-width: 560px) {{ .wrap {{ margin-top: 18px; }} .hero, .card {{ border-radius: 18px; }} .button {{ width: 100%; text-align: center; }} }}
  </style>
</head>
<body class=\"grain\">
  <main class=\"wrap\">
    <section class=\"hero\">
      <div class=\"badge-row\">
        <span class=\"badge\">📖 主日帶讀</span>
        <span class=\"badge\">{lesson_label(section['lesson'])} · {week_label}</span>
        <span class=\"badge\">來源段落：{html.escape(section['day'])}</span>
        <span class=\"badge\">主題：{html.escape(payload['readingTitle'])}</span>
      </div>
      <h1>{html.escape(title)}</h1>
      <p class=\"lead\">{html.escape(payload['lead'])}</p>
      <div class=\"hero-actions\">
        <a class=\"button primary\" href=\"#reading\">開始閱讀</a>
        <a class=\"button secondary\" href=\"#discussion\">看主日重點</a>
      </div>
    </section>

    <section class=\"intro-grid\" aria-label=\"overview\">
      <article class=\"card\">
        <p class=\"eyebrow\">Overview</p>
        <h2>這一篇在提醒什麼？</h2>
{html_paragraphs(payload['overviewParagraphs'])}
      </article>

      <aside class=\"card focus-box\">
        <p class=\"eyebrow\">Sunday Focus</p>
        <h2>主日可以先抓三句話</h2>
        <ul>
{html_list_items(payload['focusPoints'], indent='          ')}
        </ul>
      </aside>
    </section>

    <section id=\"reading\" class=\"content-grid\" aria-label=\"reading-content\">
      <article class=\"card\">
        <span class=\"section-tag wednesday\">{html.escape(section['day'])}｜正文帶讀</span>
        <h2>{html.escape(payload['readingTitle'])}</h2>
{html_paragraphs(payload['readingParagraphs'])}
      </article>

      <article class=\"card\">
        <span class=\"section-tag thursday\">主日｜補充提醒與操練</span>
        <h2>{html.escape(payload['applicationTitle'])}</h2>
{html_paragraphs(payload['applicationParagraphs'])}
        <div class=\"scripture\"><strong>可帶的一句提醒</strong><br />{html.escape(payload['applicationQuote'])}</div>
      </article>
    </section>

    <section id=\"discussion\" class=\"summary-grid\" aria-label=\"discussion-guide\">
      <article class=\"card focus-box\">
        <p class=\"eyebrow\">Lead the Group</p>
        <h3>這篇可以帶出的三件事</h3>
        <ol>
{html_list_items(payload['takeaways'], indent='          ')}
        </ol>
      </article>

      <article class=\"card\">
        <p class=\"eyebrow\">Discussion</p>
        <h3>可直接帶的三個問題</h3>
        <ul>
{html_list_items(payload['questions'], indent='          ')}
        </ul>
      </article>
    </section>

    <section class=\"summary-grid\" aria-label=\"verse-prayer\">
      <article class=\"card\">
        <p class=\"eyebrow\">Verse</p>
        <h3>今天的經文</h3>
        <div class=\"scripture\">{html.escape(payload['verseText'])}<br />{html.escape(payload['verseRef'])}</div>
      </article>

      <article class=\"card\">
        <p class=\"eyebrow\">Prayer</p>
        <h3>一起禱告</h3>
        <div class=\"prayer\">{'<br /><br />'.join(html.escape(p) for p in payload['prayerParagraphs'])}</div>
      </article>
    </section>

    <p class=\"footer-note\">{html.escape(filename)} · sequential lesson-page workflow · {week_tag}</p>
  </main>
</body>
</html>
"""


def build_pair(force: bool = False) -> int:
    state = load_state()
    now = now_taipei()
    week_tag = current_week_tag(now)
    week_label = human_week_label(now)
    last_built = state.get('lastBuilt')
    if last_built and last_built.get('weekTag') == week_tag and not force:
        print(f"EXISTS {last_built['wednesday']['file']}")
        print(f"EXISTS {last_built['sunday']['file']}")
        return 0

    pointer = dict(state['next'])
    stop_after = int(state.get('stopAfterLesson', 999))
    built_entries = []

    for kind in ['wednesday', 'sunday']:
        if int(pointer['lesson']) > stop_after:
            raise RuntimeError(f"Next lesson {pointer['lesson']} exceeds stopAfterLesson {stop_after}")
        section = get_section(pointer)
        if kind == 'wednesday':
            payload = build_wednesday_payload(section)
            filename = f"lesson{section['lesson']}-{week_tag}.html"
            rendered = render_wednesday(section, payload, week_label, week_tag)
        else:
            payload = build_sunday_payload(section)
            filename = f"lesson{section['lesson']}-{week_tag}-sun.html"
            rendered = render_sunday(section, payload, week_label, week_tag, filename)
        file_path = WORKSPACE / filename
        file_path.write_text(rendered, encoding='utf-8')
        built_entries.append({
            'kind': kind,
            'lesson': section['lesson'],
            'day': section['day'],
            'title': section['title'],
            'file': filename,
            'url': f"{SITE_ROOT}/{filename}",
            'sourceUrl': section['url'],
        })
        pointer = advance_pointer(pointer)

    state['next'] = pointer
    state['lastBuilt'] = {
        'weekTag': week_tag,
        'builtAt': now.isoformat(),
        'wednesday': built_entries[0],
        'sunday': built_entries[1],
    }
    save_state(state)

    print(f"BUILT {built_entries[0]['file']}")
    print(f"BUILT {built_entries[1]['file']}")
    print(f"NEXT lesson{state['next']['lesson']} {state['next']['day']}")
    return 0


def render_links() -> int:
    state = load_state()
    last_built = state.get('lastBuilt') or {}
    week_tag = current_week_tag()
    if last_built.get('weekTag') != week_tag:
        print('NO_REPLY')
        return 0
    wed = last_built['wednesday']
    sun = last_built['sunday']
    print('📖 周三／主日導讀')
    print(f"周三：https://kinnsou.github.io/temporary/{wed['file']}")
    print(f"主日：https://kinnsou.github.io/temporary/{sun['file']}")
    return 0


def show_state() -> int:
    print(json.dumps(load_state(), ensure_ascii=False, indent=2))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description='Build sequential Wednesday/Sunday lesson pages.')
    sub = parser.add_subparsers(dest='command', required=True)

    build_parser = sub.add_parser('build')
    build_parser.add_argument('--force', action='store_true')
    sub.add_parser('links')
    sub.add_parser('state')

    args = parser.parse_args()

    try:
        if args.command == 'build':
            return build_pair(force=args.force)
        if args.command == 'links':
            return render_links()
        if args.command == 'state':
            return show_state()
    except subprocess.CalledProcessError as exc:
        sys.stderr.write(exc.stderr or exc.stdout or str(exc))
        return exc.returncode or 1
    except Exception as exc:
        sys.stderr.write(f'{type(exc).__name__}: {exc}\n')
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
