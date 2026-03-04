#!/usr/bin/env bash
set -euo pipefail

# Gateway Safe Restart (LKG auto-rollback)
# - Snapshot config before restart
# - Restart gateway
# - Health check (/healthz + optional LINE webhook)
# - On failure, rollback to last known good snapshot and restart once
# - Circuit breaker to avoid endless restart loops

WORKSPACE="${WORKSPACE:-/home/node/.openclaw/workspace}"
OPENCLAW_JSON="${OPENCLAW_JSON:-/home/node/.openclaw/openclaw.json}"
HOST_DIR="${HOST_DIR:-/home/node/openclaw-host}"
STATE_DIR="${STATE_DIR:-$WORKSPACE/.openclaw/lkg-gateway}"
SNAPSHOT_ROOT="$STATE_DIR/snapshots"
LKG_PTR="$STATE_DIR/last_known_good"
EVENT_LOG="$STATE_DIR/events.log"
FAILURE_LOG="$STATE_DIR/failures.log"
LOCK_DIR="$STATE_DIR/lock"

GATEWAY_URL="${GATEWAY_URL:-http://127.0.0.1:18789}"
HEALTH_PATH="${HEALTH_PATH:-/healthz}"
LINE_WEBHOOK_FALLBACK="${LINE_WEBHOOK_FALLBACK:-/line/webhook}"
CHECK_TIMEOUT_SECONDS="${CHECK_TIMEOUT_SECONDS:-90}"
CHECK_INTERVAL_SECONDS="${CHECK_INTERVAL_SECONDS:-3}"
FAILURE_WINDOW_SECONDS="${FAILURE_WINDOW_SECONDS:-1800}" # 30m
FAILURE_THRESHOLD="${FAILURE_THRESHOLD:-3}"

MODE="run" # run | check | mark-good
SKIP_LINE_CHECK=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check) MODE="check"; shift ;;
    --mark-good) MODE="mark-good"; shift ;;
    --no-line-check) SKIP_LINE_CHECK=1; shift ;;
    *)
      echo "Unknown arg: $1" >&2
      echo "Usage: $0 [--check|--mark-good] [--no-line-check]" >&2
      exit 2
      ;;
  esac
done

mkdir -p "$SNAPSHOT_ROOT" "$STATE_DIR"

log() {
  local msg="$*"
  local ts
  ts="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "[$ts] $msg"
  echo "[$ts] $msg" >> "$EVENT_LOG"
}

fail() {
  log "ERROR: $*"
  exit 1
}

acquire_lock() {
  if mkdir "$LOCK_DIR" 2>/dev/null; then
    trap 'rm -rf "$LOCK_DIR"' EXIT
    return 0
  fi
  fail "Another gateway-safe-restart is running (lock: $LOCK_DIR)"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command missing: $1"
}

line_enabled() {
  if [[ ! -f "$OPENCLAW_JSON" ]]; then
    return 1
  fi
  node -e '
    const fs=require("fs");
    const p=process.argv[1];
    try{
      const cfg=JSON.parse(fs.readFileSync(p,"utf8"));
      process.exit(cfg?.channels?.line?.enabled ? 0 : 1);
    }catch{process.exit(1)}
  ' "$OPENCLAW_JSON"
}

line_webhook_path() {
  if [[ ! -f "$OPENCLAW_JSON" ]]; then
    echo "$LINE_WEBHOOK_FALLBACK"
    return 0
  fi
  node -e '
    const fs=require("fs");
    const p=process.argv[1];
    const fallback=process.argv[2];
    try{
      const cfg=JSON.parse(fs.readFileSync(p,"utf8"));
      const v=cfg?.channels?.line?.webhookPath;
      console.log((typeof v==="string" && v.trim()) ? v.trim() : fallback);
    }catch{console.log(fallback)}
  ' "$OPENCLAW_JSON" "$LINE_WEBHOOK_FALLBACK"
}

health_ok() {
  local tmp code
  tmp="$(mktemp)"
  code="$(curl -sS -m 6 -o "$tmp" -w "%{http_code}" "$GATEWAY_URL$HEALTH_PATH" || true)"
  if [[ "$code" != "200" ]]; then
    rm -f "$tmp"
    return 1
  fi
  if ! grep -q '"ok"[[:space:]]*:[[:space:]]*true' "$tmp"; then
    rm -f "$tmp"
    return 1
  fi
  rm -f "$tmp"
  return 0
}

line_webhook_ok() {
  [[ "$SKIP_LINE_CHECK" == "1" ]] && return 0
  line_enabled || return 0

  local path tmp code
  path="$(line_webhook_path)"
  tmp="$(mktemp)"
  code="$(curl -sS -m 8 -o "$tmp" -w "%{http_code}" \
    -X POST "$GATEWAY_URL$path" \
    -H 'Content-Type: application/json' \
    -d '{"events":[]}' || true)"
  rm -f "$tmp"

  [[ "$code" == "200" ]]
}

wait_healthy() {
  local elapsed=0
  while (( elapsed <= CHECK_TIMEOUT_SECONDS )); do
    if health_ok && line_webhook_ok; then
      return 0
    fi
    sleep "$CHECK_INTERVAL_SECONDS"
    elapsed=$(( elapsed + CHECK_INTERVAL_SECONDS ))
  done
  return 1
}

snapshot_now() {
  local label="$1"
  local ts dir
  ts="$(date -u +"%Y%m%dT%H%M%SZ")"
  dir="$SNAPSHOT_ROOT/${ts}-${label}"
  mkdir -p "$dir/files"

  local files=(
    "$OPENCLAW_JSON"
    "$HOST_DIR/docker-compose.yml"
    "$HOST_DIR/docker-compose.override.yml"
    "$HOST_DIR/.env"
  )

  local copied=0
  for f in "${files[@]}"; do
    if [[ -f "$f" ]]; then
      mkdir -p "$dir/files$(dirname "$f")"
      cp -a "$f" "$dir/files$f"
      copied=$((copied + 1))
    fi
  done

  if [[ "$copied" -eq 0 ]]; then
    fail "No files copied into snapshot (check paths)."
  fi

  # checksums (best effort)
  if command -v sha256sum >/dev/null 2>&1; then
    (
      cd "$dir/files"
      find . -type f -print0 | sort -z | xargs -0 sha256sum > "$dir/checksums.sha256"
    ) || true
  fi

  echo "$dir"
}

restore_snapshot() {
  local snap="$1"
  [[ -d "$snap/files" ]] || fail "Invalid snapshot: $snap"
  log "Restoring snapshot: $snap"
  while IFS= read -r -d '' src; do
    local rel target
    rel="${src#"$snap/files"}"
    target="$rel"
    mkdir -p "$(dirname "$target")"
    cp -a "$src" "$target"
  done < <(find "$snap/files" -type f -print0)
}

record_failure() {
  local now
  now="$(date +%s)"
  touch "$FAILURE_LOG"
  awk -v now="$now" -v win="$FAILURE_WINDOW_SECONDS" '($1+0) >= (now-win)' "$FAILURE_LOG" > "$FAILURE_LOG.tmp" || true
  mv "$FAILURE_LOG.tmp" "$FAILURE_LOG"
  echo "$now" >> "$FAILURE_LOG"
}

clear_failures() {
  : > "$FAILURE_LOG"
}

check_circuit_breaker() {
  local now count
  now="$(date +%s)"
  touch "$FAILURE_LOG"
  awk -v now="$now" -v win="$FAILURE_WINDOW_SECONDS" '($1+0) >= (now-win)' "$FAILURE_LOG" > "$FAILURE_LOG.tmp" || true
  mv "$FAILURE_LOG.tmp" "$FAILURE_LOG"
  count="$(wc -l < "$FAILURE_LOG" | tr -d ' ')"
  if (( count >= FAILURE_THRESHOLD )); then
    fail "Circuit breaker open: $count failures in last ${FAILURE_WINDOW_SECONDS}s"
  fi
}

restart_gateway() {
  # Prefer docker compose recreate when available (ensures env updates apply)
  if command -v docker >/dev/null 2>&1 && [[ -f "$HOST_DIR/docker-compose.yml" ]]; then
    if (cd "$HOST_DIR" && docker compose version >/dev/null 2>&1); then
      log "Restart method: docker compose recreate openclaw-gateway"
      (cd "$HOST_DIR" && docker compose up -d --force-recreate openclaw-gateway)
      return 0
    fi
  fi

  if command -v openclaw >/dev/null 2>&1; then
    log "Restart method: openclaw gateway restart"
    if openclaw gateway restart >/dev/null 2>&1; then
      return 0
    fi
  fi

  local pid
  pid="$(pgrep -f '^openclaw-gateway$' | head -n1 || true)"
  if [[ -n "$pid" ]]; then
    log "Restart method: SIGUSR1 pid=$pid"
    kill -USR1 "$pid"
    return 0
  fi

  fail "No available restart method (docker/openclaw/pid not found)."
}

mark_good() {
  local snap
  snap="$(snapshot_now "manual-good")"
  echo "$snap" > "$LKG_PTR"
  log "Marked current config as LKG: $snap"
}

run_check_only() {
  if wait_healthy; then
    log "Health check OK"
    return 0
  fi
  fail "Health check failed"
}

run_safe_restart() {
  check_circuit_breaker
  local previous_lkg candidate
  previous_lkg="$(cat "$LKG_PTR" 2>/dev/null || true)"
  candidate="$(snapshot_now "pre-restart")"
  log "Created pre-restart snapshot: $candidate"

  restart_gateway
  if wait_healthy; then
    echo "$candidate" > "$LKG_PTR"
    clear_failures
    log "Restart success; updated LKG to: $candidate"
    return 0
  fi

  log "Restart failed health checks. Attempting rollback..."
  record_failure

  if [[ -z "$previous_lkg" || ! -d "$previous_lkg/files" ]]; then
    fail "No previous LKG snapshot available for rollback."
  fi

  restore_snapshot "$previous_lkg"
  restart_gateway

  if wait_healthy; then
    log "Rollback success. Active LKG remains: $previous_lkg"
    return 0
  fi

  record_failure
  fail "Rollback failed health checks. Manual intervention required."
}

main() {
  require_cmd curl
  require_cmd node
  acquire_lock

  case "$MODE" in
    check) run_check_only ;;
    mark-good) mark_good ;;
    run) run_safe_restart ;;
    *) fail "Unsupported mode: $MODE" ;;
  esac
}

main "$@"
