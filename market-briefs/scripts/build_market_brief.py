#!/usr/bin/env python3
"""Build the one-link Taiwan market morning brief page.

Sources are official structured OpenAPI endpoints, not scraped HTML:
- TWSE listed ex-right/ex-dividend schedule
- TPEx OTC ex-right/ex-dividend schedule
"""
from __future__ import annotations

import argparse
import datetime as dt
import html
import json
import re
import urllib.request
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
    if not s or s == "0" or s == "0.00" or s == "0.000000" or s == "0.00000000":
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
    """Return latest official close prices by (market, code).

    The morning run happens before the Taiwan market opens, so these official
    daily-close endpoints normally represent the previous trading day's close.
    If either source is temporarily unavailable, keep the page build alive and
    leave affected rows blank rather than dropping the morning brief.
    """
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
    # bond ETFs, REITs, ETNs, and active fund tickers out of the "個股" table.
    return bool(re.fullmatch(r"\d{4}", row.get("code", "")))


def item_key(row: dict[str, str]) -> str:
    return "|".join([row["date"], row["market"], row["code"], row["event"]])


def add_months(value: dt.date, months: int) -> dt.date:
    month = value.month - 1 + months
    year = value.year + month // 12
    month = month % 12 + 1
    month_days = [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    return dt.date(year, month, min(value.day, month_days[month - 1]))


def dividend_value_html(value: str) -> str:
    amount = to_float(value)
    classes = ["dividend-value"]
    if amount is not None and amount >= 5:
        classes.append("is-high")
    elif amount is not None and amount >= 3:
        classes.append("is-mid")
    return f"<span class='{' '.join(classes)}'>{html.escape(value)}</span>"


def close_price_html(row: dict[str, str]) -> str:
    close = row.get("last_close", "—") or "—"
    if close == "—":
        return "<span class='muted'>—</span>"
    close_date = row.get("last_close_date", "")
    date_hint = ""
    if close_date:
        date_hint = f"<br><span class='close-date'>{html.escape(close_date[5:].replace('-', '/'))}</span>"
    return f"<strong class='last-close'>{html.escape(close)}</strong>{date_hint}"


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
            # Kept for backward compatibility with older saved briefs, but the
            # page no longer renders this section because it encouraged generic
            # filler instead of source-backed news.
            sections["market"] = block.strip()
        elif first.startswith("💬"):
            sections["social"] = block.strip()
    return sections


URL_RE = re.compile(r"https?://[^\s<>()\]\"]+")
MD_LINK_RE = re.compile(r"\[([^\]]+)\]\((https?://[^\s<>()\]\"]+)\)")


def inline_html(text: str) -> str:
    """Escape text while preserving source links as clickable anchors."""
    out: list[str] = []
    pos = 0
    for m in MD_LINK_RE.finditer(text):
        out.append(linkify_urls(text[pos:m.start()]))
        label = html.escape(m.group(1), quote=False)
        url = html.escape(m.group(2), quote=True)
        out.append(f"<a href=\"{url}\" target=\"_blank\" rel=\"noopener noreferrer\">{label}</a>")
        pos = m.end()
    out.append(linkify_urls(text[pos:]))
    return "".join(out)


def linkify_urls(text: str) -> str:
    out: list[str] = []
    pos = 0
    for m in URL_RE.finditer(text):
        out.append(html.escape(text[pos:m.start()], quote=False))
        raw_url = m.group(0).rstrip(".,;，。；）)")
        trailing = m.group(0)[len(raw_url):]
        url = html.escape(raw_url, quote=True)
        label = html.escape(raw_url, quote=False)
        out.append(f"<a href=\"{url}\" target=\"_blank\" rel=\"noopener noreferrer\">{label}</a>")
        out.append(html.escape(trailing, quote=False))
        pos = m.end()
    out.append(html.escape(text[pos:], quote=False))
    return "".join(out)


def source_label(url: str) -> str:
    host = urlparse(url).netloc.lower().removeprefix("www.")
    if not host:
        return "來源"
    if host in {"x.com", "twitter.com"}:
        return "X 原文"
    if "truthsocial" in host or "supertrumptracker" in host:
        return "Truth Social"
    if host.endswith("taipeitimes.com"):
        return "Taipei Times"
    if host.endswith("usnews.com"):
        return "U.S. News"
    if host.endswith("cnbc.com"):
        return "CNBC"
    if host.endswith("kitco.com"):
        return "Kitco"
    if host.endswith("aljazeera.com"):
        return "Al Jazeera"
    if host.endswith("theguardian.com"):
        return "The Guardian"
    if host.endswith("ukrinform.net"):
        return "Ukrinform"
    return host


def extract_source_links(text: str) -> tuple[str, list[tuple[str, str]]]:
    """Move inline URLs out of the story body into compact source buttons."""
    sources: list[tuple[str, str]] = []

    def md_repl(m: re.Match[str]) -> str:
        label = m.group(1).strip()
        url = m.group(2).strip()
        sources.append((label if label and not label.startswith("http") else source_label(url), url))
        return label

    without_md = MD_LINK_RE.sub(md_repl, text)

    def url_repl(m: re.Match[str]) -> str:
        raw = m.group(0)
        url = raw.rstrip(".,;，。；）)")
        trailing = raw[len(url):]
        sources.append((source_label(url), url))
        return trailing

    cleaned = URL_RE.sub(url_repl, without_md)
    cleaned = re.sub(r"\s+([，。、；：）\)])", r"\1", cleaned)
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()

    deduped: list[tuple[str, str]] = []
    seen: set[str] = set()
    for label, url in sources:
        if url in seen:
            continue
        seen.add(url)
        deduped.append((label, url))
    return cleaned, deduped


def source_links_html(sources: list[tuple[str, str]]) -> str:
    if not sources:
        return ""
    links = "".join(
        f"<a href=\"{html.escape(url, quote=True)}\" target=\"_blank\" rel=\"noopener noreferrer\">{html.escape(label)}</a>"
        for label, url in sources
    )
    return f"<p class=\"source-links\"><span>來源</span>{links}</p>"


def story_card_html(text: str, *, number: int | None = None) -> str:
    cleaned, sources = extract_source_links(text)
    marker = f"<div class=\"story-index\">{number:02d}</div>" if number is not None else ""
    cls = "story-item" if number is not None else "story-item no-index"
    return (
        f"<article class=\"{cls}\">{marker}"
        f"<div class=\"story-body\"><p>{inline_html(cleaned)}</p>{source_links_html(sources)}</div>"
        "</article>"
    )


def block_to_html(block: str, *, ordered: bool = True, cards: bool = False) -> str:
    if not block:
        return ""
    lines = [line.strip() for line in block.splitlines() if line.strip()]
    heading = html.escape(lines[0])
    body = lines[1:]
    items: list[str] = []
    lis: list[str] = []
    paras: list[str] = []
    for line in body:
        m = re.match(r"^(\d+)\.\s*(.+)", line)
        if m and ordered:
            if cards:
                items.append(m.group(2))
            else:
                lis.append(f"<li>{inline_html(m.group(2))}</li>")
        elif line.startswith("-"):
            item = line.lstrip("- ").strip()
            if cards:
                items.append(item)
            else:
                lis.append(f"<li>{inline_html(item)}</li>")
        else:
            paras.append(f"<p>{inline_html(line)}</p>")
    if cards and items:
        list_html = "<div class=\"story-list\">" + "".join(
            story_card_html(item, number=i if ordered else None)
            for i, item in enumerate(items, start=1)
        ) + "</div>"
    else:
        list_tag = "ol" if ordered else "ul"
        list_html = f"<{list_tag}>" + "".join(lis) + f"</{list_tag}>" if lis else ""
    return f"<h2>{heading}</h2>{list_html}{''.join(paras)}"


def render_table(rows: list[dict[str, str]], *, max_rows: int | None = None) -> str:
    subset = rows[:max_rows] if max_rows else rows
    if not subset:
        return '<p class="muted">目前沒有符合條件的個股。</p>'
    trs = []
    for r in subset:
        extras = []
        if r["cash_dividend"] != "未公告":
            extras.append(f"<span class='detail-item'><span class='detail-label'>息</span> {dividend_value_html(r['cash_dividend'])}</span>")
        if r["stock_dividend_ratio"] != "未公告":
            extras.append(f"<span class='detail-item'><span class='detail-label'>股</span> {dividend_value_html(r['stock_dividend_ratio'])}</span>")
        if r["subscription_ratio"] != "未公告":
            sub = f"增資 {html.escape(r['subscription_ratio'])}"
            if r["subscription_price"] != "未公告":
                sub += f"｜認購 {html.escape(r['subscription_price'])}"
            extras.append(f"<span class='detail-item'>{sub}</span>")
        detail = "；".join(extras) if extras else "未公告"
        trs.append(
            "<tr>"
            f"<td class='date'>{html.escape(r['date'][5:].replace('-', '/'))}</td>"
            f"<td><strong>{html.escape(r['code'])}</strong><br><span>{html.escape(r['name'])}</span></td>"
            f"<td>{html.escape(r['market'])}</td>"
            f"<td><span class='pill'>{html.escape(r['event'])}</span></td>"
            f"<td>{detail}</td>"
            f"<td>{close_price_html(r)}</td>"
            "</tr>"
        )
    more = ""
    if max_rows and len(rows) > max_rows:
        more = f"<p class='muted table-note'>另有 {len(rows) - max_rows} 檔未展開。</p>"
    return (
        "<div class='table-wrap'><table>"
        "<thead><tr><th>日期</th><th>代號 / 名稱</th><th>市場</th><th>類型</th><th>配息 / 配股 / 增資</th><th>昨日收盤價</th></tr></thead>"
        f"<tbody>{''.join(trs)}</tbody></table></div>{more}"
    )


def render_html(date: dt.date, rows: list[dict[str, str]], new_observed: list[dict[str, str]], morning: str) -> str:
    week_end = date + dt.timedelta(days=7)
    future_start = add_months(date, 1)
    future_end = add_months(date, 2)
    stock_rows = [r for r in rows if is_stock(r)]
    week_stock = [r for r in stock_rows if date.isoformat() <= r["date"] <= week_end.isoformat()]
    week_fund = [r for r in rows if not is_stock(r) and date.isoformat() <= r["date"] <= week_end.isoformat()]
    future_window_stock = [r for r in stock_rows if future_start.isoformat() <= r["date"] <= future_end.isoformat()]
    sections = split_morning(morning)
    date_label = f"{date.year}/{date.month:02d}/{date.day:02d}"
    future_label = f"{future_start.strftime('%m/%d')}～{future_end.strftime('%m/%d')}"
    title = html.escape(sections.get("title", f"今日早報｜{date_label}"))
    new_note = "目前沒有今晨新增的個股除權息公告。"
    new_table = f"<p class='muted'>{new_note}</p>" if not new_observed else render_table(new_observed, max_rows=12)

    return f"""<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <meta name="description" content="一條網址版台股早報，整合來源連結、第一手發表與除權息日曆。" />
  <style>
    :root {{
      --bg: #f5f7fb;
      --paper: #ffffff;
      --ink: #17202a;
      --muted: #607080;
      --line: #dce5ee;
      --accent: #165a86;
      --accent-soft: #e7f2fa;
      --gold: #b88136;
      --green: #4f7353;
      --red: #b5534b;
      --shadow: 0 18px 46px rgba(21, 42, 62, 0.10);
    }}
    * {{ box-sizing: border-box; }}
    html {{ scroll-behavior: smooth; }}
    body {{
      margin: 0;
      color: var(--ink);
      font-family: "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
      line-height: 1.82;
      background:
        linear-gradient(180deg, #eef5fb 0%, #f8fafc 40%, #f5f7fb 100%);
    }}
    .wrap {{ width: min(1160px, 92vw); margin: 24px auto 58px; }}
    .hero {{
      border: 1px solid var(--line);
      border-radius: 28px;
      padding: clamp(24px, 5vw, 48px);
      background: linear-gradient(135deg, #ffffff 0%, #eef7fd 100%);
      box-shadow: var(--shadow);
    }}
    .badge-row {{ display:flex; flex-wrap:wrap; gap:10px; margin-bottom:18px; }}
    .badge {{ display:inline-flex; align-items:center; gap:8px; padding:6px 12px; border-radius:999px; background:var(--accent-soft); color:var(--accent); font-size:13px; font-weight:900; letter-spacing:.02em; }}
    h1 {{ margin:0 0 12px; font-family:"Noto Serif TC", "PMingLiU", serif; font-size:clamp(34px, 6vw, 58px); line-height:1.14; color:#111b24; }}
    h2, h3 {{ font-family:"Noto Serif TC", "PMingLiU", serif; line-height:1.35; color:#162333; }}
    .lead {{ margin:0; max-width:76ch; color:var(--muted); font-size:clamp(16px, 2.05vw, 19px); }}
    .hero-actions {{ margin-top:22px; display:flex; flex-wrap:wrap; gap:12px; }}
    .button {{ display:inline-block; padding:12px 18px; border-radius:14px; text-decoration:none; font-weight:900; }}
    .button.primary {{ color:white; background:linear-gradient(180deg, #1e6f9f 0%, #164d78 100%); box-shadow:0 10px 20px rgba(22,77,120,.22); }}
    .button.secondary {{ color:var(--accent); background:#fff; border:1px solid var(--line); }}
    .grid {{ display:grid; gap:18px; margin-top:22px; }}
    .two {{ grid-template-columns: 1fr 1fr; }}
    .card, .section-card {{
      border:1px solid var(--line);
      border-radius:22px;
      background:var(--paper);
      padding:22px;
      box-shadow:0 10px 24px rgba(21,42,62,.06);
    }}
    .section-card h2, .card h2, .card h3 {{ margin:0 0 14px; }}
    .section-card p, .card p {{ margin: 0 0 12px; }}
    .section-card a, .card a {{ color:var(--accent); font-weight:900; text-underline-offset:3px; overflow-wrap:anywhere; }}
    .news-board {{ display:grid; grid-template-columns: 1.18fr .82fr; gap:18px; margin-top:22px; align-items:start; }}
    .news-board .full {{ grid-column: 1 / -1; }}
    .eyebrow {{ margin:0 0 8px; color:var(--accent); font-size:12px; text-transform:uppercase; letter-spacing:.12em; font-weight:900; }}
    .muted {{ color: var(--muted); }}
    .story-list {{ display:grid; gap:12px; }}
    .story-item {{
      display:grid;
      grid-template-columns: 42px 1fr;
      gap:14px;
      padding:15px;
      border:1px solid #e7edf3;
      border-radius:18px;
      background:#fbfdff;
    }}
    .story-index {{
      width:42px;
      height:42px;
      border-radius:14px;
      display:grid;
      place-items:center;
      background:var(--accent-soft);
      color:var(--accent);
      font-weight:900;
      line-height:1;
    }}
    .story-item.no-index {{ grid-template-columns: 1fr; }}
    .story-body p {{ margin:0; }}
    .source-links {{ margin-top:10px !important; display:flex; flex-wrap:wrap; align-items:center; gap:8px; color:var(--muted); font-size:13px; }}
    .source-links span {{ font-weight:900; color:#485868; }}
    .source-links a {{ display:inline-flex; align-items:center; padding:4px 9px; border-radius:999px; background:#edf5fb; border:1px solid #d7e8f4; text-decoration:none; font-size:13px; }}
    .exrights-shell {{ margin-top:24px; border-top:3px solid #d7e3eb; padding-top:22px; }}
    .section-heading {{ display:flex; justify-content:space-between; gap:18px; align-items:end; margin-bottom:16px; }}
    .section-heading h2 {{ margin:0; font-size:clamp(26px, 4vw, 36px); }}
    .section-heading p {{ margin:0; max-width:68ch; }}
    .count-tag {{ display:inline-flex; margin-left:8px; padding:2px 9px; border-radius:999px; background:#edf5fb; color:var(--accent); font-size:13px; font-weight:900; vertical-align:middle; }}
    .radar {{ border-left: 5px solid var(--green); }}
    .new {{ border-left: 5px solid var(--red); }}
    .table-wrap {{ width:100%; overflow:auto; border:1px solid var(--line); border-radius:16px; background:#fff; }}
    table {{ width:100%; border-collapse:collapse; min-width:860px; }}
    th, td {{ padding:12px 14px; border-bottom:1px solid #e5edf4; text-align:left; vertical-align:top; }}
    th {{ color:#4a5c69; background:#f0f6fb; font-size:13px; letter-spacing:.04em; }}
    td.date {{ white-space:nowrap; font-weight:900; color:#426848; }}
    td span {{ color:var(--muted); font-size:13px; }}
    .pill {{ display:inline-flex; padding:3px 9px; border-radius:999px; background:#edf3e9; color:#3f633f; font-weight:900; font-size:13px; }}
    .detail-item {{ display:inline-block; white-space:nowrap; margin-right:3px; }}
    .detail-label {{ color:#5d744c; font-weight:900; }}
    .dividend-value {{ color:#25313a; font-size:15px; font-weight:900; letter-spacing:.01em; }}
    .dividend-value.is-mid {{ font-size:18px; color:#3d532c; }}
    .dividend-value.is-high {{ font-size:21px; color:#c7372f; }}
    .last-close {{ white-space:nowrap; color:#25313a; font-size:15px; }}
    .close-date {{ color:var(--muted); font-size:12px; }}
    .table-note {{ margin-top:10px !important; }}
    .footer-note {{ margin-top:22px; text-align:center; color:#7a8792; font-size:13px; }}
    @media (max-width: 980px) {{ .two, .news-board {{ grid-template-columns: 1fr; }} .section-heading {{ display:block; }} }}
    @media (max-width: 560px) {{ .wrap {{ margin-top:16px; }} .hero, .card, .section-card {{ border-radius:18px; }} .button {{ width:100%; text-align:center; }} .story-item {{ grid-template-columns: 1fr; }} .story-index {{ width:36px; height:36px; }} }}
  </style>
</head>
<body>
  <main class="wrap">
    <section class="hero">
      <div class="badge-row">
        <span class="badge">📰 一條網址版早報</span>
        <span class="badge">{html.escape(date_label)}</span>
        <span class="badge">新聞主版</span>
        <span class="badge">除權息日曆</span>
      </div>
      <h1>{title}</h1>
      <p class="lead">追蹤國際大事、台灣要聞、第一手發言與 TWSE / TPEx 官方除權息日程。</p>
      <div class="hero-actions">
        <a class="button primary" href="#brief">看今日早報</a>
        <a class="button secondary" href="#radar">看除權息日曆</a>
      </div>
    </section>

    <section id="brief" class="news-board" aria-label="morning-brief">
      <article class="section-card full news">{block_to_html(sections.get('global', ''), cards=True)}</article>
      <article class="section-card news">{block_to_html(sections.get('taiwan', ''), cards=True)}</article>
      <article class="section-card news">{block_to_html(sections.get('social', ''), ordered=False, cards=True)}</article>
    </section>

    <section id="radar" class="exrights-shell" aria-label="ex-rights-calendar">
      <div class="section-heading">
        <div>
          <p class="eyebrow">TWSE / TPEx Official Calendar</p>
          <h2>除權息日曆</h2>
        </div>
        <p class="muted">TWSE / TPEx 官方日程，含今晨新增、一週內與遠期個股。</p>
      </div>

      <section class="grid" aria-label="new-ex-rights">
        <article class="card new">
          <p class="eyebrow">First Look</p>
          <h2>今晨新增除權息公告 <span class="count-tag">{len(new_observed)} 檔</span></h2>
          {new_table}
        </article>
      </section>

      <section class="grid two" aria-label="ex-rights-radar">
        <article class="card radar">
          <p class="eyebrow">Next 7 Days</p>
          <h2>一週內除權息個股 <span class="count-tag">{len(week_stock)} 檔</span></h2>
          <p class="muted">{html.escape(date.strftime('%m/%d'))}～{html.escape(week_end.strftime('%m/%d'))}；ETF / 債券型商品另有 {len(week_fund)} 檔未列。</p>
          {render_table(week_stock)}
        </article>
        <article class="card radar">
          <p class="eyebrow">Forward Queue</p>
          <h2>1-2 個月內 遠期除權息 <span class="count-tag">{len(future_window_stock)} 檔</span></h2>
          <p class="muted">{html.escape(future_label)} 之間已排程個股。</p>
          {render_table(future_window_stock, max_rows=15)}
        </article>
      </section>
    </section>

    <p class="footer-note">資料：TWSE / TPEx · market-briefs/market-brief-{date.isoformat()}.html</p>
  </main>
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
