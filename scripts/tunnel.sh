#!/usr/bin/env bash
# Opens a Cloudflare quick tunnel to the local web app, writes PUBLIC_URL into .env and points the
# ElevenLabs agent's in-call tool and post-call webhook at it. Keeps running until Ctrl-C.
#   pnpm tunnel            (PORT=3100 by default)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-3100}"
LOG="$(mktemp -t casework-tunnel)"
command -v cloudflared >/dev/null || { echo "Install cloudflared first: brew install cloudflared"; exit 1; }

cloudflared tunnel --no-autoupdate --url "http://localhost:${PORT}" >"$LOG" 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null; rm -f "$LOG"' EXIT

URL=""
for _ in $(seq 1 60); do
  URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG" | head -1 || true)"
  [ -n "$URL" ] && break
  sleep 1
done
[ -n "$URL" ] || { echo "Tunnel did not start:"; cat "$LOG"; exit 1; }

touch "$ROOT/.env"
if grep -q '^PUBLIC_URL=' "$ROOT/.env"; then
  sed -i '' "s#^PUBLIC_URL=.*#PUBLIC_URL=${URL}#" "$ROOT/.env"
else
  printf '\nPUBLIC_URL=%s\n' "$URL" >>"$ROOT/.env"
fi
echo "PUBLIC_URL=${URL} → localhost:${PORT}"

# Wait until the tunnel actually routes before registering it with ElevenLabs.
for _ in $(seq 1 30); do
  curl -s -o /dev/null -w '%{http_code}' "${URL}/api/voice/tool" | grep -qE '^(2|4|5)' && break
  sleep 1
done
node "$ROOT/scripts/voice-setup.mts"
echo "Tunnel up. Ctrl-C to stop."
wait $PID
