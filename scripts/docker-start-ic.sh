#!/usr/bin/env bash
set -euo pipefail
umask 077
cd /app
export NO_PROXY="${NO_PROXY:+$NO_PROXY,}127.0.0.1,localhost,0.0.0.0"
export no_proxy="$NO_PROXY"
export DFX_CONFIG_ROOT=/data/config DFX_CACHE_ROOT=/data/cache XDG_CONFIG_HOME=/data/config XDG_CACHE_HOME=/opt/nlocki-cache XDG_DATA_HOME=/data/share
mkdir -p /data/config /data/cache /data/share /data/replica
# Keep only local state in the volume; source and dependencies remain in the image.
[ -e .dfx ] || ln -s /data/replica .dfx
if [ ! -f /data/canister_ids.json ]; then printf '{}\n' > /data/canister_ids.json; fi
[ -e canister_ids.json ] || ln -s /data/canister_ids.json canister_ids.json
frontend_pid=""
auth_pid=""
shutdown() {
  if [ -n "$frontend_pid" ]; then kill "$frontend_pid" 2>/dev/null || true; fi
  if [ -n "$auth_pid" ]; then kill "$auth_pid" 2>/dev/null || true; wait "$auth_pid" 2>/dev/null || true; fi
  dfx stop > /data/replica/stop.log 2>&1 || true
}
trap shutdown EXIT
trap 'exit 0' TERM INT
mops install --locked
# PID files are container-local process metadata; a fresh container has no replica yet.
rm -f .dfx/network/local/pid .dfx/network/local/pocket-ic-pid
# Bind the IC API inside the container; Compose exposes it only on host loopback.
dfx start --host 0.0.0.0:4943 --domain localhost --domain 127.0.0.1 --domain 0.0.0.0 --background > /data/replica/start.log 2>&1 || { cat /data/replica/start.log; exit 1; }
dfx deploy backend > /data/replica/deploy.log 2>&1 || { echo "Backend deployment failed; inspect /data/replica/deploy.log locally (may contain development identity details)." >&2; exit 1; }
dfx generate backend
export VITE_BACKEND_CANISTER_ID="$(dfx canister id backend)" VITE_BACKEND_HOST="${VITE_BACKEND_HOST:-http://127.0.0.1:4943}"
export AUTH_BACKEND_CANISTER_ID="$VITE_BACKEND_CANISTER_ID"
export AUTH_DATA_DIR=/data/auth AUTH_LOCAL_TESTING=true
export AUTH_REQUIRE_EMAIL_VERIFICATION="${AUTH_REQUIRE_EMAIL_VERIFICATION:-false}"
export AUTH_ALLOWED_ORIGINS="${AUTH_ALLOWED_ORIGINS:-http://localhost:5173,http://127.0.0.1:5173}"
export VITE_LOCAL_AUTH=true
node server/auth-ic.mjs &
auth_pid=$!
cd src/frontend
pnpm dev --host 0.0.0.0 --port 5173 --strictPort &
frontend_pid=$!
wait -n "$frontend_pid" "$auth_pid"
