#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -d /workspace/.nlocki-tools/node_modules/.bin ]; then export PATH="/workspace/.nlocki-tools/node_modules/.bin:$PATH"; fi
if [ -x /workspace/.dfx-tools/dfx ]; then export PATH="/workspace/.dfx-tools:$PATH"; fi
# Supported cache/config overrides for the cloud machine.
if [ -d /workspace/.config ]; then
  export DFX_CONFIG_ROOT=/workspace/.config DFX_CACHE_ROOT=/workspace/.cache
  export XDG_CONFIG_HOME=/workspace/.config XDG_CACHE_HOME=/workspace/.cache
fi
export NODE_USE_ENV_PROXY=1 TERM=xterm-256color
mops install --locked
bash scripts/local-network.sh start
dfx deploy backend
dfx generate backend
canister_id=$(dfx canister id backend)
export VITE_BACKEND_CANISTER_ID="$canister_id" VITE_BACKEND_HOST=http://127.0.0.1:4943
cd src/frontend
exec pnpm dev --host 127.0.0.1 --port "${NLOCKI_PORT:-5173}" --strictPort
