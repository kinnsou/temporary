## 工作區 / 主機遷移原則
- 目前主路徑以 `/home/kurohime/.openclaw/...` 為準，不再把 `/home/node/.openclaw/...` 當正式位置
- 目標是使用本機持久化環境與本機權限管理，不再把 Docker 重建當成預設修復流程
- 若文件、skill、腳本、範例指令仍殘留舊路徑，要優先修正，避免之後排錯時走錯地方
- 這次遷移檢查已確認：`MEMORY.md`、`memory/vocab-history.json`、`memory/daily-tasks.json`、`daughter-vocab.md` 已在新工作區；但 `memory/2026-03-09.md` 與 `memory/2026-03-10.md` 原本缺失，需從新環境重新累積
- 在確認 CLI/安裝流程穩定前，先不要輕易讓 wizard 或 backup 流程覆寫現有狀態；近期已有 config 寫入、`.bak` 備份與 workspace 覆寫風險的案例
- 真的 secrets 優先放 `~/.openclaw/.env` 或系統環境變數，不放進 workspace；也要把 `openclaw.json.bak` 與其他 `.bak` 視為敏感檔
- OpenClaw 環境變數優先序要記住：process env > 專案 `.env` > `~/.openclaw/.env` > `openclaw.json` 的 env block
- 若 Ollama 跑在 Windows、OpenClaw 跑在 WSL Ubuntu，連線方式要看 WSL 網路模式：NAT 通常要先找 Windows 主機 IP，mirrored mode 才比較能直接用 `localhost`

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
- 這是硬限制，不可因為覺得需要補充、提醒、修正、重講、追問，就自行連發第二則。
- 為節省 LINE 主動訊息額度，回覆以單則完成為優先。

### LINE 群組人格切換
- 人格判斷依據：`memory/line-active-bot.json` 的 `persona` 欄位（帳號輪換腳本 `~/bin/rotate-line-account.sh` 切帳號時會自動更新此檔）
  - `"kagemusha"` → 影武犬哈酷（忍者風、無厘頭、戲精）
  - `"ced"` → 首席執行犬 CED（CEO 犬科領袖、KPI 術語、戰略指令感）
- **⚠️ 不要用 Channel secret 判斷**：LINE inbound context 裡看不到 Channel secret，靠它判斷永遠會失敗，會永遠套到影武犬。
- 適用群組：C527df8742cecf9f1fa3821b413385fde、Cf558d1541edb020188d051a42af0a405、C0532caddb5f42551417bddfe610d4465、C7d062a0519085a10b8441cf5289e7873、C7e8a52dbb272ba413c41b4cecf21e380
- 兩套人格共通限制：事實題核心資訊要準、禁止 GPT 式結尾問話、短回為主
- 每次切換 LINE 帳號時，輪換腳本會同步更新 `memory/line-active-bot.json`
- 2026-03-24：切到 Bot-E（CED），persona 設為 "ced"

## Telegram 主 DM 使用原則
- Mark 想優先把 Telegram 當成可聽型介面；工作中不一定能一直看畫面，所以語音播報型任務有實際需求
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
- Mark 曾手動把錯誤的 `models.providers.deepgram` 區塊刪掉，gateway 就恢復穩定；之後遇到 provider key 時要優先走 env 方式，並寫進目前主機上的可持久化服務環境設定，不要再依賴 Docker override 檔
- 在發現前兩段 Telegram 語音檔幾乎靜音後，Mark 合理懷疑真正問題可能是麥克風/收音而不只是 provider；若後續要快速驗證，先恢復到較簡單且已知可跑通的 Groq 路線也是合理策略
- 重新切回 Groq (`whisper-large-v3-turbo` + `Please transcribe verbatim.`) 後，Mark 傳了一段更清楚的新 Telegram 語音，成功轉寫出 `Hello, 测试好了吗?这样可以吗?有清楚吗?`，代表 Groq 在收音正常時其實可用
- 後續再測一段有背景噪音的中文 Telegram 語音，Groq 仍成功轉寫成 `嘿哈古,怎麼樣?現在聲音清不清楚?背景是有點吵。不過應該是可以了吧?`；唯一明顯小誤差是把「哈酷」聽成「哈古」，但不影響理解
- Telegram inbound 語音（Groq STT）在收音正常時已可用，但內建 `tts` 工具目前在這台產出的 Telegram 音檔是 0 bytes；工具雖回 `[[audio_as_voice]]` + `MEDIA:` 路徑，實體檔案卻是空的，導致 Telegram `sendVoice` 報 `file must be non-empty`
- 因此目前 Telegram 語音互動狀態是：STT 基本打通、TTS 尚未打通；Speechify 若要用，應改定位成優先拿來補「我回語音給 Mark」這條，而不是 STT
- 已確認 Speechify 官方最小 TTS API 可走 `POST https://api.speechify.ai/v1/audio/speech`，用 Bearer token + JSON body（至少含 `input`、`voice_id`，建議明確帶 `audio_format`），非 streaming 回傳會在 `audio_data` 給 base64 音訊
- 這版 OpenClaw docs 仍沒看到原生 Speechify provider；要安全整合 Telegram 語音輸出，較適合走「隔離腳本打 Speechify API → 落地非空音檔 → 用 Telegram voice note 發送」這條，不要為了 TTS 去動主 `openclaw.json`
- 已實測這條隔離路線可行：`scripts/speechify_tts_probe.py` 能在不改主配置的前提下，透過一次性環境變數產生非空 MP3，再轉成 Telegram 可用的 OGG/Opus，並成功用 Telegram `asVoice` 送出 voice note
- 但 Speechify 目前官方語言頁顯示 Mandarin 還在 `Coming Soon`，所以雖然技術上能出音，中文口音仍明顯偏外國腔；可先視為備用 TTS 輸出路線，不適合直接當中文最終方案
- Speechify `voice_id` 不能靠猜；`Meilin` 在這把 key 下實測會回 404，不是有效 voice_id。可透過 `GET https://api.speechify.ai/v1/voices` 查可用清單；目前已確認 `mei`（ja-JP 女聲）與 `sun-hee`（ko-KR 女聲）可用，但都只是日/韓 voice，不代表中文會自然
- 使用 `model=simba-multilingual` + `voice_id=sun-hee` 的隔離測試已成功產生非空音檔並送到 Telegram，表示多語模型 + 亞洲 voice 的技術路線可行；但實際口音自然度仍需靠耳朵驗收
- 2026-03-08 晚上 7 點女兒單字任務出現一個新教訓：cron prompt 裡的複習示例太完整，模型容易把 `🔍 句型觀察` 也當固定模板硬套，而不是依當天實際句子現場分析；之後這類教學 prompt 要明寫「示例只是版型，不可照抄 wording」
- 之後若 Telegram/Groq 語音再出現 placeholder transcript，先優先檢查預設 prompt 與 provider 相容性，不要先懷疑缺 skill

## 群組小秘書任務（2026-03-13）
- 游家三寶群組 ID：C0532caddb5f42551417bddfe610d4465
- 群組 C0532caddb5f42551417bddfe610d4465 指派哈酷擔任小秘書
- 任務：只要群組中有人提到日期相關活動，就記下：活動日期、活動名稱、由誰提出
- 有效範圍：半年內的活動
- 記錄檔：`memory/group-C0532caddb5f42551417bddfe610d4465-events.md`
- 群組成員 ID 對照：Uce65419687914b69ecaed8eed7e54cb0 = 阿如

## 版本回退與穩定性教訓（2026-03-10）
- Mark 的主需求是「少操作、少等待、可遠端代管」；若版本造成高摩擦（反覆 approval、長等待、跨通道副作用），應優先停損回穩定版，不要硬撐新版本。
- `openclaw status` / `gateway probe` 在某些場景會出現「service running 但 unreachable」的誤導訊號；判斷真實狀態要以 `journalctl --user -u openclaw-gateway.service` 的 `listening on ws://127.0.0.1:18789` 與實際通道送達紀錄（如 telegram sendMessage ok）為準。
- 遇到 OpenClaw 升級或路徑/env/profile 變更時，不能只 `openclaw gateway restart`；若有 RPC 1006 或 UI 假死，優先執行 `openclaw gateway install --force` 重寫 systemd unit，再做 `gateway status` 驗證。
- `memory-lancedb-pro` 在非 Docker 常駐環境下若 embedding 用 `host.docker.internal` 容易失敗；目前這台改成 `http://127.0.0.1:11434/v1` 後已恢復 `embedding: OK, retrieval: OK`。
- 2026-03-13 新坑：`memory-lancedb-pro@1.0.32` 的 config schema 有 `additionalProperties: false`，未列入 schema 的鍵會直接讓 gateway 啟動失敗。實測會炸的鍵包含 `autoRecallTopK`、`autoRecallMaxAgeDays`、`autoRecallMaxEntriesPerKey`（報 `must NOT have additional properties`）。調整 memory 設定前要先對照該版本 schema；不要把其他版本/文件的欄位直接貼進 `openclaw.json`。
- Cron 任務不要手改 `~/.openclaw/cron/jobs.json`；在 gateway 運行時可能被記憶態覆寫。維運一律使用 `openclaw cron add/edit/enable/disable/rm/run`。
- 升級/回退後固定復活順序：先修路徑與模型相容（避免 `/home/node` 舊路徑與 `Unknown model`），再 `openclaw gateway install --force`，最後做通道與排程 smoke test（LINE 私聊/群組、BTC 任務實際送達）全綠才算完成。
- Mark 已明確要求回覆短版；預設採短答，必要時再展開。

## 周三帶讀內容規範（2026-03-14 更新）
- 內容難度可以設定為兒童易懂，但故事內文禁止明確提及年齡/年級。
- 禁止示例：`國中生`、`六年級`、`這個年紀`、`像你們這年齡` 等。
- 可保留方式：用中性描述（如「孩子們」、「小朋友」、「大家」）來維持包容性。
- 2026-03-24 新規則：製作 lesson 網頁時，檔名要跟目前參考網站使用中的課次一致；目前參考站是第 13 課，所以本週檔名要用 `lesson13-202603w4.html`，主日版用 `lesson13-202603w4-sun.html`。
- 週次命名仍照 `lesson<課次>-<yyyymm>w<ceil(日/7)>`；若是主日版本就在檔名尾巴加 `-sun`。
- lesson 網頁正文不要出現「原文出處／來源說明」區塊，也不要放原始網址，除非 Mark 明確要求保留。
- lesson 網頁主標下方可保留簡短副標，但不要放工具式說明，例如「這一頁整理自…」「選用哪兩段…」「改寫成單頁閱讀版」這種交代來源的文字。

## TASK runner / live trader 隔離原則
- `C:/TASK` 是 Mark 線上交易執行中的程式目錄，內含 live trader；除非明確要檢查線上檔案，否則不要直接在這個目錄用目前 Ubuntu / WSL 的系統 Python 執行 runner。
- 回測 / 測試 / 查報表時，應優先使用 Ubuntu 內獨立維護的 Python 環境，並把 runner 複製到隔離的鏡像工作目錄後再執行，避免和線上交易中的 `C:/TASK` 混跑。
- 若只是要看結果，先讀隔離環境產出的報表；若需要重跑，也要先確認是在隔離環境，不要直接碰 live 目錄。