#!/usr/bin/env bash
# Opens a public tunnel to the local web app, writes PUBLIC_URL into .env and points the
# ElevenLabs agent's in-call tool and post-call webhook at it. Keeps running until Ctrl-C.
#   pnpm tunnel            Cloudflare quick tunnel
#   pnpm tunnel:ngrok      ngrok; set NGROK_DOMAIN in .env to use your free static domain
# Tunnels to PORT, else to whichever of 3100 (pnpm demo) and 3000 (pnpm dev) is running.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
listening() { curl -s -o /dev/null -m 2 "http://localhost:$1/" ; }
if [ -z "${PORT:-}" ]; then
  if listening 3100; then PORT=3100; elif listening 3000; then PORT=3000; else PORT=3100; echo "Nothing is running on 3100 or 3000 yet; tunnelling to 3100 (start it with pnpm demo)."; fi
fi
TUNNEL="${TUNNEL:-cloudflare}"
LOG="$(mktemp -t casework-tunnel)"
NGROK_DOMAIN="${NGROK_DOMAIN:-$(sed -n 's/^NGROK_DOMAIN=//p' "$ROOT/.env" 2>/dev/null | tail -1)}"

if [ "$TUNNEL" = "ngrok" ]; then
  command -v ngrok >/dev/null || { echo "Install ngrok first: brew install ngrok, then ngrok config add-authtoken <token>"; exit 1; }
  ngrok http "$PORT" ${NGROK_DOMAIN:+--url "https://${NGROK_DOMAIN#https://}"} --log stdout --log-format logfmt >"$LOG" 2>&1 &
  # Only the "started tunnel" line: error messages quote the URL too.
  PATTERN='started tunnel.*url=https://[a-z0-9.-]+\.ngrok(-free)?\.(app|dev)'
else
  command -v cloudflared >/dev/null || { echo "Install cloudflared first: brew install cloudflared"; exit 1; }
  cloudflared tunnel --no-autoupdate --url "http://localhost:${PORT}" >"$LOG" 2>&1 &
  PATTERN='https://[a-z0-9-]+\.trycloudflare\.com'
fi
PID=$!
trap 'kill $PID 2>/dev/null; rm -f "$LOG"' EXIT

URL=""
for _ in $(seq 1 60); do
  URL="$(grep -oE "$PATTERN" "$LOG" | grep -oE 'https://[a-z0-9.-]+' | head -1 || true)"
  [ -n "$URL" ] && break
  kill -0 $PID 2>/dev/null || break
  sleep 1
done
if [ -z "$URL" ]; then
  echo "Tunnel did not start:"
  grep -E 'ERROR:|lvl=(eror|crit)' "$LOG" | sed 's/^ERROR: *//' | head -8 || cat "$LOG"
  grep -q ERR_NGROK_334 "$LOG" && echo "→ ngrok is already running for this address somewhere else (another terminal?). Stop it first: pkill ngrok"
  exit 1
fi

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
echo "Tunnel up. Share ${URL}/portal for calls and reports. Ctrl-C to stop."
wait $PID
