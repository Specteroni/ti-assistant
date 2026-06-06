#!/bin/sh

cd "$(dirname "$0")"

export PATH="/Users/josephcascarelli/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"
export TIA_WAIT_ON_EXIT=1

exec scripts/start-game-night.sh
