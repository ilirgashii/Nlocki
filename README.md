# Nlock'i

Fitness, nutrition, planning and social app built with React and a Motoko backend on the Internet Computer.

## Run locally

Requirements: Node.js 20+, pnpm 10 (tested with 10.34.0), [DFX 0.29.2](https://internetcomputer.org/docs/building-apps/getting-started/install), and Mops 3.5.0 (`npm install -g ic-mops@3.5.0`). Motoko 1.3.0 and core 2.2.0 are pinned in `mops.toml`/`mops.lock`.

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

The dev command installs locked Motoko dependencies, starts a persistent local replica, builds and deploys the backend, regenerates its API declarations, and starts Vite. It uses backend port 4943 and frontend port 5173. Set `NLOCKI_PORT=5174 pnpm dev` if the frontend port is occupied. To stop the frontend, interrupt the dev command; stop the local network with `bash scripts/local-network.sh stop`.

Sign in with Internet Identity. First sign-in asks for a unique username and an optional display name; accounts start private. No application password is collected. Internet Identity requires browser passkey/device authentication, so its interactive production sign-in must also be checked on the final public origin.

For a frontend connected to an existing deployment, set `VITE_BACKEND_CANISTER_ID` and `VITE_BACKEND_HOST` through process variables or an ignored `src/frontend/.env.local`. `VITE_IDENTITY_PROVIDER` optionally selects a different Internet Identity deployment. These IDs/URLs are public configuration, not private keys. DFX deployment injects the backend ID into the frontend build automatically.

## Data and image storage

The backend's persistent canister state stores tasks, workouts, meal logs, water, schedules, goals, profiles, posts, comments, likes, stories, messages, reactions, and inbox preferences. Fitness/nutrition data is scoped to the authenticated principal. Email and phone are returned only for the owner's profile; private posts cannot be read or liked by other users. Follow relationships do not grant access to private posts. Deleting an inbox conversation hides the existing messages only for that user.

There is no separate SQL database, Redis, paid API key, or external image bucket required for local operation. JPEG/PNG/WebP uploads are resized to at most 512 pixels, converted to JPEG, limited to about 512 KB, and stored in canister state. This supports profile, post and story images across browsers. HTTPS image URLs remain optional. Large media/video collections should move to dedicated object storage; the current approach is deliberately bounded for small photos.

Browser localStorage is used only for theme preferences; authentication sessions use AuthClient's IndexedDB storage. Existing data from the old localStorage prototype is **not automatically imported** and is left untouched. Export any real prototype data before switching an existing user-facing deployment.

## Validate

With the local backend running:

```bash
mops verify
mops check
pnpm typecheck
pnpm check
pnpm build
pnpm test:backend
pnpm test:persistence
```

`test:persistence` performs a canister upgrade and restarts the local replica; run it only against the local development environment. Tests use fresh, signed identities and real backend requests. The tracked legacy stable-type baseline checks that existing persistent data layouts remain compatible; new UI metadata uses separate stable maps.

For browser tests, install Chromium with `pnpm exec playwright-core install chromium`, then run `pnpm test:browser`. If using a system browser, set `PLAYWRIGHT_CHROMIUM_PATH` to its executable. `NLOCKI_BASE_URL` selects the running frontend's origin. The browser test restores a real signed test delegation, registers a profile, writes/reloads a task and a photo post, and checks runtime errors; it does not bypass authentication in application code or automate the external provider's passkey flow.

Builds go into ignored `.build/` directories. The generated Candid declarations are tracked; regenerate them after backend API changes with `pnpm generate`.

## Publish later

`dfx.json` includes a backend canister and a frontend assets canister. Local deployment is `dfx deploy`. Public deployment is a separate action using a secured DFX identity and funded cycles; use `dfx deploy --network ic` only after review. Do not use the cloud machine's automatically generated development identity to control production funds.

Before public launch:

- Fund the production canisters, configure the final domain, and test Internet Identity with two real accounts on that origin.
- Establish canister snapshots/backups, restoration checks, cycle/storage monitoring, and an upgrade procedure that preserves state.
- Add moderation/reporting, upload quotas/rate limits and account/data deletion for a public social service. Review privacy and retention rules.
- Optimize the frontend bundle and consider object storage if photo volume grows. Barcode lookup optionally uses Open Food Facts and depends on that external service.

Code changes and local deployment do not automatically push to GitHub or publish the cloud environment.
