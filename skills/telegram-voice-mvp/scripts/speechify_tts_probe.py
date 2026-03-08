#!/usr/bin/env python3
"""Minimal Speechify TTS probe without touching OpenClaw config.

Usage examples:
  SPEECHIFY_API_KEY=... python3 scripts/speechify_tts_probe.py \
    --text 'Hello from Speechify' --voice-id george --audio-format mp3

  SPEECHIFY_API_KEY=... python3 scripts/speechify_tts_probe.py \
    --text 'Hello from Speechify' --voice-id george --audio-format ogg \
    --telegram-voice

What it does:
- Calls POST https://api.speechify.ai/v1/audio/speech
- Decodes base64 audio_data from JSON
- Verifies the output file is non-empty
- Optionally transcodes to Telegram-friendly OGG/Opus via ffmpeg

Notes:
- Reads the API key from SPEECHIFY_API_KEY by default.
- Never prints the API key.
- Does not read or modify /home/node/.openclaw/openclaw.json.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import pathlib
import subprocess
import sys
import urllib.error
import urllib.request

API_URL = "https://api.speechify.ai/v1/audio/speech"
EXT_BY_FORMAT = {
    "wav": ".wav",
    "mp3": ".mp3",
    "ogg": ".ogg",
    "aac": ".aac",
    "pcm": ".pcm",
}


def fail(message: str, code: int = 1) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(code)


def safe_json_dumps(obj: object) -> str:
    return json.dumps(obj, ensure_ascii=False, indent=2)


def decode_audio_data(audio_b64: str) -> bytes:
    try:
        return base64.b64decode(audio_b64, validate=True)
    except Exception as exc:  # pragma: no cover - defensive
        fail(f"invalid base64 audio_data: {exc}")


def ffprobe_codec(path: pathlib.Path) -> str | None:
    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-select_streams",
                "a:0",
                "-show_entries",
                "stream=codec_name",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(path),
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        return result.stdout.strip() or None
    except Exception:
        return None


def transcode_to_telegram_ogg(src: pathlib.Path, dst: pathlib.Path) -> None:
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(src),
            "-c:a",
            "libopus",
            "-b:a",
            "64k",
            str(dst),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    if not dst.exists() or dst.stat().st_size <= 0:
        fail(f"ffmpeg produced empty telegram voice file: {dst}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Probe Speechify TTS and write a local audio file.")
    parser.add_argument("--text", required=True, help="Plain text or SSML input")
    parser.add_argument("--voice-id", required=True, help="Speechify voice_id, e.g. george")
    parser.add_argument(
        "--audio-format",
        default="mp3",
        choices=sorted(EXT_BY_FORMAT.keys()),
        help="Requested Speechify output format",
    )
    parser.add_argument("--language", help="Optional locale, e.g. en-US")
    parser.add_argument("--model", help="Optional model, e.g. simba-english")
    parser.add_argument(
        "--out-dir",
        default="/home/node/.openclaw/workspace/tmp/speechify-tts",
        help="Directory for probe outputs",
    )
    parser.add_argument(
        "--api-key-env",
        default="SPEECHIFY_API_KEY",
        help="Environment variable containing the Speechify API key",
    )
    parser.add_argument(
        "--telegram-voice",
        action="store_true",
        help="Also create an OGG/Opus file for Telegram voice-note sending",
    )
    parser.add_argument(
        "--loudness-normalization",
        action="store_true",
        help="Enable Speechify loudness normalization option",
    )
    parser.add_argument(
        "--no-text-normalization",
        action="store_true",
        help="Disable Speechify text normalization option",
    )
    args = parser.parse_args()

    api_key = os.environ.get(args.api_key_env, "")
    if not api_key:
        fail(
            f"missing {args.api_key_env}. Example: export {args.api_key_env}=... then rerun."
        )

    out_dir = pathlib.Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    ext = EXT_BY_FORMAT[args.audio_format]
    base_name = "speechify-probe"
    output_path = out_dir / f"{base_name}{ext}"
    telegram_path = out_dir / f"{base_name}.telegram.ogg"

    payload: dict[str, object] = {
        "input": args.text,
        "voice_id": args.voice_id,
        "audio_format": args.audio_format,
        "options": {
            "loudness_normalization": bool(args.loudness_normalization),
            "text_normalization": not bool(args.no_text_normalization),
        },
    }
    if args.language:
        payload["language"] = args.language
    if args.model:
        payload["model"] = args.model

    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        API_URL,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read()
            status = getattr(resp, "status", None) or resp.getcode()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        fail(f"Speechify HTTP {exc.code}: {detail}")
    except Exception as exc:  # pragma: no cover - defensive
        fail(f"request failed: {exc}")

    if status != 200:
        fail(f"unexpected HTTP status {status}")

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        fail(f"response was not valid JSON: {exc}")

    audio_b64 = data.get("audio_data")
    if not isinstance(audio_b64, str) or not audio_b64:
        fail(f"response missing non-empty audio_data: {safe_json_dumps(data)}")

    audio_bytes = decode_audio_data(audio_b64)
    if len(audio_bytes) <= 0:
        fail("decoded audio_data is empty")

    output_path.write_bytes(audio_bytes)
    if output_path.stat().st_size <= 0:
        fail(f"wrote empty file: {output_path}")

    result: dict[str, object] = {
        "ok": True,
        "status": status,
        "audio_format": data.get("audio_format", args.audio_format),
        "bytes": output_path.stat().st_size,
        "output_path": str(output_path),
        "billable_characters_count": data.get("billable_characters_count"),
        "codec": ffprobe_codec(output_path),
    }

    if args.telegram_voice:
        transcode_to_telegram_ogg(output_path, telegram_path)
        result["telegram_voice_path"] = str(telegram_path)
        result["telegram_voice_bytes"] = telegram_path.stat().st_size
        result["telegram_voice_codec"] = ffprobe_codec(telegram_path)

    print(safe_json_dumps(result))


if __name__ == "__main__":
    main()
