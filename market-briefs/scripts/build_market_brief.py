#!/usr/bin/env python3
"""Build the one-link Taiwan market morning brief page.

The page layout intentionally follows the approved package template at:
NEWS/market-brief-package/market-brief-2026-05-21-noon.html

News content comes from memory/daily-tasks.json; dividend data comes from
TWSE / TPEx official structured endpoints.
"""
from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import re
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

TWSE_URL = "https://openapi.twse.com.tw/v1/exchangeReport/TWT48U_ALL"
TPEX_URL = "https://www.tpex.org.tw/openapi/v1/tpex_exright_prepost"
TWSE_CLOSE_URL = "https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL"
TPEX_CLOSE_URL = "https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes"
REPO_ROOT = Path(__file__).resolve().parents[2]
PROJECT_DIR = Path(__file__).resolve().parents[1]
DAILY_TASKS = REPO_ROOT / "memory" / "daily-tasks.json"
TEMPLATE_PATH = REPO_ROOT / "NEWS" / "market-brief-package" / "market-brief-2026-05-21-noon.html"

URL_RE = re.compile(r"https?://[^\s<>()\]\"]+")
MD_LINK_RE = re.compile(r"\[([^\]]+)\]\((https?://[^\s<>()\]\"]+)\)")
DATE_RE = re.compile(r"20\d{2}-\d{2}-\d{2}")


@dataclass
class Story:
    title: str
    body: str
    tag: str
    source_label: str
    source_url: str


@dataclass
class Voice:
    person: str
    handle: str
    summary_title: str
    summary_body: str
    source_label: str
    source_url: str
    avatar_class: str
    avatar_text: str


def esc(value: Any) -> str:
    return html.escape(str(value or ""), quote=False)


def esc_attr(value: Any) -> str:
    return html.escape(str(value or ""), quote=True)


def roc_to_date(value: str) -> dt.date | None:
    digits = "".join(ch for ch in str(value or "") if ch.isdigit())
    try:
        if len(digits) == 7:
            return dt.date(int(digits[:3]) + 1911, int(digits[3:5]), int(digits[5:7]))
        if len(digits) == 8:
            return dt.date(int(digits[:4]), int(digits[4:6]), int(digits[6:8]))
    except ValueError:
        return None
    return None


def fetch_json(url: str) -> list[dict[str, Any]]:
    req = urllib.request.Request(url, headers={"User-Agent": "OpenClaw market-brief builder"})
    with urllib.request.urlopen(req, timeout=25) as resp:
        text = resp.read().decode("utf-8-sig")
    data = json.loads(text)
    if not isinstance(data, list):
        raise TypeError(f"Expected list from {url}, got {type(data).__name__}")
    return data


def clean_num(value: Any, *, blank: str = "未公告") -> str:
    s = str(value or "").strip()
    if not s or s in {"0", "0.00", "0.000000", "0.00000000"}:
        return blank
    if "尚未" in s:
        return "未公告"
    try:
        f = float(s.replace(",", ""))
    except ValueError:
        return s
    out = f"{f:.8f}".rstrip("0").rstrip(".")
    return out if out else blank


def to_float(value: Any) -> float | None:
    try:
        return float(str(value or "").replace(",", "").strip())
    except ValueError:
        return None


def fetch_latest_close_prices() -> dict[tuple[str, str], dict[str, str]]:
    """Return latest official close prices by (market, code)."""
    prices: dict[tuple[str, str], dict[str, str]] = {}
    sources = [
        ("上市", TWSE_CLOSE_URL, "Code", "Name", "ClosingPrice"),
        ("上櫃", TPEX_CLOSE_URL, "SecuritiesCompanyCode", "CompanyName", "Close"),
    ]
    for market, url, code_key, name_key, price_key in sources:
        try:
            close_rows = fetch_json(url)
        except Exception:
            continue
        for raw in close_rows:
            code = str(raw.get(code_key, "")).strip()
            if not code:
                continue
            d = roc_to_date(str(raw.get("Date", "")))
            prices[(market, code)] = {
                "close": clean_num(raw.get(price_key), blank="—"),
                "close_date": d.isoformat() if d else "",
                "close_name": str(raw.get(name_key, "")).strip(),
            }
    return prices


def normalize_rows(now: dt.datetime) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for raw in fetch_json(TWSE_URL):
        d = roc_to_date(raw.get("Date", ""))
        if not d:
            continue
        rows.append({
            "market": "上市",
            "date": d.isoformat(),
            "code": str(raw.get("Code", "")).strip(),
            "name": str(raw.get("Name", "")).strip(),
            "event": str(raw.get("Exdividend", "")).strip().replace("除", ""),
            "cash_dividend": clean_num(raw.get("CashDividend")),
            "stock_dividend_ratio": clean_num(raw.get("StockDividendRatio")),
            "subscription_ratio": clean_num(raw.get("SubscriptionRatio")),
            "subscription_price": clean_num(raw.get("SubscriptionPricePerShare")),
            "stock_holding_ratio": clean_num(raw.get("StockHoldingRatio")),
            "source": "TWSE",
            "fetched_at": now.isoformat(timespec="seconds"),
        })
    for raw in fetch_json(TPEX_URL):
        d = roc_to_date(raw.get("ExRrightsExDividendDate", ""))
        if not d:
            continue
        rows.append({
            "market": "上櫃",
            "date": d.isoformat(),
            "code": str(raw.get("SecuritiesCompanyCode", "")).strip(),
            "name": str(raw.get("CompanyName", "")).strip(),
            "event": str(raw.get("ExRrightsExDividend", "")).strip().replace("除", ""),
            "cash_dividend": clean_num(raw.get("CashDividend")),
            "stock_dividend_ratio": clean_num(raw.get("StockDividendRatio")),
            "subscription_ratio": clean_num(raw.get("SubscriptionRatioToNewSharesIssued")),
            "subscription_price": clean_num(raw.get("SubscriptionPricePerShare")),
            "stock_holding_ratio": clean_num(raw.get("SubscribedProRataInThousandShares")),
            "source": "TPEx",
            "fetched_at": now.isoformat(timespec="seconds"),
        })
    close_prices = fetch_latest_close_prices()
    for row in rows:
        close = close_prices.get((row["market"], row["code"]), {})
        row["last_close"] = close.get("close", "—")
        row["last_close_date"] = close.get("close_date", "")
    rows.sort(key=lambda r: (r["date"], r["market"], r["code"]))
    return rows


def is_stock(row: dict[str, str]) -> bool:
    # Common Taiwan listed/OTC stocks are four numeric digits. This keeps ETFs,
    # bond ETFs, REITs, ETNs, and active fund tickers out of the individual-stock tables.
    return bool(re.fullmatch(r"\d{4}", row.get("code", "")))


def item_key(row: dict[str, str]) -> str:
    return "|".join([row["date"], row["market"], row["code"], row["event"]])


def add_months(value: dt.date, months: int) -> dt.date:
    month = value.month - 1 + months
    year = value.year + month // 12
    month = month % 12 + 1
    month_days = [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    return dt.date(year, month, min(value.day, month_days[month - 1]))


def load_morning_content(date_str: str) -> str:
    with DAILY_TASKS.open(encoding="utf-8") as f:
        data = json.load(f)
    content = data.get(date_str, {}).get("morning_news", {}).get("content", "")
    if not content:
        raise KeyError(f"No morning_news.content for {date_str} in {DAILY_TASKS}")
    return content.strip()


def split_morning(content: str) -> dict[str, str]:
    title = content.splitlines()[0].strip()
    sections: dict[str, str] = {"title": title}
    pattern = re.compile(r"\n\n(?=(?:🌍 國際新聞|🇹🇼 台灣新聞|📈 台股焦點|💬))")
    for block in pattern.split(content)[1:]:
        first = block.splitlines()[0].strip()
        if first.startswith("🌍"):
            sections["global"] = block.strip()
        elif first.startswith("🇹🇼"):
            sections["taiwan"] = block.strip()
        elif first.startswith("📈"):
            # Older cached briefs may contain this block, but the V2 page does not render it.
            sections["market"] = block.strip()
        elif first.startswith("💬"):
            sections["social"] = block.strip()
    return sections


def source_label_from_url(url: str) -> str:
    host = urlparse(url).netloc.lower().removeprefix("www.")
    if not host:
        return "來源"
    mapping = [
        ("aljazeera.com", "Al Jazeera"),
        ("taipeitimes.com", "Taipei Times"),
        ("theguardian.com", "The Guardian"),
        ("ukrinform.net", "Ukrinform"),
        ("usnews.com", "U.S. News"),
        ("cnbc.com", "CNBC"),
        ("kitco.com", "Kitco"),
        ("cna.com.tw", "中央社"),
        ("reuters.com", "Reuters"),
        ("apnews.com", "AP"),
        ("tradingeconomics.com", "Trading Economics"),
        ("twse.com.tw", "TWSE"),
        ("taifex.com.tw", "TAIFEX"),
        ("tpex.org.tw", "TPEx"),
    ]
    if host in {"x.com", "twitter.com"}:
        return "X 原文"
    if "truthsocial" in host or "supertrumptracker" in host:
        return "Truth Social"
    for suffix, label in mapping:
        if host.endswith(suffix):
            return label
    return host


def extract_links(text: str) -> tuple[str, list[tuple[str, str]]]:
    links: list[tuple[str, str]] = []

    def md_repl(m: re.Match[str]) -> str:
        label = m.group(1).strip()
        url = m.group(2).strip()
        links.append((label if label and not label.startswith("http") else source_label_from_url(url), url))
        return label

    text = MD_LINK_RE.sub(md_repl, text)

    def url_repl(m: re.Match[str]) -> str:
        raw = m.group(0)
        url = raw.rstrip(".,;，。；）)")
        trailing = raw[len(url):]
        links.append((source_label_from_url(url), url))
        return trailing

    text = URL_RE.sub(url_repl, text)
    text = re.sub(r"\s+([，。、；：）\)])", r"\1", text)
    text = re.sub(r"\s{2,}", " ", text).strip()

    deduped: list[tuple[str, str]] = []
    seen: set[str] = set()
    for label, url in links:
        if url in seen:
            continue
        seen.add(url)
        deduped.append((label, url))
    return text, deduped


def extract_source_hint(text: str, links: list[tuple[str, str]]) -> tuple[str, str]:
    """Return (clean_text, source_label). Pull a trailing parenthetical into the source label."""
    label = links[0][0] if links else "來源"
    m = re.search(r"[（(]([^（）()]*?(?:20\d{2}-\d{2}-\d{2})[^（）()]*?)[）)]\s*$", text)
    if m:
        label = m.group(1).strip()
        text = text[:m.start()].strip()
    return text.strip(), label


def shorten(text: str, max_len: int) -> str:
    text = re.sub(r"\s+", " ", text).strip(" ，。、；：")
    return text if len(text) <= max_len else text[: max_len - 1].rstrip() + "…"


def split_title_body(text: str) -> tuple[str, str]:
    text = text.strip()
    bracket = re.match(r"^【(.{2,34}?)】\s*(.+)$", text)
    if bracket:
        return shorten(bracket.group(1), 24), bracket.group(2).strip()

    for sep in ["；", "。", "，", "：", ":"]:
        idx = text.find(sep)
        if 6 <= idx <= 34:
            title = text[:idx]
            body = text[idx + 1 :].strip()
            return shorten(title, 24), body or text
    return shorten(text, 24), text


def infer_tag(text: str, fallback: str) -> str:
    rules = [
        (r"伊朗|中東|荷姆茲|油價|波灣", "Middle East · Energy"),
        (r"烏克蘭|俄羅斯|無人機|戰爭", "War · Security"),
        (r"中國|美中|關稅|稀土|礦產|洪水", "China · Policy"),
        (r"Fed|聯準會|美元|金價|殖利率|降息|CPI|通膨", "Rates · Commodities"),
        (r"台海|國防|軍售|國安|賴清德", "Taiwan · Security"),
        (r"外銷|接單|半導體|AI|HPC|台股", "Taiwan · Markets"),
        (r"疫情|伊波拉|災", "Health · Disaster"),
    ]
    for pattern, tag in rules:
        if re.search(pattern, text, re.I):
            return tag
    return shorten(fallback.split(",")[0], 28)


def parse_item_lines(block: str, *, ordered: bool) -> list[str]:
    if not block:
        return []
    lines = [line.strip() for line in block.splitlines() if line.strip()]
    items: list[str] = []
    for line in lines[1:]:
        numbered = re.match(r"^\d+\.\s*(.+)", line)
        if ordered and numbered:
            items.append(numbered.group(1).strip())
        elif line.startswith("-"):
            items.append(line.lstrip("- ").strip())
        elif not ordered:
            items.append(line)
        elif items:
            items[-1] = f"{items[-1]} {line}"
    return items


def parse_stories(block: str, *, ordered: bool = True) -> list[Story]:
    stories: list[Story] = []
    for raw in parse_item_lines(block, ordered=ordered):
        clean, links = extract_links(raw)
        clean, source_hint = extract_source_hint(clean, links)
        title, body = split_title_body(clean)
        # Avoid immediate duplication after the bold title.
        body = body.strip()
        for prefix in [title, title.rstrip("…")]:
            if prefix and body.startswith(prefix):
                body = body[len(prefix):].lstrip(" ，。、；：") or clean
                break
        source_url = links[0][1] if links else ""
        source_label = source_hint or (links[0][0] if links else "來源")
        stories.append(Story(
            title=title,
            body=body,
            tag=infer_tag(clean, source_label),
            source_label=source_label,
            source_url=source_url,
        ))
    return stories


def normalize_person(raw: str) -> tuple[str, str, str, str]:
    key = raw.lower()
    if "elon" in key or "@elonmusk" in key:
        return "Elon Musk", "@elonmusk", "musk", "E"
    if "trump" in key or "@realdonaldtrump" in key:
        return "Donald J. Trump", "@realDonaldTrump", "trump", "T"
    if "saylor" in key or "@saylor" in key:
        return "Michael Saylor", "@saylor", "saylor", "S"
    if "zelensky" in key or "澤倫斯基" in raw:
        return "Volodymyr Zelenskyy", "Ukraine President", "musk", "Z"
    if "黃仁勳" in raw or "jensen" in key:
        return "Jensen Huang", "Nvidia CEO", "saylor", "J"
    if "zuckerberg" in key or "祖克柏" in raw:
        return "Mark Zuckerberg", "Meta CEO", "musk", "Z"
    name = raw.strip("：: ") or "Topic Voice"
    return shorten(name, 28), "today", "saylor", name[:1].upper() or "V"


def voice_title(summary: str) -> str:
    s = summary.lower()
    if "spacexai" in s or "hiring" in s:
        return "SpaceXAI 招募"
    if "daylight" in s or "sunshine protection" in s:
        return "日光節約法案"
    if "對等回應" in summary or "ceasefire" in s:
        return "停火回應"
    if "bitcoin" in s or "比特幣" in summary:
        return "比特幣配置"
    if "ai" in s or "晶片" in summary:
        return "AI 與晶片"
    plain = summary.strip("「」『』\"' ")
    return shorten(plain, 14)


def parse_voices(block: str) -> list[Voice]:
    voices: list[Voice] = []
    for raw in parse_item_lines(block, ordered=False):
        clean, links = extract_links(raw)
        clean, source_hint = extract_source_hint(clean, links)
        if "：" in clean:
            raw_person, summary = clean.split("：", 1)
        elif ":" in clean:
            raw_person, summary = clean.split(":", 1)
        else:
            raw_person, summary = "Topic Voice", clean
        person, handle, avatar_class, avatar_text = normalize_person(raw_person)
        summary = summary.strip()
        source_url = links[0][1] if links else ""
        source_label = source_hint or (links[0][0] if links else "來源")
        voices.append(Voice(
            person=person,
            handle=handle,
            summary_title=voice_title(summary),
            summary_body=summary,
            source_label=source_label,
            source_url=source_url,
            avatar_class=avatar_class,
            avatar_text=avatar_text,
        ))
    return voices[:3]


def template_assets() -> str:
    text = TEMPLATE_PATH.read_text(encoding="utf-8")
    links = "\n".join(re.findall(r"<link\s+[^>]+>", text))
    css_match = re.search(r"<style>(.*?)</style>", text, re.S)
    if not css_match:
        raise ValueError(f"No <style> block found in {TEMPLATE_PATH}")
    return f"{links}\n<style>{css_match.group(1)}</style>"


ZH_WEEKDAYS = "一二三四五六日"
EN_WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
ZH_DIGITS = "〇一二三四五六七八九"


def zh_number(num: int) -> str:
    if num <= 10:
        return "十" if num == 10 else ZH_DIGITS[num]
    if num < 20:
        return "十" + ZH_DIGITS[num % 10]
    tens, ones = divmod(num, 10)
    return ZH_DIGITS[tens] + "十" + (ZH_DIGITS[ones] if ones else "")


def zh_full_date(date: dt.date) -> str:
    year = "".join(ZH_DIGITS[int(d)] for d in str(date.year))
    return f"{year}年{zh_number(date.month)}月{zh_number(date.day)}日　星期{ZH_WEEKDAYS[date.weekday()]}"


def en_full_date(date: dt.date) -> str:
    return f"{EN_WEEKDAYS[date.weekday()]}, {date.day:02d} {date.strftime('%B')} {date.year}"


def amount_cell(row: dict[str, str]) -> tuple[str, str, float | None]:
    if row.get("cash_dividend") != "未公告":
        return row["cash_dividend"], "元", to_float(row["cash_dividend"])
    if row.get("stock_dividend_ratio") != "未公告":
        return row["stock_dividend_ratio"], "股", to_float(row["stock_dividend_ratio"])
    if row.get("subscription_ratio") != "未公告":
        label = f"增資 {row['subscription_ratio']}"
        if row.get("subscription_price") != "未公告":
            label += f" / {row['subscription_price']}元"
        return label, "", to_float(row["subscription_ratio"])
    return "未公告", "", None


def render_dividend_table(rows: list[dict[str, str]], *, max_rows: int | None = None) -> str:
    subset = rows[:max_rows] if max_rows else rows
    if not subset:
        body = '<tr><td colspan="4" class="source-line">目前沒有符合條件的個股。</td></tr>'
    else:
        body_parts: list[str] = []
        prev_date = ""
        for idx, row in enumerate(subset):
            date_label = row["date"][5:].replace("-", "/")
            show_date = date_label if row["date"] != prev_date else ""
            cls = "day-break" if idx > 0 and row["date"] != prev_date else ""
            prev_date = row["date"]
            amount, unit, tier_value = amount_cell(row)
            tier_cls = "tier-3" if tier_value is not None and tier_value >= 5 else "tier-2" if tier_value is not None and tier_value >= 3 else ""
            otc = '<span class="otc">OTC</span>' if row.get("market") == "上櫃" else ""
            body_parts.append(f"""
            <tr class="{cls}">
              <td class="date">{esc(show_date)}</td>
              <td><span class="name-cell"><span class="ticker">{esc(row['code'])}</span><span class="name">{esc(row['name'])}</span><span class="type-pill">{esc(row['event'])}</span>{otc}</span></td>
              <td class="amt {tier_cls}">{esc(amount)} <small>{esc(unit)}</small></td>
              <td class="close">{esc(row.get('last_close', '—') or '—')}</td>
            </tr>""")
        if max_rows and len(rows) > max_rows:
            body_parts.append(f'<tr><td></td><td colspan="3" class="source-line">另有 {len(rows) - max_rows} 檔未展開。</td></tr>')
        body = "".join(body_parts)
    return (
        '<table class="div-table"><thead><tr>'
        '<th style="width:50px;">日期</th><th>代號 / 名稱</th>'
        '<th style="text-align:right;">配息 / 配股</th><th style="text-align:right;">昨收</th>'
        f'</tr></thead><tbody>{body}</tbody></table>'
    )


def render_news_items(stories: list[Story]) -> str:
    parts: list[str] = []
    for idx, story in enumerate(stories, start=1):
        num_cls = "num accent" if idx == 1 else "num"
        source = f'<a href="{esc_attr(story.source_url)}">{esc(story.source_label)}</a>' if story.source_url else esc(story.source_label)
        suffix = "" if story.title.endswith(("。", "！", "？", ".")) else "。"
        parts.append(f"""        <article class="news-item">
          <div class="{num_cls}">{idx:02d}</div>
          <div>
            <div class="body"><b>{esc(story.title)}{suffix}</b>{esc(story.body)}</div>
            <div class="tag">{esc(story.tag)}</div>
            <div class="source-line">SOURCE · {source}</div>
          </div>
        </article>""")
    return "".join(parts)


def render_voice_cards(voices: list[Voice]) -> str:
    parts: list[str] = []
    for voice in voices:
        source = f'<a href="{esc_attr(voice.source_url)}">{esc(voice.source_label)}</a>' if voice.source_url else esc(voice.source_label)
        suffix = "" if voice.summary_title.endswith(("。", "！", "？", ".")) else "："
        parts.append(f"""      <article class="tweet-card">
        <div class="head">
          <div class="avatar {esc_attr(voice.avatar_class)}">{esc(voice.avatar_text)}</div>
          <div class="name-line"><span class="name">{esc(voice.person)}</span><span class="handle">{esc(voice.handle)}</span></div>
          <span class="time">today</span>
        </div>
        <div class="content"><b>{esc(voice.summary_title)}{suffix}</b>{esc(voice.summary_body)}</div>
        <div class="source-line">FIRST PARTY · {source}</div>
      </article>""")
    return "".join(parts)


def render_first_look(new_observed: list[dict[str, str]]) -> str:
    if not new_observed:
        return '<div class="first-look"><span><b>First Look ·</b> 目前沒有今晨新增的個股除權息公告。</span></div>'
    chips = []
    for row in new_observed[:8]:
        amount, unit, _ = amount_cell(row)
        chips.append(f"{row['date'][5:].replace('-', '/')} {row['code']} {row['name']} {row['event']} {amount}{unit}")
    more = f"；另有 {len(new_observed) - 8} 檔" if len(new_observed) > 8 else ""
    return f'<div class="first-look"><span><b>First Look ·</b> {esc("；".join(chips) + more)}</span></div>'


def render_html(date: dt.date, rows: list[dict[str, str]], new_observed: list[dict[str, str]], morning: str) -> str:
    week_end = date + dt.timedelta(days=7)
    future_start = add_months(date, 1)
    future_end = add_months(date, 2)
    stock_rows = [r for r in rows if is_stock(r)]
    week_stock = [r for r in stock_rows if date.isoformat() <= r["date"] <= week_end.isoformat()]
    week_fund = [r for r in rows if not is_stock(r) and date.isoformat() <= r["date"] <= week_end.isoformat()]
    future_window_stock = [r for r in stock_rows if future_start.isoformat() <= r["date"] <= future_end.isoformat()]

    sections = split_morning(morning)
    page_title = sections.get("title", f"今日早報｜{date.isoformat()}")
    world = parse_stories(sections.get("global", ""), ordered=True)
    taiwan = parse_stories(sections.get("taiwan", ""), ordered=True)
    voices = parse_voices(sections.get("social", ""))
    hero_story = (world or taiwan or [Story("今日主線", "請參考下方新聞卡片。", "Brief", "", "")])[0]
    hero_sources = " / ".join(dict.fromkeys([s.source_label.split(",")[0] for s in (world[:2] + taiwan[:1]) if s.source_label])) or "Source-backed"

    date_slash = f"{date.year}/{date.month:02d}/{date.day:02d}"
    week_label = f"{date.strftime('%m/%d')}–{week_end.strftime('%m/%d')}"
    future_label = f"{future_start.strftime('%m/%d')}–{future_end.strftime('%m/%d')}"
    assets = template_assets()

    return f"""<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{esc(page_title)}</title>
{assets}
</head>
<body>
<div class="container">
  <div class="topbar">
    <div class="left">
      <span><span class="dot"></span>Morning · 07:00 TPE</span>
      <span>Official market brief</span>
    </div>
    <div class="right">
      <span>{esc(date.isoformat())}</span>
      <span><b>TWSE / TPEx</b></span>
    </div>
  </div>
</div>

<div class="container">
  <header class="masthead">
    <div>
      <h1>早報</h1>
      <p class="en-line">Market <span class="amp">&amp;</span> Brief</p>
    </div>
    <div class="masthead-meta">
      <div class="row"><span class="label">Date</span><span class="val">{esc(en_full_date(date))}</span></div>
      <div class="row"><span class="label">中文日期</span><span class="val tc">{esc(zh_full_date(date))}</span></div>
      <div class="row"><span class="label">Edition</span><span class="val">台股早報</span></div>
    </div>
  </header>
</div>

<section class="pulse">
  <div class="pulse-inner">
    <span class="pulse-item"><span class="lbl">World</span><span class="val">{len(world)}則</span></span>
    <span class="pulse-divider"></span>
    <span class="pulse-item"><span class="lbl">Taiwan</span><span class="val">{len(taiwan)}則</span></span>
    <span class="pulse-divider"></span>
    <span class="pulse-item"><span class="lbl">Voices</span><span class="val">{len(voices)}位</span></span>
    <span class="pulse-divider"></span>
    <span class="pulse-item"><span class="lbl">Dividend 7D</span><span class="val">{len(week_stock)}檔</span></span>
    <span class="pulse-tag">台股早報</span>
  </div>
</section>

<div class="container">
  <section class="hero">
    <div class="focus-card">
      <div class="qmark">&quot;</div>
      <div>
        <div class="label">Lead · 早報主結論</div>
        <div class="takeaway">{esc(hero_story.title)}</div>
        <div class="lead-body">{esc(hero_story.body)}</div>
      </div>
      <div class="by-line"><span>{esc(hero_sources)}</span><span>Morning · 01 / 03</span></div>
    </div>
    <div class="hero-side">
      <div class="hero-stat primary">
        <div class="lbl">World · 國際主線</div>
        <div class="num">{len(world)}<span class="delta">則</span></div>
        <div class="desc">{esc(world[0].title if world else hero_story.title)}</div>
        <div class="source-line">SOURCE · {esc(world[0].source_label if world else hero_story.source_label)}</div>
      </div>
      <div class="hero-stat">
        <div class="lbl">Dividend · 一週內除權息</div>
        <div class="num">{len(week_stock)}<span class="delta">檔</span></div>
        <div class="desc">{esc(week_label)} 個股；ETF / 債券型另有 {len(week_fund)} 檔未列。</div>
        <div class="source-line">SOURCE · TWSE / TPEx official API</div>
      </div>
    </div>
  </section>
</div>

<div class="container">
  <section class="news-grid">
    <div class="news-col world">
      <div class="section-head"><div class="left"><div class="eyebrow">World · Headlines</div><div class="section-title">國際<span class="en">World</span></div></div><div class="count">{len(world)}<sup>則</sup></div></div>
      <div class="news-items">{render_news_items(world)}</div>
    </div>
    <div class="news-col local">
      <div class="section-head"><div class="left"><div class="eyebrow">Taiwan · Headlines</div><div class="section-title">台灣<span class="en">Taiwan</span></div></div><div class="count">{len(taiwan)}<sup>則</sup></div></div>
      <div class="news-items">{render_news_items(taiwan)}</div>
    </div>
  </section>
</div>

<div class="container">
  <section class="social">
    <div class="section-head"><div class="left"><div class="eyebrow">Social · Topic Voices</div><div class="section-title">話題人物<span class="en">Voices</span></div></div><div class="count">{len(voices)}<sup>位</sup></div></div>
    <div class="tweet-row">{render_voice_cards(voices)}</div>
  </section>
</div>

<div class="container"><div class="ornament"><div class="line"></div><div class="glyph">§</div><div class="line"></div></div></div>

<div class="container">
  <section class="dividend">
    <div class="section-head"><div class="left"><div class="eyebrow">Dividend · Official data</div><div class="section-title">除權息<span class="en">Radar</span></div></div><div class="count" style="font-size:22px;color:var(--ink-3);font-style:italic;">TWSE / TPEx</div></div>
    <div class="stats">
      <div class="stat"><div class="lbl">New Notices</div><div class="num">{len(new_observed)}<small>件</small></div><div class="desc">今晨新出現的個股除權息公告</div></div>
      <div class="stat"><div class="lbl">Next 7 Days</div><div class="num accent">{len(week_stock)}<small>檔</small></div><div class="desc">{esc(week_label)} 一週內個股；ETF / 債券型 {len(week_fund)} 檔未列</div></div>
      <div class="stat"><div class="lbl">1–2 Months</div><div class="num">{len(future_window_stock)}<small>檔</small></div><div class="desc">{esc(future_label)} 已排程個股</div></div>
    </div>
    {render_first_look(new_observed)}
    <div class="tables-row">
      <div class="table-block"><div class="table-title">One Week · 一週內</div><div class="table-sub">本週除權息<span class="en">{esc(week_label)}</span></div>{render_dividend_table(week_stock)}</div>
      <div class="table-block"><div class="table-title">Forward Queue · 一至兩個月內</div><div class="table-sub">遠期除權息<span class="en">{esc(future_label)}</span></div>{render_dividend_table(future_window_stock, max_rows=15)}<div class="table-note"><div><b>資料來源 ·</b> TWSE / TPEx OpenAPI；昨收使用官方最近收盤資料，不可得則顯示 —。</div></div></div>
    </div>
  </section>
</div>

<div class="container"><footer class="footer"><div class="end-mark">今日早報完</div><div class="source">資料：TWSE · TPEx · 各新聞來源與人物原文</div><div class="colophon">{esc(date_slash)} · 台股早報</div></footer></div>
</body>
</html>
"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", default=dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).date().isoformat())
    ap.add_argument("--base-url", default="https://kinnsou.github.io/temporary/market-briefs")
    args = ap.parse_args()
    date = dt.date.fromisoformat(args.date)
    now = dt.datetime.now(dt.timezone(dt.timedelta(hours=8)))

    PROJECT_DIR.mkdir(parents=True, exist_ok=True)
    data_dir = PROJECT_DIR / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    rows = normalize_rows(now)
    current_keys = {item_key(r) for r in rows}
    snapshot_path = data_dir / "latest-exrights-snapshot.json"
    previous_keys: set[str] = set()
    if snapshot_path.exists():
        with snapshot_path.open(encoding="utf-8") as f:
            previous = json.load(f)
        previous_keys = set(previous.get("keys", []))
    else:
        # First run establishes the baseline. Do not announce every existing
        # future record as "new"; only future diffs after this snapshot count.
        previous_keys = set(current_keys)

    future_start = add_months(date, 1)
    future_end = add_months(date, 2)
    week_end = date + dt.timedelta(days=7)
    new_observed = [
        r for r in rows
        if is_stock(r)
        and r["date"] >= date.isoformat()
        and item_key(r) not in previous_keys
    ]
    new_observed.sort(key=lambda r: (r["date"], r["market"], r["code"]))

    data_payload = {
        "date": date.isoformat(),
        "fetched_at": now.isoformat(timespec="seconds"),
        "sources": {
            "twse": TWSE_URL,
            "tpex": TPEX_URL,
            "twse_close": TWSE_CLOSE_URL,
            "tpex_close": TPEX_CLOSE_URL,
        },
        "summary": {
            "total_rows": len(rows),
            "stock_rows": sum(is_stock(r) for r in rows),
            "week_stock_rows": sum(is_stock(r) and date.isoformat() <= r["date"] <= week_end.isoformat() for r in rows),
            "future_window": {"start": future_start.isoformat(), "end": future_end.isoformat()},
            "future_window_stock_rows": sum(is_stock(r) and future_start.isoformat() <= r["date"] <= future_end.isoformat() for r in rows),
            "new_observed_stock_rows": len(new_observed),
        },
        "rows": rows,
        "new_observed_stock_rows": new_observed,
    }
    data_path = data_dir / f"exrights-{date.isoformat()}.json"
    data_path.write_text(json.dumps(data_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    snapshot_path.write_text(json.dumps({"updated_at": now.isoformat(timespec="seconds"), "keys": sorted(current_keys)}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    morning = load_morning_content(date.isoformat())
    html_text = render_html(date, rows, new_observed, morning)
    page_path = PROJECT_DIR / f"market-brief-{date.isoformat()}.html"
    page_path.write_text(html_text, encoding="utf-8")
    index_path = PROJECT_DIR / "index.html"
    index_path.write_text(f"""<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="0; url=market-brief-{date.isoformat()}.html">
  <title>台股早報</title>
</head>
<body>
  <p><a href="market-brief-{date.isoformat()}.html">前往今日台股早報</a></p>
</body>
</html>
""", encoding="utf-8")

    print(f"Wrote {page_path.relative_to(REPO_ROOT)}")
    print(f"Wrote {data_path.relative_to(REPO_ROOT)}")
    print(f"URL {args.base_url}/market-brief-{date.isoformat()}.html")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
