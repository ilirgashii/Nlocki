# Project guidance

Use the existing checkout. Cloud tasks are isolated; do not create a worktree unless requested.

## Commands (from repository root)

- Install frontend dependencies: `pnpm install --frozen-lockfile` (pnpm 10).
- Install backend dependencies: `mops install --locked` (Mops 3.5.0; toolchain pinned in mops.toml).
- Start development: `pnpm dev` (DFX 0.29.2; defaults to ports 4943 and 5173; optional NLOCKI_PORT).
- Backend check and stable compatibility: `mops check`.
- Backend build: `pnpm build:backend` (output `.build/backend`).
- Generate declarations after API changes: `pnpm generate`.
- Frontend checks: `pnpm typecheck`, `pnpm check`.
- Frontend build: `pnpm build` (output `.build/frontend`).
- Backend integration: `pnpm test:backend` with local replica running.
- Persistence integration: `pnpm test:persistence` (upgrades/restarts only the local replica).
- Browser integration: `pnpm test:browser`; Chromium required, optional PLAYWRIGHT_CHROMIUM_PATH and NLOCKI_BASE_URL.

Keep authentication real, isolate query caches per authenticated principal, and keep user data on the backend. Never introduce mock users or browser-only social/message storage. Preserve stable data shapes and test upgrades before changing them. Never commit identity keys, .dfx state, .env.local, node_modules, or .build outputs. Public deployment and actual Git push require the user's instruction.
