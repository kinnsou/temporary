# OpenClaw 記憶與規則手冊（Iron Rules / Env Notes）

> **狀態通知 (2026-03-25)**：核心對話記憶已遷移至 **LanceDB Pro（memory-lancedb-pro）**。
> - 優先使用 `memory_store` / `memory_recall`（或 `openclaw memory-pro ...`）做長期記憶。
> - 本檔案只保留「跨 session 必須永遠遵守的硬規則」與「環境不變的關鍵備註」。

## 1) 工作區 / 主機不變原則
- Canonical 路徑：以 `/home/kurohime/.openclaw/...` 為準（不要再用 `/home/node/.openclaw/...`）。
- Secrets 不進 workspace：API key / token 放 `~/.openclaw/.env` 或系統環境變數。
- `.bak` 視為敏感：`openclaw.json.bak` 等備份檔不要外洩/不要貼進聊天。
- OpenClaw env 優先序：`process env > 專案 .env > ~/.openclaw/.env > openclaw.json env block`。
- Ollama（若在 Windows）+ OpenClaw（WSL）連線：NAT 常需用 Windows 主機 IP；mirrored mode 才可能直接 `localhost`。

## 2) 安全性最低要求
- 任何 config 改動後跑：`openclaw security audit`。
- 控制台與 gateway：偏好 `gateway.bind=loopback`（本機），並確保強 token。

## 3) 維運硬規則（很常踩坑）
- **Cron 不要手改** `~/.openclaw/cron/jobs.json`（gateway 運行時可能被狀態覆寫）。維運一律用：`openclaw cron add/edit/enable/disable/rm/run`。
- 升級/回退常見復活順序：
  1) 先修「模型相容 / allowlist」（避免 `/model` 顯示 not allowed）
  2) 再 `openclaw gateway install --force`
  3) 最後做通道 + cron smoke test，全綠才算完成
- `memory-lancedb-pro@1.0.32` schema `additionalProperties:false`：改 plugin config 前先對照 schema；不要把文件裡不存在的欄位直接貼進 config。

## 4) LINE 發話鐵律（永遠遵守）
- LINE 只能接話、不能主動發話（固定主動任務例外：早報/單字）。
- 每輪只回 1 則、一次說完；如果上一則是我方，必須等別人先開口。
- LINE 群組人格切換：讀 `memory/line-active-bot.json` 的 `persona`（不要用 channel secret 判斷）。

## 5) Telegram 主 DM 使用原則
- context 膨脹時要提醒 Mark 用 `/new`。
- 讀大型工具輸出要先摘要/截斷，避免整段灌進對話上下文。

## 6) 女兒英文單字（每日規格）
- 固定：3 新字 + 2 複習；新字永不重複（權威去重：`memory/vocab-history.json`）。
- 複習題型必須是「引導式填空 + 中文句意 + 白話句型提示」（不要只問記不記得）。

## 7) 周三帶讀 / lesson 網頁硬規則
- 故事內文禁止明確提及年齡/年級（不要出現「國中生、六年級、這個年紀…」）。
- lesson 檔名要跟參考站目前課次一致（例：第 13 課 → `lesson13-YYYYMMwN*.html`；主日版加 `-sun`）。

## 8) Telegram 語音互動（只留摘要）
- 詳細 debug 筆記已移出：`docs/telegram-voice-notes.md`。
- 已知關鍵：
  - Groq STT 可能回聲 `Transcribe the audio.` prompt（改用 `Please transcribe verbatim.`）。
  - 內建 `tts` 在 Telegram 可能產 0-byte 音檔（需 workaround）。

## 9) 群組小秘書任務（游家三寶）
- 群組 ID：`C0532caddb5f42551417bddfe610d4465`
- 任務：提到半年內日期活動→記下日期/活動/誰提出
- 記錄檔：`memory/group-C0532caddb5f42551417bddfe610d4465-events.md`

## 10) TASK runner / live trader 隔離原則
- `C:/TASK` 是 live trader 目錄：除非明確要查線上檔案，否則不要在那裡用 WSL/Ubuntu Python 直接執行。
- 回測/測試應使用隔離的 Ubuntu 環境與鏡像工作目錄。

## 11) Claude Code / ACPX 備註
- 目前 **不要走 ACPX runtime**（backend 未配置，短期也不優先修）。
- 若需要和 Claude Code 協作，優先使用 **本機 CLI 直接跑** 的方式。
