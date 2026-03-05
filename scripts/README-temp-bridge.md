# Temp Bridge (C:/temp -> temporary URL)

Script: `scripts/temp-bridge.sh`

Purpose:
- Serve your temp box directory (default: `OPENCLAW_TEMP_BOX_DIR`, fallback `/mnt/c/temp`)
- Optionally expose a temporary public URL via ngrok

## Quick start

```bash
# Start local server + try ngrok tunnel automatically
$HOME/.openclaw/workspace/scripts/temp-bridge.sh start

# Show URLs
$HOME/.openclaw/workspace/scripts/temp-bridge.sh url

# Stop
$HOME/.openclaw/workspace/scripts/temp-bridge.sh stop
```

## URL behavior

- Local URL example: `http://127.0.0.1:8099/`
- Public URL appears when ngrok is available/running
- If ngrok is missing, local serving still works

## Common files

- Put files in `C:\temp` (WSL path `/mnt/c/temp`)
- Example links:
  - `https://<public>/image.png`
  - `https://<public>/index.html`

## Security note

Anything in temp bridge is intended to be shareable. Do **not** place secrets there.
This bridge does not touch or expose OpenClaw `.env` files.
