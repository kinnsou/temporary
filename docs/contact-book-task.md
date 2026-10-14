# SWEET HOME 隔日聯絡簿

- Mark 於 2026-10-14 授權此固定主動圖片任務；這是新增的 LINE 排程例外，不授權日常聊天主動發話。
- 每日 19:00，Asia/Taipei，下一個日曆日，不自動跳到下一個上課日。
- 來源：https://sites.google.com/view/xinglong501/電子聯絡本
- 目標：LINE SWEET HOME，`C9f96037238840fdea144e4be8676d63e`（已用群組 session 名稱及 directory ID 核對）。
- Automation：`c905360d-6ba8-43bd-bfb5-7b8ee4be6e63`；agentTurn payload，工具僅 exec/message；無 Windows 桌面／X 登入依賴。
- 設定：`memory/contact-book-task.json`；紀錄：`memory/contact-book-state.json`。
- 提示詞：`prompts/contact-book-cron-prompt.txt`。執行腳本只擷取並鎖定，發送由原生 message 工具執行，不用 CLI 或直接 LINE API。

## 日期與發送

Google Sites 的純文字內容是舊紀錄；最新聯絡簿在五個 Canva 星期版中，每日動態更新。每次從原站重新找 embed，讀 Canva bootstrap 的實際頁面文字並核對日期、星期及可選年份；年份省略時再核對文件更新時間。從相符頁面的 image URL 取 fallback 中同一 bucket/key/version 的 S3 PNG 匯出檔，驗證 PNG 後一次只發一張原生圖片，不另發文字或連結，不使用 Flex/Card。

明日內容未發布、沒有該星期版、或文件過舊：安靜跳過，不貼最新舊圖、不貼前一天內容、不補發其他日期。每日只檢查一次，沒有新增晚間重試排程。

送出前先鎖定與寫入 durable claim；原生 message 工具取得 sent 與真實平台 messageId 後，執行腳本 `--settle-date YYYY-MM-DD --message-id ID` 才標記 sent。失敗/不明用 `--settle-date YYYY-MM-DD --failed` 阻擋重發。同日期 sent/sending/delivery_unknown 均不會重複送，後兩者須先查投遞紀錄，不能盲目清除重跑。網路或解析錯誤不假裝未發布或成功。

## 安全驗證

診斷不外發、不變更送出狀態：

```sh
python3 scripts/contact_book_daily.py --dry-run
python3 scripts/contact_book_daily.py --dry-run --date 2026-10-08 --preview /tmp/contact-book-preview.png
```

更動後至少驗證：正確日期、舊圖、錯誤星期/年份、多日期歧義、作業內日期、跨年，以及成功/中斷後重跑防重複。2026-10-14 設定時 13 項檢查通過；原圖實際抓取與 CLI LINE dry-run 通過，沒有向家庭群測試發送。10/15 當時尚未發布（星期四仍是 10/8）。

另依 Mark 指示暫停兩個第一冊經文排程：`61249a29-bd03-4c70-bf1e-0b6fd0c0ce39`（製作）及 `72d8819a-1eda-49bb-b354-f7b7765d8f3d`（發連結）。第一冊 18 課已完成，未授權改接第二冊。

2026-10-14 Mark 另行授權實際試貼 10/14 圖片。第一張直接使用 media.canva.com 動態端點，LINE API 雖確認 sent（messageId 636057282094301481），但手機顯示灰色、無法載入。改用同版本 fallback S3 PNG（位元組 SHA256 相同）以原生圖片重貼（messageId 636058009537610277），Mark 確認正常顯示、可儲存。delivery state 已保留被取代的第一張回執；此手動修正不改變每日排程只發明日圖的規則。
