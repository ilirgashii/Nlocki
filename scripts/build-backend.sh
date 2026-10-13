#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -d /workspace/.nlocki-tools/node_modules/.bin ]; then export PATH="/workspace/.nlocki-tools/node_modules/.bin:$PATH"; fi
mops build --locked --output .build/backend
