#!/usr/bin/env bash
set -euo pipefail

# temp-bridge.sh
# Serve OPENCLAW_TEMP_BOX_DIR and optionally expose via ngrok temporary URL.

STATE_DIR="${STATE_DIR:-$HOME/.openclaw/temp-bridge}"
PORT="${PORT:-8099}"
BIND_HOST="${BIND_HOST:-127.0.0.1}"
TEMP_DIR="${TEMP_DIR:-${OPENCLAW_TEMP_BOX_DIR:-/mnt/c/temp}}"
TUNNEL_MODE="${TUNNEL_MODE:-auto}" # auto|ngrok|none

HTTP_PID_FILE="$STATE_DIR/http.pid"
NGROK_PID_FILE="$STATE_DIR/ngrok.pid"
HTTP_LOG="$STATE_DIR/http.log"
NGROK_LOG="$STATE_DIR/ngrok.log"

mkdir -p "$STATE_DIR"

usage() {
  cat <<'USAGE'
Usage:
  temp-bridge.sh start      Start local temp server (and ngrok in auto mode)
  temp-bridge.sh stop       Stop temp server and ngrok started by this script
  temp-bridge.sh status     Show server/tunnel status and URLs
  temp-bridge.sh url        Print local/public URL only

Env overrides:
  OPENCLAW_TEMP_BOX_DIR=/mnt/c/temp
  PORT=8099
  BIND_HOST=127.0.0.1
  TUNNEL_MODE=auto|ngrok|none
USAGE
}

is_pid_running() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

read_pid() {
  local f="$1"
  [[ -f "$f" ]] || return 1
  local pid
  pid="$(cat "$f" 2>/dev/null || true)"
  [[ "$pid" =~ ^[0-9]+$ ]] || return 1
  echo "$pid"
}

wait_http_up() {
  local i
  for i in $(seq 1 30); do
    if curl -s -m 2 -o /dev/null "http://$BIND_HOST:$PORT/"; then
      return 0
    fi
    sleep 1
  done
  return 1
}

get_ngrok_public_url() {
  local port="$1"
  local api
  api="$(curl -s --max-time 2 http://127.0.0.1:4040/api/tunnels || true)"
  [[ -n "$api" ]] || return 1

  python3 - "$port" <<'PY' <<<"$api"
import json, sys
port = sys.argv[1]
raw = sys.stdin.read().strip()
if not raw:
    raise SystemExit(1)
obj = json.loads(raw)
for t in obj.get("tunnels", []):
    cfg = t.get("config", {})
    addr = str(cfg.get("addr", ""))
    pub = str(t.get("public_url", ""))
    if not pub.startswith("https://"):
        continue
    if addr.endswith(f":{port}") or addr == f"http://localhost:{port}" or addr == f"http://127.0.0.1:{port}":
        print(pub)
        raise SystemExit(0)
# fallback: first https tunnel
for t in obj.get("tunnels", []):
    pub = str(t.get("public_url", ""))
    if pub.startswith("https://"):
        print(pub)
        raise SystemExit(0)
raise SystemExit(1)
PY
}

start_http() {
  mkdir -p "$TEMP_DIR"

  local existing
  existing="$(read_pid "$HTTP_PID_FILE" || true)"
  if [[ -n "$existing" ]] && is_pid_running "$existing"; then
    return 0
  fi

  nohup python3 -m http.server "$PORT" --bind "$BIND_HOST" --directory "$TEMP_DIR" >"$HTTP_LOG" 2>&1 &
  echo "$!" > "$HTTP_PID_FILE"

  if ! wait_http_up; then
    echo "Failed to start local temp server. Check: $HTTP_LOG" >&2
    exit 1
  fi
}

start_ngrok_if_needed() {
  [[ "$TUNNEL_MODE" == "none" ]] && return 0

  # If already available from existing ngrok agent, reuse it.
  if get_ngrok_public_url "$PORT" >/dev/null 2>&1; then
    return 0
  fi

  if [[ "$TUNNEL_MODE" == "ngrok" || "$TUNNEL_MODE" == "auto" ]]; then
    if ! command -v ngrok >/dev/null 2>&1; then
      [[ "$TUNNEL_MODE" == "ngrok" ]] && {
        echo "ngrok command not found." >&2
        exit 1
      }
      return 0
    fi

    local existing
    existing="$(read_pid "$NGROK_PID_FILE" || true)"
    if [[ -z "$existing" ]] || ! is_pid_running "$existing"; then
      nohup ngrok http "$PORT" >"$NGROK_LOG" 2>&1 &
      echo "$!" > "$NGROK_PID_FILE"
    fi

    # Wait for tunnel URL
    local i
    for i in $(seq 1 20); do
      if get_ngrok_public_url "$PORT" >/dev/null 2>&1; then
        return 0
      fi
      sleep 1
    done
  fi
}

print_urls() {
  local local_url public_url
  local_url="http://$BIND_HOST:$PORT/"
  echo "Local URL : $local_url"
  echo "Temp dir  : $TEMP_DIR"

  public_url="$(get_ngrok_public_url "$PORT" 2>/dev/null || true)"
  if [[ -n "$public_url" ]]; then
    echo "Public URL: $public_url"
  else
    echo "Public URL: (not available)"
    echo "Tip: install/start ngrok, or run: ngrok http $PORT"
  fi
}

cmd_start() {
  start_http
  start_ngrok_if_needed
  print_urls
}

cmd_stop() {
  local pid
  pid="$(read_pid "$HTTP_PID_FILE" || true)"
  if [[ -n "$pid" ]] && is_pid_running "$pid"; then
    kill "$pid" 2>/dev/null || true
  fi
  rm -f "$HTTP_PID_FILE"

  pid="$(read_pid "$NGROK_PID_FILE" || true)"
  if [[ -n "$pid" ]] && is_pid_running "$pid"; then
    kill "$pid" 2>/dev/null || true
  fi
  rm -f "$NGROK_PID_FILE"

  echo "Stopped temp bridge services."
}

cmd_status() {
  local hpid npid
  hpid="$(read_pid "$HTTP_PID_FILE" || true)"
  npid="$(read_pid "$NGROK_PID_FILE" || true)"

  if [[ -n "$hpid" ]] && is_pid_running "$hpid"; then
    echo "HTTP : running (pid=$hpid)"
  else
    echo "HTTP : stopped"
  fi

  if [[ -n "$npid" ]] && is_pid_running "$npid"; then
    echo "ngrok: running (pid=$npid)"
  else
    echo "ngrok: stopped/unknown"
  fi

  print_urls
}

main() {
  local cmd="${1:-start}"
  case "$cmd" in
    start) cmd_start ;;
    stop) cmd_stop ;;
    status) cmd_status ;;
    url) print_urls ;;
    -h|--help|help) usage ;;
    *)
      echo "Unknown command: $cmd" >&2
      usage
      exit 2
      ;;
  esac
}

main "$@"
