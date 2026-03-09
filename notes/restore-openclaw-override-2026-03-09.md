# Restore OpenClaw override (2026-03-09)

Current hard limit from inside the container:
- Docker CLI is not available here
- live compose project path is not mounted into this container
- `/mnt/c` is not mounted into this container either

So the agent can reconstruct the correct file, but cannot directly write the live host compose file from inside this runtime.

## Restored file prepared here

`/home/node/.openclaw/workspace/notes/docker-compose.override.restored-2026-03-09.yml`

## What it restores

- `user: root`
- `ffmpeg`
- `chromium`
- `/mnt/c/Task -> /home/node/task`
- `/mnt/c/temp -> /home/node/temp`
- `/home/kurohime/openclaw -> /home/node/openclaw-host`
- loopback-only port publishing (`127.0.0.1`)
- `openclaw-cli.profiles: ["manual"]`

## Likely old live path (from snapshots)

`/home/kurohime/openclaw/docker-compose.override.yml`

## Minimal host-side flow

1. Copy restored file to the live compose path.
2. Recreate the stack.
3. Verify:
   - `docker compose ps`
   - ports show `127.0.0.1:18789` / `127.0.0.1:18790`
   - `/home/node/task` exists in container
   - `/home/node/temp` exists in container
   - `ffmpeg` exists in container
