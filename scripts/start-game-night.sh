#!/bin/sh

set -eu

PORT="${PORT:-3000}"
START_PATH="${START_PATH:-/en}"
NEXT_BIN="./node_modules/.bin/next"
NODE_BIN="${NODE:-node}"

if [ ! -x "$NEXT_BIN" ]; then
  echo "Could not find Next.js. Run npm install first, then try again."
  exit 1
fi

LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || true)"
if [ -z "$LAN_IP" ]; then
  LAN_IP="$(ipconfig getifaddr en1 2>/dev/null || true)"
fi
if [ -z "$LAN_IP" ]; then
  LAN_IP="$(ifconfig | awk '/inet / && $2 !~ /^127\./ { print $2; exit }')"
fi

echo ""
echo "JoboTracker local game-night server"
echo ""
echo "This Mac:"
echo "  http://127.0.0.1:${PORT}${START_PATH}"
echo ""

if [ -n "$LAN_IP" ]; then
  SHARE_URL="http://${LAN_IP}:${PORT}${START_PATH}"
  export TI_LAN_IP="$LAN_IP"
  echo "Share this with friends on the same Wi-Fi:"
  echo "  ${SHARE_URL}"
  echo ""
  "$NODE_BIN" scripts/print-game-night-qr.js "$SHARE_URL"
  echo ""
else
  echo "I could not detect your Wi-Fi IP automatically."
  echo "Open System Settings > Wi-Fi > Details to find this Mac's IP address."
  echo ""
fi

echo "Local game data file:"
echo "  server/local-dev-db.json"
echo ""

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port ${PORT} is already in use."
  echo "That usually means JoboTracker is already running. Use the link above."
  echo ""
  echo "If the link does not load, close the other terminal window running the app,"
  echo "then start this command again."
  echo ""
  if [ "${TIA_WAIT_ON_EXIT:-0}" = "1" ]; then
    printf "Press Return to close this window."
    read -r _
  fi
  exit 0
fi

echo "Leave this terminal window open while playing."
echo ""

export TIA_LOCAL_FILE_DB=1
export NEXT_PUBLIC_TI_LOCAL_FILE_DB=1
export NEXT_PUBLIC_TI_PROJECT=local-ti-assistant
export NEXT_TELEMETRY_DISABLED=1

exec "$NEXT_BIN" dev -H 0.0.0.0 -p "$PORT"
