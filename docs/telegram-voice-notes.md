# Telegram 語音互動（歷史筆記 / debug notes）

> 這份檔案收納「不需要每回合都注入 prompt」的長篇技術筆記。
> 需要時再用 read 工具載入。

## 目標
- 讓 Mark 在 Telegram 私聊能用「語音輸入（STT）→文字處理→語音輸出（TTS）」互動。

## STT（語音轉文字）
- Telegram inbound 語音走 OpenClaw 核心 `tools.media.audio` pipeline。
- **Groq whisper-large-v3-turbo 已證實可用**，但有一個坑：
  - 若 OpenClaw 傳 `prompt=Transcribe the audio.`，Groq 可能把這句 prompt 原樣回傳，導致 agent 看到假 transcript。
  - workaround：改成 `Please transcribe verbatim.`（已在 config 實測不會被原樣吐回）。
- 中文辨識品質強烈依賴收音品質：
  - 曾遇到 Telegram `.ogg` 幾乎靜音（volumedetect mean ~ -91 dB），任何 STT 都會不穩。
  - 收音正常時 Groq 可轉出中英混合內容，誤差可接受（例如把「哈酷」聽成「哈古」）。

## Deepgram 路線（曾嘗試）
- Deepgram key 走 env 方式較安全；直接塞 `openclaw.json` 容易被 schema 擋。
- 曾切到 `deepgram/nova-2` + `language=zh-TW`，但後續證據顯示主要瓶頸往往是音量/收音，不一定是 provider。

## TTS（文字轉語音）
- OpenClaw 內建 `tts` 工具：目前在這台環境 **Telegram 產出的音檔會變 0 bytes**，Telegram `sendVoice` 會報 `file must be non-empty`。
- 可行 workaround（隔離腳本）：
  - `scripts/speechify_tts_probe.py`：用 Speechify API 直接產 OGG/Opus（必要時才轉檔）→ 用 Telegram voice note 發送。
  - 目前預設已調回 Mark 原本偏好的韓風女性聲線：`voice_id=sun-hee`、`model=simba-multilingual`、`audio_format=ogg`。
  - 優點：不需要為了 TTS 去動主 `openclaw.json`。
  - 缺點：Speechify 的 Mandarin 自然度仍不理想（官方頁面曾標示 Mandarin Coming Soon），可當備援。

## Speechify 備註
- 最小 API：`POST https://api.speechify.ai/v1/audio/speech`（Bearer token + JSON；回 `audio_data` base64）。
- `voice_id` 不能猜：需 `GET https://api.speechify.ai/v1/voices` 查清單。
- Groq 是 STT，不是 TTS；輸出聲音快慢主要看 TTS provider + 是否轉檔 + Telegram 上傳，而不是 Groq 本身。

## Debug checklist（快速）
1. 先確認語音檔不是靜音（音量問題比你想的常見）。
2. STT provider 先用 Groq + `Please transcribe verbatim.` 排除 placeholder 回聲問題。
3. 若要回語音給 Mark：先走 Speechify 腳本 workaround，別硬改主配置。
