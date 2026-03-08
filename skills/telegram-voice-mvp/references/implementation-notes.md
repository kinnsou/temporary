# Telegram voice MVP implementation notes

## Scope

This reference captures the exact workflow that was already proven locally:

- **Inbound voice input**: Telegram voice message -> OpenClaw media/audio pipeline -> Groq STT
- **Outbound voice reply**: Speechify API -> local audio file -> optional ffmpeg OGG/Opus transcode -> Telegram `asVoice` send

Use this file when you need the concrete steps, config fields, or troubleshooting checklist.

## 1) Inbound STT: Groq path

### Required OpenClaw behavior

Ensure `tools.media.audio.scope` allows Telegram. If Telegram is not in scope, the voice message arrives but never enters the transcription path.

Proven working shape:

```json
{
  "tools": {
    "media": {
      "audio": {
        "scope": {
          "allow": ["line", "telegram"]
        },
        "provider": "groq",
        "models": [
          {
            "provider": "groq",
            "model": "whisper-large-v3-turbo"
          }
        ],
        "prompt": "Please transcribe verbatim."
      }
    }
  }
}
```

### Why the prompt matters

On this machine, Groq sometimes echoed the default OpenClaw prompt `Transcribe the audio.` as if it were the transcript. Replacing the prompt with `Please transcribe verbatim.` stopped that placeholder echo.

### Verification checklist

1. Confirm Telegram is inside `tools.media.audio.scope.allow`.
2. Confirm Groq is the active provider.
3. Confirm prompt is `Please transcribe verbatim.`.
4. Restart the gateway safely.
5. Send a fresh Telegram voice note with clear volume.
6. Inspect whether the transcript is meaningful.

## 2) Inbound STT troubleshooting

### Symptom: transcript is literally `Transcribe the audio.`

Cause: prompt/provider interaction bug.

Fix:

- Override `tools.media.audio.prompt`
- Use `Please transcribe verbatim.`
- Restart gateway and retest

### Symptom: transcript is nonsense like `Thank you.`

Most likely causes:

- source audio is near silent
- speech is too noisy or too quiet
- provider accuracy issue on that sample

Important prior finding: two earlier Telegram `.ogg` files were almost silent (`mean_volume` about `-91 dB`), which made every provider look broken.

### Quick audio sanity test

Use ffmpeg volumedetect on the inbound file:

```bash
ffmpeg -i /path/to/file.ogg -af volumedetect -f null -
```

If the audio is basically silent, test again with a louder 8-15 second clip before changing providers.

## 3) Outbound TTS: Speechify path

### Why use a script instead of OpenClaw config

Speechify was used as an isolated TTS route because:

- local OpenClaw docs/UI did not expose a native Speechify provider path
- built-in `tts` on this machine produced 0-byte files for Telegram voice-note tests
- the isolated script avoids risking `openclaw.json`

### Proven safe pattern

1. Export `SPEECHIFY_API_KEY` temporarily in the shell
2. Run the probe script
3. Confirm the file is non-empty
4. Prefer `.telegram.ogg` when sending as a Telegram voice note
5. Send with `message(action=send, asVoice=true)`

### Minimal Speechify request shape

```http
POST https://api.speechify.ai/v1/audio/speech
Authorization: Bearer <SPEECHIFY_API_KEY>
Content-Type: application/json
```

JSON body:

```json
{
  "input": "Hello from Speechify",
  "voice_id": "george",
  "audio_format": "mp3"
}
```

The non-streaming response returns base64 audio in `audio_data`.

## 4) Telegram voice-note delivery

### Preferred send pattern

Use the generated Telegram-friendly OGG/Opus file:

```json
{
  "action": "send",
  "channel": "telegram",
  "target": "<chat>",
  "media": "/home/node/.openclaw/workspace/tmp/speechify-tts/speechify-probe.telegram.ogg",
  "asVoice": true
}
```

### Failure mode: `file must be non-empty`

Cause: the audio file is 0 bytes.

Fix: check file size before sending. Do not blame Telegram first.

## 5) Speechify voice-id lessons

Do not guess `voice_id` values.

Use:

```http
GET https://api.speechify.ai/v1/voices
```

Prior findings:

- `Meilin` returned 404 and was not a valid voice id for the tested key
- `mei` existed but is a Japanese voice (`ja-JP`)
- `sun-hee` existed and worked with `model=simba-multilingual`

Technical success does not guarantee natural Mandarin output. Speechify Mandarin support was still weak enough that Chinese replies sounded foreign.

## 6) Known good outcomes

Confirmed locally at different times:

- Groq STT successfully transcribed a clearer Telegram sample containing mixed English and Chinese
- Groq STT stayed usable even with some background noise; one sample only misheard `哈酷` as `哈古`
- `scripts/speechify_tts_probe.py` successfully produced non-empty MP3 and Telegram OGG/Opus files
- Telegram accepted the generated `.ogg` file as a real voice note when sent with `asVoice: true`

## 7) Practical recommendation

For this setup, treat the MVP as:

- **Inbound**: Groq STT is acceptable when the microphone input is clear enough
- **Outbound**: Speechify script is a working technical fallback for Telegram voice notes, but not the final answer for natural Mandarin voice quality

If the user asks for better Chinese voice quality, keep the workflow but swap only the outbound TTS provider.
