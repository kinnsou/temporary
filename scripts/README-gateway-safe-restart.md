# Gateway Safe Restart (LKG Auto-Rollback)

Script: `scripts/gateway-safe-restart.sh`

## What it does

1. Takes a snapshot of key files before restart
2. Restarts gateway (prefers Docker Compose recreate)
3. Runs health checks
   - `GET /healthz`
   - `POST /line/webhook` (when LINE is enabled)
4. If checks fail, restores the **last known good** snapshot and restarts once
   - If no LKG exists yet, it uses the current pre-restart snapshot as rollback baseline
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

- Startup can be slow after container recreate. Tunables:
  - `CHECK_TIMEOUT_SECONDS` (default `300`)
  - `STARTUP_GRACE_SECONDS` (default `8`)


- If Docker Compose is available, the script uses:
  - `docker compose up -d --force-recreate openclaw-gateway`
- For env-file discovery (used by compose restart + snapshot), order is:
  1. `COMPOSE_ENV_FILE` (if set)
  2. `<HOST_DIR>/.env` (OpenClaw root env)

  `task/.env` is intentionally **not** used here (separate project env).
- Fallback restart methods:
  - `kill -USR1 <openclaw-gateway-pid>`
  - `openclaw gateway restart` (last resort)
- Stale lock recovery:
  - lock older than 15 minutes is auto-recovered

## State directory

- `~/.openclaw/workspace/.openclaw/lkg-gateway/` (or your configured workspace)
  - `snapshots/`
  - `last_known_good`
  - `events.log`
  - `failures.log`

If state files are not writable, fix ownership once:

```bash
sudo chown -R "$USER:$USER" "$HOME/.openclaw/workspace/.openclaw/lkg-gateway"
```

