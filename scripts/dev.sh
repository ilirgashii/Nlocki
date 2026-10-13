#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/setup-local.mjs
docker compose up --build
