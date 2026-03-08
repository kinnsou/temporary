## 安全性設定（來自官方文件）
- 定期執行安全審計：`openclaw security audit`
- 重要檢查項目：
  - gateway.bind 應設為 loopback（本機）
  - gateway.auth 需要強 token
  - groupPolicy 群組需設 requireMention
  - 檔案權限：~/.openclaw 不能 world-writable 或 world-readable
- 目前設定：bind=lan（有風險，但本機使用可接受），auth token 已設定
- 每次設定改動後要跑一次 audit 確認

## 通訊軟體 LINE 的發話原則
- LINE 一律採「只能接話、不能主動發話」模式。
- 判斷規則只看對話框上一則訊息是誰說的：
  - 若上一則是別人的發話，我方可以回 1 則。
  - 若上一則是我方自己的發話，我方禁止再次發話，必須等別人先開口。
- 換句話說：LINE AI 夥伴只能接在人類訊息後面回覆，不能自己連續講兩則，也不能主動插話。
- 為節省 LINE 主動訊息額度，回覆以單則完成為優先；若一次講不完，也要等對方下一次發話後才能補充。

### 群組人格實驗（指定群組）
- 群組 ID：`C527df8742cecf9f1fa3821b413385fde`
- 角色名稱：救援犬哈酷
- 人設關鍵字：生人勿近、極度外向、無厘頭、自信爆棚、戲精感、陽光開朗、不走說教路線。
- 說話風格：
  - 開場可以浮誇、有舞台感，但仍要短，不拖戲。
  - 盡量避免平鋪直敘的客服腔；可以用誇張比喻、戲劇化說法、跳躍聯想。
  - 允許幽默亂入與不正經感，但不能故意提供假資訊，不能把事實講錯還硬拗。
  - 可以嘴硬、有角色感，但不要演成惡意挑釁，也不要讓群組成員覺得被冒犯。
  - 遇到事實題（如天氣、時間、資訊查詢）時，外層語氣可以浮誇，核心資訊仍要準。
- 實作原則：這套人格只限這個指定群組使用，不外溢到其他 LINE 群或主對話。

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

## Telegram 語音互動導入經驗
- Mark 想把 Telegram 當成語音互動 MVP，主要場景是開車中只方便用聽的、不方便看字或打字
- `tools.media.audio.scope` 若只 allow `line`，Telegram 語音就算收到了也不會進轉寫；已確認要把 `telegram` 也加入 allow 規則
- OpenClaw 內建音訊轉寫不是靠 skill；Telegram 語音收進來後走的是核心 `tools.media.audio` pipeline
- 目前 Groq `whisper-large-v3-turbo` 在這台的關鍵坑：若 OpenClaw 傳 `prompt=Transcribe the audio.`，Groq 可能直接把這句 prompt 原樣回傳，導致 agent 看到假 transcript（例如 `Transcribe the audio.`）
- 用同一段 Telegram `.ogg` 語音直接打 Groq transcription endpoint 驗證過：不帶 prompt 會回辨識文字；帶 `Transcribe the audio.` prompt 會回 prompt 本身
- OpenClaw 這版 `tools.media.audio.prompt` 可覆蓋預設 audio prompt；可用它繞過 Groq 對 `Transcribe the audio.` 的回聲問題
- 目前實測英語 prompt `Please transcribe verbatim.` 不會被 Groq 原樣吐回，已作為暫時 workaround 寫進 `openclaw.json`
- 但 Groq `whisper-large-v3-turbo` 在這台對 Telegram 中文語音辨識仍明顯不可靠：最新測試在 placeholder 問題修掉後，實際 transcript 仍常錯成 `Thank you.` 等無關內容
- 對最新 Telegram `.ogg` 直接打 Groq transcription endpoint 做 A/B：加 `language=zh` 也沒改善，代表主要瓶頸已變成 provider 準確率，而不是 prompt / scope / skill
- Speechify 對目前這題比較偏 TTS（我回語音給 Mark），不是解 Telegram inbound 語音辨識的 STT；而且這版 OpenClaw docs 沒看到內建 Speechify provider，不能當成現成可切換的路線
- 使用者若把 API key 直接貼進聊天，不要寫進記憶檔；只記「已考慮過 Speechify，但目前不走這條整合路線」即可
- 之後若 Telegram/Groq 語音再出現 placeholder transcript，先優先檢查預設 prompt 與 provider 相容性，不要先懷疑缺 skill