## 安全性設定（來自官方文件）
- 定期執行安全審計：`openclaw security audit`
- 重要檢查項目：
  - gateway.bind 應設為 loopback（本機）
  - gateway.auth 需要強 token
  - groupPolicy 群組需設 requireMention
  - 檔案權限：~/.openclaw 不能 world-writable 或 world-readable
- 目前設定：bind=lan（有風險，但本機使用可接受），auth token 已設定
- 每次設定改動後要跑一次 audit 確認

## 通訊軟體 Line 的發話原則
- LINE 訊息只啟用回覆一句話機制，因為line的主動發送額度，一個月只有200則
- 若只使用一句話，而無法表達完整，就在有人再度發訊息時，予以補充的回應

## Telegram 主 DM 使用原則
- 長期在同一個 Telegram 私聊視窗工作，context 很容易膨脹
- 主題完成、切換專案、或 status 顯示 context 偏高時，應主動提醒 Mark 可用 `/new`
- 在建議 `/new` 前，先把長期規則整理到 `MEMORY.md`，把當前專案摘要整理到 `memory/YYYY-MM-DD.md`
- 讀大型工具輸出時要優先摘要、截斷、分段，避免整段長輸出直接灌進對話上下文

## 英文單字任務（女兒 LINE）
- 新字範圍：台灣普遍認定的國中必會 1000 單
- 每日固定：3 個新字 + 2 個複習
- 新字永不重複，直到 1000 單全部學完
- 權威去重來源：`memory/vocab-history.json`
- 複習題型不能只是問記不記得，要改成「引導式填空 + 中文句意 + 白話句型提示」
- 文法重點優先放在動詞定位、be 動詞後形容詞、片語搭配、受詞位置
- 對孩子輸出時，不要用 `S+V` / `S+V+O` / `S+V+C` 這類抽象術語
- 新字區用 emoji 輕量格式，不寫「發音」「意思」字樣；複習區不要直接把英文答案寫在題目下方

## OpenClaw 新模型導入經驗
- 未來遇到 GPT-5.5、Sonnet 4.7 這類新模型時，不能只 patch runtime resolver
- 若 `/model <provider/model>` 報 `is not allowed`，常見真正原因是 `openclaw.json` 的 allowlist（`agents.defaults.models`）沒有放行新模型
- 實際修復順序通常是：source patch → build → gateway restart → 檢查 config allowlist / default model → 再驗證 `/model`
- 目前已完成 `openai-codex/gpt-5.4` 啟用，並設為預設 primary