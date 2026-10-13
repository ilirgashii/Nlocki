#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -x /workspace/.dfx-tools/dfx ]; then export PATH="/workspace/.dfx-tools:$PATH"; fi
if [ -d /workspace/.config ]; then export DFX_CONFIG_ROOT=/workspace/.config DFX_CACHE_ROOT=/workspace/.cache; fi
export TERM=xterm-256color
mkdir -p .build
# Some cloud PID 1 implementations leave terminated daemons as zombies.
# Remove only stale PID files; never remove replica state or a live process lock.
clear_stale_pids() {
  for file in .dfx/network/local/pid .dfx/network/local/pocket-ic-pid; do
    [ -f "$file" ] || continue
    read -r network_pid < "$file" || true
    [[ "${network_pid:-}" =~ ^[0-9]+$ ]] || return 1
    if [ ! -d "/proc/$network_pid" ] || [ "$(awk '{print $3}' "/proc/$network_pid/stat")" = Z ]; then
      rm "$file"
    else
      return 1
    fi
  done
}
case "${1:-start}" in
  start)
    if dfx ping local > /dev/null 2>&1; then exit 0; fi
    clear_stale_pids || true
    dfx start --background > .build/dfx-start.log 2>&1 || { cat .build/dfx-start.log; exit 1; }
    dfx ping local > /dev/null
    ;;
  stop)
    if ! dfx stop > .build/dfx-stop.log 2>&1; then
      clear_stale_pids || { cat .build/dfx-stop.log; exit 1; }
    fi
    ;;
  *) echo 'Usage: scripts/local-network.sh start|stop' >&2; exit 2 ;;
esac
