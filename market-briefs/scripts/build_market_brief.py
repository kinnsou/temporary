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

TWSE_URL = "https://openapi.twse.com.tw/v1/exchangeReport/TWT48U_ALL"
TPEX_URL = "https://www.tpex.org.tw/openapi/v1/tpex_exright_prepost"
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
            sections["market"] = block.strip()
        elif first.startswith("💬"):
            sections["social"] = block.strip()
    return sections


def block_to_html(block: str, *, ordered: bool = True) -> str:
    if not block:
        return ""
    lines = [line.strip() for line in block.splitlines() if line.strip()]
    heading = html.escape(lines[0])
    body = lines[1:]
    lis: list[str] = []
    paras: list[str] = []
    for line in body:
        m = re.match(r"^(\d+)\.\s*(.+)", line)
        if m and ordered:
            lis.append(f"<li>{html.escape(m.group(2))}</li>")
        elif line.startswith("-"):
            lis.append(f"<li>{html.escape(line.lstrip('- ').strip())}</li>")
        else:
            paras.append(f"<p>{html.escape(line)}</p>")
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
            extras.append(f"息 {html.escape(r['cash_dividend'])}")
        if r["stock_dividend_ratio"] != "未公告":
            extras.append(f"股 {html.escape(r['stock_dividend_ratio'])}")
        if r["subscription_ratio"] != "未公告":
            sub = f"增資 {html.escape(r['subscription_ratio'])}"
            if r["subscription_price"] != "未公告":
                sub += f"｜認購 {html.escape(r['subscription_price'])}"
            extras.append(sub)
        detail = "；".join(extras) if extras else "未公告"
        trs.append(
            "<tr>"
            f"<td class='date'>{html.escape(r['date'][5:].replace('-', '/'))}</td>"
            f"<td><strong>{html.escape(r['code'])}</strong><br><span>{html.escape(r['name'])}</span></td>"
            f"<td>{html.escape(r['market'])}</td>"
            f"<td><span class='pill'>{html.escape(r['event'])}</span></td>"
            f"<td>{detail}</td>"
            "</tr>"
        )
    more = ""
    if max_rows and len(rows) > max_rows:
        more = f"<p class='muted table-note'>另有 {len(rows) - max_rows} 檔未展開。</p>"
    return (
        "<div class='table-wrap'><table>"
        "<thead><tr><th>日期</th><th>代號 / 名稱</th><th>市場</th><th>類型</th><th>配息 / 配股 / 增資</th></tr></thead>"
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
  <meta name="description" content="一條網址版台股早報，整合新聞、台股焦點與除權息日曆。" />
  <style>
    :root {{
      --bg: #f3efe7;
      --paper: #fffaf2;
      --ink: #29241e;
      --muted: #70675c;
      --line: #e3d2b6;
      --gold: #bd8741;
      --gold-deep: #875c25;
      --green: #607756;
      --red: #b56b59;
      --shadow: 0 16px 44px rgba(83, 58, 28, 0.13);
    }}
    * {{ box-sizing: border-box; }}
    html {{ scroll-behavior: smooth; }}
    body {{
      margin: 0;
      color: var(--ink);
      font-family: "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", sans-serif;
      line-height: 1.85;
      background:
        radial-gradient(980px 480px at 110% -10%, rgba(189, 135, 65, 0.18), transparent 55%),
        radial-gradient(860px 420px at -10% 110%, rgba(96, 119, 86, 0.15), transparent 55%),
        var(--bg);
    }}
    body::before {{ content: ""; position: fixed; inset: 0; pointer-events: none; opacity: .045; background-image: radial-gradient(rgba(68,48,24,.32) .7px, transparent .7px); background-size: 4px 4px; }}
    .wrap {{ position: relative; z-index: 1; width: min(1120px, 92vw); margin: 28px auto 60px; }}
    .hero {{ position: relative; overflow: hidden; border: 1px solid var(--line); border-radius: 30px; padding: clamp(26px, 5vw, 50px); background: linear-gradient(140deg, #fffdf8 0%, #fff3df 100%); box-shadow: var(--shadow); }}
    .hero::after {{ content: ""; position: absolute; right: -120px; top: -120px; width: 340px; height: 340px; border-radius: 50%; background: radial-gradient(circle, rgba(189,135,65,.28) 0%, rgba(189,135,65,0) 70%); }}
    .badge-row {{ display:flex; flex-wrap:wrap; gap:10px; margin-bottom:18px; }}
    .badge {{ display:inline-flex; align-items:center; gap:8px; padding:6px 12px; border-radius:999px; border:1px solid #ead5ae; background:#fff7e8; color:var(--gold-deep); font-size:13px; font-weight:800; letter-spacing:.02em; }}
    h1 {{ margin:0 0 12px; font-family:"Noto Serif TC", "PMingLiU", serif; font-size:clamp(34px, 6vw, 60px); line-height:1.14; color:#2b2118; }}
    h2, h3 {{ font-family:"Noto Serif TC", "PMingLiU", serif; line-height:1.35; color:#33281d; }}
    .lead {{ margin:0; max-width:72ch; color:var(--muted); font-size:clamp(16px, 2.05vw, 19px); }}
    .hero-actions {{ margin-top:22px; display:flex; flex-wrap:wrap; gap:12px; }}
    .button {{ display:inline-block; padding:12px 18px; border-radius:14px; text-decoration:none; font-weight:800; }}
    .button.primary {{ color:white; background:linear-gradient(180deg, var(--gold) 0%, var(--gold-deep) 100%); box-shadow:0 10px 20px rgba(135,92,37,.24); }}
    .button.secondary {{ color:var(--ink); background:rgba(255,255,255,.75); border:1px solid var(--line); }}
    .grid {{ display:grid; gap:18px; margin-top:22px; }}
    .two {{ grid-template-columns: 1fr 1fr; }}
    .three {{ grid-template-columns: repeat(3, 1fr); }}
    .card {{ border:1px solid var(--line); border-radius:22px; background:var(--paper); padding:22px; box-shadow:0 10px 24px rgba(83,58,28,.08); }}
    .card h2, .card h3 {{ margin:0 0 12px; }}
    .card p {{ margin: 0 0 12px; }}
    .eyebrow {{ margin:0 0 8px; color:var(--gold-deep); font-size:13px; text-transform:uppercase; letter-spacing:.09em; font-weight:800; }}
    .metric {{ font-size: clamp(30px, 5vw, 46px); font-weight:900; line-height:1; color:#31261b; }}
    .muted {{ color: var(--muted); }}
    ol, ul {{ margin: 0; padding-left: 22px; }}
    li + li {{ margin-top: 8px; }}
    .focus {{ background: linear-gradient(180deg, #fffdf9 0%, #f7efe2 100%); }}
    .news h2 {{ font-size: 22px; }}
    .news ol {{ padding-left: 24px; }}
    .radar {{ border-left: 5px solid var(--green); }}
    .new {{ border-left: 5px solid var(--red); }}
    .table-wrap {{ width:100%; overflow:auto; border:1px solid var(--line); border-radius:16px; background:#fffdf8; }}
    table {{ width:100%; border-collapse:collapse; min-width:720px; }}
    th, td {{ padding:12px 14px; border-bottom:1px solid #eadcc7; text-align:left; vertical-align:top; }}
    th {{ color:#6d5635; background:#fff4df; font-size:13px; letter-spacing:.04em; }}
    td.date {{ white-space:nowrap; font-weight:800; color:#5e6f4d; }}
    td span {{ color:var(--muted); font-size:13px; }}
    .pill {{ display:inline-flex; padding:3px 9px; border-radius:999px; background:#f0e2ca; color:#6b4b20; font-weight:800; font-size:13px; }}
    .table-note {{ margin-top:10px !important; }}
    .footer-note {{ margin-top:22px; text-align:center; color:#887964; font-size:13px; }}
    @media (max-width: 980px) {{ .two, .three {{ grid-template-columns: 1fr; }} }}
    @media (max-width: 560px) {{ .wrap {{ margin-top:18px; }} .hero, .card {{ border-radius:18px; }} .button {{ width:100%; text-align:center; }} }}
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
      <p class="lead">新聞重點、台股焦點與除權息日曆整理成一頁；新聞放前面，除權息放最後補充。</p>
      <div class="hero-actions">
        <a class="button primary" href="#brief">看今日早報</a>
        <a class="button secondary" href="#radar">看除權息日曆</a>
      </div>
    </section>

    <section id="brief" class="grid two" aria-label="morning-brief">
      <article class="card news">{block_to_html(sections.get('global', ''))}</article>
      <article class="card news">{block_to_html(sections.get('taiwan', ''))}</article>
      <article class="card news">{block_to_html(sections.get('market', ''), ordered=False)}</article>
      <article class="card news">{block_to_html(sections.get('social', ''), ordered=False)}</article>
    </section>

    <section id="radar" class="grid three" aria-label="ex-rights-summary">
      <article class="card focus">
        <p class="eyebrow">New Notices</p>
        <div class="metric">{len(new_observed)}</div>
        <p class="muted">今晨新出現的個股除權息公告。</p>
      </article>
      <article class="card focus">
        <p class="eyebrow">Next 7 Days</p>
        <div class="metric">{len(week_stock)}</div>
        <p class="muted">{html.escape(date.strftime('%m/%d'))}～{html.escape(week_end.strftime('%m/%d'))} 一週內個股；ETF / 債券型商品另有 {len(week_fund)} 檔未列。</p>
      </article>
      <article class="card focus">
        <p class="eyebrow">1–2 Months</p>
        <div class="metric">{len(future_window_stock)}</div>
        <p class="muted">{html.escape(future_label)} 之間已排程個股。</p>
      </article>
    </section>

    <section class="grid" aria-label="new-ex-rights">
      <article class="card new">
        <p class="eyebrow">First Look</p>
        <h2>今晨新增除權息公告</h2>
        {new_table}
      </article>
    </section>

    <section class="grid two" aria-label="ex-rights-radar">
      <article class="card radar">
        <p class="eyebrow">Dividend Radar</p>
        <h2>一週內除權息個股</h2>
        {render_table(week_stock)}
      </article>
      <article class="card radar">
        <p class="eyebrow">Forward Queue</p>
        <h2>1-2 個月內 遠期除權息</h2>
        {render_table(future_window_stock, max_rows=12)}
      </article>
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
        "sources": {"twse": TWSE_URL, "tpex": TPEX_URL},
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
