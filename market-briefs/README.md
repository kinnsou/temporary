# 台股早報 / 除權息日曆試作

這個資料匣集中放「一條網址版早報」與除權息資料，避免檔案散在 repo 根目錄。

## 資料源選擇

目前採官方結構化 API：

- 上市：TWSE OpenAPI `https://openapi.twse.com.tw/v1/exchangeReport/TWT48U_ALL`
- 上櫃：TPEx OpenAPI `https://www.tpex.org.tw/openapi/v1/tpex_exright_prepost`

理由：官方來源、JSON 格式穩定、欄位可追溯，比抓民間日曆網頁更適合排程長期跑。

## 早報規則草案

1. 每天早報產生 HTML 頁面，LINE 群組只發一條網址。
2. 新聞是主內容，除權息日曆放頁面最後補充。
3. 「今晨新增除權息公告」用 `data/latest-exrights-snapshot.json` 比對前次快照；正式 07:00 排程每天跑時，等同抓今晨新出現的第一手公告，即使除權息日在 2～3 個月後也會列出。
4. 「一週內除權息」只列四碼個股；ETF、債券 ETF、REIT、主動式基金先排除，降低噪音。
5. 「1-2 個月內 遠期除權息」是排隊觀察區，只看 1～2 個月之間的個股，避免把所有未來資料一次塞進頁面。
6. 正式接上 cron 後，頁面只保留給群組讀者有用的內容，不放製作說明或 debug 資訊。
7. 所有中文可見文字固定使用繁體中文（zh-Hant）。若來源或模型輸出混入簡體字，建頁前必須轉繁體；例如 `炼油廠` 要輸出為 `煉油廠`。

## 產生今日試作頁

```bash
python3 market-briefs/scripts/build_market_brief.py --date YYYY-MM-DD
```

輸出：

- `market-brief-YYYY-MM-DD.html`
- `data/exrights-YYYY-MM-DD.json`
- `data/latest-exrights-snapshot.json`
- `index.html` 指向最新頁
