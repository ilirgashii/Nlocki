#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
compiler=$(mops toolchain bin moc)
# mops sources supplies package flags from the verified lockfile.
"$compiler" -r --implicit-package core $(mops sources) tests/totp.test.mo
printf 'PASS: RFC 6238 SHA-256 vectors, base32 encoding and replay rejection\n'
