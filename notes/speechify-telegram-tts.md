# Speechify → Telegram voice note (no `openclaw.json` changes)

Date: 2026-03-08 UTC

## Goal

Find the safest test path for generating Speechify TTS audio and later sending it to Telegram as a voice note **without editing** `/home/node/.openclaw/openclaw.json`, `jobs.json`, or any cron/vocab task.

## What I confirmed

### 1) Minimal Speechify API call

From official Speechify docs:

- Quickstart: `https://docs.sws.speechify.com/docs/get-started/quickstart`
- API intro: `https://docs.sws.speechify.com/api-reference/api-reference/introduction`
- Audio speech endpoint: `https://docs.sws.speechify.com/api-reference/api-reference/tts/audio/speech.mdx`

Minimal request:

```http
POST https://api.speechify.ai/v1/audio/speech
Authorization: Bearer <SPEECHIFY_API_KEY>
Content-Type: application/json
```

Minimal JSON body:

```json
{
  "input": "Hello from Speechify",
  "voice_id": "george"
}
```

Useful safe explicit version:

```json
{
  "input": "Hello from Speechify",
  "voice_id": "george",
  "audio_format": "mp3"
}
```

Important doc details:

- `input` and `voice_id` are required.
- Non-streaming response is JSON.
- Audio is returned as base64 in `audio_data`.
- Supported `audio_format` values: `wav`, `mp3`, `ogg`, `aac`, `pcm`.
- Docs say default is currently `wav`, but recommend always passing the format you expect.

### 2) OpenClaw local Telegram voice-note path

From local OpenClaw build files:

- Telegram voice-compatible audio extensions include `.oga`, `.ogg`, `.opus`, `.mp3`, `.m4a`.
- Telegram voice-compatible MIME types include `audio/ogg`, `audio/opus`, `audio/mpeg`, `audio/mp3`, `audio/mp4`, `audio/x-m4a`, `audio/m4a`.
- When `asVoice: true`, Telegram send path uses `sendVoice(...)` for compatible audio.

So the safe delivery path is:

1. generate a local audio file via Speechify
2. preferably convert to `OGG/Opus` for maximum Telegram voice-note compatibility
3. send it with OpenClaw `message.send` using `asVoice: true`

## Local artifacts created

### Probe script

`/home/node/.openclaw/workspace/scripts/speechify_tts_probe.py`

What it does:

- reads API key from env var (default `SPEECHIFY_API_KEY`)
- calls Speechify directly
- decodes `audio_data`
- writes local file
- verifies file is non-empty
- optionally creates a Telegram-friendly `OGG/Opus` file with `ffmpeg`
- does **not** read or modify `openclaw.json`
- does **not** persist any secret

### Example commands

Generate MP3 only:

```bash
SPEECHIFY_API_KEY='...' python3 /home/node/.openclaw/workspace/scripts/speechify_tts_probe.py \
  --text 'Hello Mark, this is a Speechify probe.' \
  --voice-id george \
  --audio-format mp3
```

Generate Speechify output plus Telegram-ready OGG/Opus:

```bash
SPEECHIFY_API_KEY='...' python3 /home/node/.openclaw/workspace/scripts/speechify_tts_probe.py \
  --text 'Hello Mark, this is a Speechify probe.' \
  --voice-id george \
  --audio-format ogg \
  --telegram-voice
```

If direct `ogg` output is weird for a given voice/model, safer fallback:

```bash
SPEECHIFY_API_KEY='...' python3 /home/node/.openclaw/workspace/scripts/speechify_tts_probe.py \
  --text 'Hello Mark, this is a Speechify probe.' \
  --voice-id george \
  --audio-format mp3 \
  --telegram-voice
```

That gives both:

- `speechify-probe.mp3`
- `speechify-probe.telegram.ogg`

## Telegram send plan (not executed here)

Safest later send via OpenClaw tool:

```json
{
  "action": "send",
  "channel": "telegram",
  "target": "<chat-or-user>",
  "media": "/home/node/.openclaw/workspace/tmp/speechify-tts/speechify-probe.telegram.ogg",
  "asVoice": true
}
```

Fallback if only MP3 exists:

```json
{
  "action": "send",
  "channel": "telegram",
  "target": "<chat-or-user>",
  "media": "/home/node/.openclaw/workspace/tmp/speechify-tts/speechify-probe.mp3",
  "asVoice": true
}
```

## Local non-Speechify pipeline check

I also verified the **local Telegram-audio preparation step** on this machine:

- generated a small synthetic MP3 with `ffmpeg`
- transcoded it to `.ogg`
- confirmed the resulting codec is `opus`
- confirmed the resulting file is non-empty

So the `ffmpeg` side of the route is healthy; the remaining unknown is only the live authenticated Speechify API call.

## What blocked a full live success in this subagent run

I did **not** find a usable `SPEECHIFY_API_KEY` in this shell environment.

A quick environment check showed no `SPEECHIFY_*` variables exposed to the subagent runtime, so I could not complete a real authenticated Speechify call without introducing a secret manually.

That means:

- the route is implemented
- the probe script is ready
- but the final “non-empty audio file created from the real Speechify API” step still needs a temporary API key at runtime

## Safest next step

Run the probe with a **temporary shell env var only** (not written to config files), confirm non-empty output, then send the resulting local file to Telegram with `asVoice: true`.

Recommended first live test:

```bash
export SPEECHIFY_API_KEY='YOUR_REAL_KEY'
python3 /home/node/.openclaw/workspace/scripts/speechify_tts_probe.py \
  --text 'Hello Mark, this is the first isolated Speechify Telegram voice test.' \
  --voice-id george \
  --audio-format mp3 \
  --telegram-voice
```

Then inspect output size:

```bash
ls -lh /home/node/.openclaw/workspace/tmp/speechify-tts/
```

If the `.telegram.ogg` file is non-zero, it is ready for Telegram voice-note sending.

## Extra note

Local OpenClaw chat-command UI currently lists built-in TTS providers as `edge`, `elevenlabs`, and `openai`; I did not see native Speechify TTS provider wiring in the local UI/config surface. So the cleanest no-config-change route is **direct API script + local file + Telegram `asVoice` send**.
