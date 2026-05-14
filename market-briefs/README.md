# 台股早報 / 除權息日曆試作

這個資料匣集中放「一條網址版早報」與除權息資料，避免檔案散在 repo 根目錄。

## 資料源選擇

目前採官方結構化 API：

- 上市：TWSE OpenAPI `https://openapi.twse.com.tw/v1/exchangeReport/TWT48U_ALL`
- 上櫃：TPEx OpenAPI `https://www.tpex.org.tw/openapi/v1/tpex_exright_prepost`

理由：官方來源、JSON 格式穩定、欄位可追溯，比抓民間日曆網頁更適合排程長期跑。

## 早報規則草案

1. 每天早報產生 HTML 頁面，LINE 群組只發一條網址。
2. 頁面保留原早報新聞區塊，新增「除權息雷達」。
3. 「一週內除權息」只列四碼個股；ETF、債券 ETF、REIT、主動式基金先排除，降低噪音。
4. 遠期區塊只看「1～2 個月之間」的個股除權息，避免把所有未來資料一次塞進頁面。
5. 每次抓官方除權息表後與 `data/latest-exrights-snapshot.json` 比對：
   - 若新增「1～2 個月之間」的個股除權息日期，列入頁面「新增遠期公告」。
   - 正式接上 cron 後，頁面只保留給群組讀者有用的內容，不放製作說明或 debug 資訊。

## 產生今日試作頁

```bash
python3 market-briefs/scripts/build_market_brief.py --date YYYY-MM-DD
```

輸出：

- `market-brief-YYYY-MM-DD.html`
- `data/exrights-YYYY-MM-DD.json`
- `data/latest-exrights-snapshot.json`
- `index.html` 指向最新頁
