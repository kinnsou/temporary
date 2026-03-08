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
- Deepgram API key 已驗證可打通 API，但新的關鍵發現是：Mark 前兩段 Telegram `.ogg` 語音檔本身幾乎是靜音（volumedetect 約 `mean -91 dB / max -90 dB`），這會讓 STT provider 幾乎不可能穩定辨識
- Deepgram 最新官方模型語系表與本機 docs 有落差：本機 docs 舉 `nova-3` 當 quick start，但官方當前語系表顯示中文（`zh`/`zh-TW`）是在 `nova-2`，不是 `nova-3`
- 目前已把 OpenClaw audio provider 切到 `deepgram/nova-2` + `language=zh-TW`，並開 `punctuate` / `smart_format`；下一步應要求 Mark 傳一段更大聲、更清楚的新 Telegram 語音再測
- 這版 OpenClaw 若把 Deepgram key 直接塞進 `openclaw.json` 的 `models.providers.deepgram.apiKey`，config schema 會報 `baseUrl` / `models` 缺失，造成 gateway 一直因 invalid config 重載；較正確的做法是用 `DEEPGRAM_API_KEY` 環境變數，不要硬塞那個 config 位置
- Mark 曾手動把錯誤的 `models.providers.deepgram` 區塊刪掉，gateway 就恢復穩定；之後遇到 provider key 時要優先走 env 方式，特別是依 USER.md 規則寫進 `/home/node/openclaw-host/docker-compose.override.yml`
- 在發現前兩段 Telegram 語音檔幾乎靜音後，Mark 合理懷疑真正問題可能是麥克風/收音而不只是 provider；若後續要快速驗證，先恢復到較簡單且已知可跑通的 Groq 路線也是合理策略
- 重新切回 Groq (`whisper-large-v3-turbo` + `Please transcribe verbatim.`) 後，Mark 傳了一段更清楚的新 Telegram 語音，成功轉寫出 `Hello, 测试好了吗?这样可以吗?有清楚吗?`，代表 Groq 在收音正常時其實可用
- 後續再測一段有背景噪音的中文 Telegram 語音，Groq 仍成功轉寫成 `嘿哈古,怎麼樣?現在聲音清不清楚?背景是有點吵。不過應該是可以了吧?`；唯一明顯小誤差是把「哈酷」聽成「哈古」，但不影響理解
- Telegram inbound 語音（Groq STT）在收音正常時已可用，但內建 `tts` 工具目前在這台產出的 Telegram 音檔是 0 bytes；工具雖回 `[[audio_as_voice]]` + `MEDIA:` 路徑，實體檔案卻是空的，導致 Telegram `sendVoice` 報 `file must be non-empty`
- 因此目前 Telegram 語音互動狀態是：STT 基本打通、TTS 尚未打通；Speechify 若要用，應改定位成優先拿來補「我回語音給 Mark」這條，而不是 STT
- 已確認 Speechify 官方最小 TTS API 可走 `POST https://api.speechify.ai/v1/audio/speech`，用 Bearer token + JSON body（至少含 `input`、`voice_id`，建議明確帶 `audio_format`），非 streaming 回傳會在 `audio_data` 給 base64 音訊
- 這版 OpenClaw docs 仍沒看到原生 Speechify provider；要安全整合 Telegram 語音輸出，較適合走「隔離腳本打 Speechify API → 落地非空音檔 → 用 Telegram voice note 發送」這條，不要為了 TTS 去動主 `openclaw.json`
- 已實測這條隔離路線可行：`scripts/speechify_tts_probe.py` 能在不改主配置的前提下，透過一次性環境變數產生非空 MP3，再轉成 Telegram 可用的 OGG/Opus，並成功用 Telegram `asVoice` 送出 voice note
- 之後若 Telegram/Groq 語音再出現 placeholder transcript，先優先檢查預設 prompt 與 provider 相容性，不要先懷疑缺 skill