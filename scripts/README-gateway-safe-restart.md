# Gateway Safe Restart (LKG Auto-Rollback)

Script: `scripts/gateway-safe-restart.sh`

## What it does

1. Takes a snapshot of key files before restart
2. Restarts gateway (prefers Docker Compose recreate)
3. Runs health checks
   - `GET /healthz`
   - `POST /line/webhook` (when LINE is enabled)
4. If checks fail, restores the **last known good** snapshot and restarts once
5. Uses a circuit breaker to avoid repeated failure loops

## Snapshot files (auto-detected)

- `~/.openclaw/openclaw.json`
- `~/openclaw-host/docker-compose.yml` (or `~/openclaw/docker-compose.yml`)
- `docker-compose.override.yml`
- `.env`

## Commands

```bash
# Health check only
scripts/gateway-safe-restart.sh --check

# Mark current files as Last Known Good baseline
scripts/gateway-safe-restart.sh --mark-good

# Normal safe restart flow (snapshot -> restart -> check -> rollback if needed)
scripts/gateway-safe-restart.sh
```

## Short command

Installed shortcut:

```bash
safe-restart
```

If your shell says `command not found`, add an alias:

```bash
echo 'alias safe-restart="$HOME/.openclaw/workspace/scripts/gateway-safe-restart.sh"' >> ~/.bashrc
source ~/.bashrc
```

It forwards all flags to `gateway-safe-restart.sh`, e.g.:

```bash
safe-restart --check
safe-restart --mark-good
```

## Notes

- If Docker Compose is available, the script uses:
  - `docker compose up -d --force-recreate openclaw-gateway`
- Fallback restart methods:
  - `openclaw gateway restart`
  - `kill -USR1 <openclaw-gateway-pid>`

## State directory

- `~/.openclaw/workspace/.openclaw/lkg-gateway/` (or your configured workspace)
  - `snapshots/`
  - `last_known_good`
  - `events.log`
  - `failures.log`

