# Nlock’i

Fitness, nutrition, planning and social app with React, a persistent Motoko/Internet Computer backend, and an email authentication service.

## Start with Docker (recommended)

On Windows, install and open **Docker Desktop**. If you use an Ubuntu/WSL terminal, enable that distribution under **Settings → Resources → WSL Integration → Apply & Restart**. You can also run these commands directly in PowerShell with Git installed.

```bash
git clone https://github.com/ilirgashii/Nlocki.git
cd Nlocki
docker compose up --build -d
docker compose logs -f app
```

If you already have the repository, run `git pull origin main` instead of cloning again. Wait until the logs show **Email authentication ready** and **VITE ready**, then open **http://localhost:5173**. Stop watching logs with Ctrl+C; the container stays running. The first build/start downloads tools and deploys the backend, so it can take several minutes.

Choose **Create an account**, enter an email and a password of at least eight characters, then choose a username. In this local testing mode:

- No Internet Identity, passkey, email confirmation or mandatory 2FA is needed.
- A test address such as `you@example.test` works. Use a separate test password.
- Accounts are real, distinct signed identities; fitness/social data is saved in the backend.
- Existing email accounts can sign in again with the same email and password.
- 2FA is available in your own profile if you choose to test it.

Docker includes everything needed; you do not need to install Node, pnpm, DFX or a database on your PC. Linux AMD64 is used, including emulation on ARM hosts. Local ports 5173 (app) and 4943 (IC API) bind only to host loopback. The authentication service is internal and is reached through the app's `/api/auth` proxy.

```bash
# Stop without deleting data
docker compose down
# Start again
docker compose up -d
# Update after pulling code
git pull origin main
docker compose up --build -d
```

The `nlocki-data` named volume stores the replica, email account database and encryption key. **Do not delete `.dfx`, `canister_ids.json`, the volume, or use `docker compose down -v` as a troubleshooting step.** Back up the entire volume before moving machines; the authentication encryption key and database must stay together.

## Try email confirmation locally

This is optional during testing. To require a code, create an ignored `.env` in the repository root containing this public setting:

```dotenv
AUTH_REQUIRE_EMAIL_VERIFICATION=true
```

Then run `docker compose up --build -d`. New accounts must confirm a six-digit code. Click **Open local test inbox** in the confirmation form, or open **http://localhost:5173/api/auth/dev/inbox**, and refresh it after requesting a code. Codes expire after ten minutes; five wrong codes require a new code. The inbox exists only in local development and sends no real emails. Remove the setting or set it to `false` for simple signup again. Previously verified testing accounts remain verified.

## Troubleshoot Windows/WSL

- `docker: command not found`: start Docker Desktop and enable WSL integration for the terminal's distribution. Check `docker version` and `docker compose version`.
- Port already in use: stop your previous `pnpm dev` or another container occupying 5173/4943 before starting Compose. Use `docker compose ps` and `docker compose logs --tail=80 app` to inspect startup.
- Old Internet Identity/certificate error: update the repository and rebuild. The local app should show an email form, not a passkey button. Sign out of the old session or clear **site data for localhost:5173 only**, then reload. This clears browser sessions, not the Docker volume.
- Missing styles/old screen: ensure you are visiting the Docker app rather than an older Vite process. Rebuild and use Ctrl+Shift+R. Dependencies, CSS tooling and fonts are bundled in the image.
- `No space left on device` or incomplete simulator state: free disk space and preserve a backup of the volume before diagnosing. Do not reset the local replica to fix an authentication signature error.

## Run without Docker

Requirements: **Node.js 24+**, pnpm 10 (tested with 10.34.0), [DFX 0.29.2](https://internetcomputer.org/docs/building-apps/getting-started/install), Mops 3.5.0 (`npm install -g ic-mops@3.5.0`). Motoko 1.3.0 is pinned in `mops.toml`/`mops.lock`.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

This starts/deploys the persistent backend, starts the email service on loopback port 3010, and starts Vite on 5173. Use `NLOCKI_PORT=5174 pnpm dev` in Bash for another frontend port. Interrupt the command to stop Vite/email; `bash scripts/local-network.sh stop` stops the local replica. Authentication data is saved in ignored `.local-auth/`; retain the whole directory for existing accounts.

## Authentication and security

Email passwords are hashed with salted scrypt. Account signing keys are random and encrypted at rest with AES-GCM; they are never returned to the browser. An HttpOnly, SameSite cookie restores a server session. The browser receives a 30-minute delegation restricted to the backend canister, using a fresh private key held in memory. Logout deletes the server session and clears the browser identity; already issued delegations expire within 30 minutes. Invalid credentials/codes are rate limited and origin/host checks guard the API. See [SECURITY.md](SECURITY.md) for scope and limitations.

Optional authenticator 2FA works with email or passkey sign-in. Scan the QR with a SHA-256 compatible app such as 2FAS/Aegis, then save the four one-use recovery codes offline. The backend enforces 2FA for protected data, rejects reused TOTP codes and locks verification for five minutes after five failures. Reloads require a fresh 2FA verification when enabled. Recovery codes supplement your original sign-in; they do not replace your email password or Internet Identity.

Internet Identity/passkey remains available for the **online build**. It is deliberately hidden locally to avoid mainnet/local certificate mismatches. By default a public frontend build uses Internet Identity. To additionally offer online email/password, build with `VITE_LOCAL_AUTH=false` and `VITE_EMAIL_AUTH=true`, and deploy the email service behind the same HTTPS origin at `/api/auth`. Configure:

| Setting | Purpose |
| --- | --- |
| `NODE_ENV=production`, `AUTH_LOCAL_TESTING=false` | Disable all local shortcuts/inbox; require verification |
| `AUTH_ALLOWED_ORIGINS=https://your-domain.example` | Exact allowed public origin(s) |
| `AUTH_BACKEND_CANISTER_ID` | Public deployment's backend canister |
| `AUTH_DATA_DIR` | Durable private storage for accounts and encryption key |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | Real email provider; secure SMTP or STARTTLS |
| `SMTP_FROM`, `SMTP_USER`, `SMTP_PASSWORD` | Sender and provider credentials; keep credentials in server secret settings |
| `VITE_BACKEND_CANISTER_ID`, `VITE_BACKEND_HOST` | Public backend ID and `https://icp-api.io` |
| `VITE_IDENTITY_PROVIDER` | Optional Internet Identity URL |

The email service rejects production settings that enable local testing, non-HTTPS online origins, or missing SMTP configuration. Vite variables are public: never put SMTP passwords or signing keys there. The current Compose file is for local development, not production hosting. Use a separate production authentication store; do not promote unverified local test accounts. Email accounts and Internet Identity accounts are separate identities; linking existing accounts and password reset are not implemented. Do not assume old passkey data transfers to a new email account.

## Storage

Motoko canister state stores tasks, workouts, meals, water, schedules, goals, profiles, posts, comments, likes, stories, messages and inbox preferences. Data is scoped to the signed account principal. Contacts are owner-only; private posts are unavailable to other accounts, including followers.

SQLite stores email credentials, encrypted signing identities, cookie sessions and verification state. It is bundled with Node 24: no external SQL server, Redis or paid service is needed locally. Profile contact email is separate from login email.

Raster photos are resized to 512 pixels and converted to bounded JPEGs in canister state. Large collections need pagination/object storage before public growth; IC response limits apply. Theme preferences use localStorage, passkey sessions use AuthClient IndexedDB, email sessions use HttpOnly cookies. Old prototype localStorage data is not imported automatically.

## Validate

```bash
pnpm typecheck
pnpm check
pnpm build
pnpm audit
mops verify
mops check
pnpm test:totp
pnpm test:security
pnpm test:backend
pnpm test:email
```

`test:email` starts isolated authentication services and checks code verification, signed backend access, logout, persistence and rate limits against the running local backend. Chromium tests use `pnpm test:email:browser` against the local email app; set `NLOCKI_BASE_URL` to its URL and optionally `PLAYWRIGHT_CHROMIUM_PATH` to a system Chromium. Otherwise install it with `pnpm exec playwright-core install chromium`. `test:browser` is the separate passkey-mode regression suite using signed test delegations, not the live external passkey UI.

`pnpm test:persistence` upgrades/restarts only the local IC replica. `NLOCKI_DOCKER_CONTAINER=<local-test-container> pnpm test:docker` restarts that Docker container. Do not run restart tests concurrently with API/browser tests. Optional `NLOCKI_BACKEND_HOST`/`NLOCKI_CANISTER_ID` select another local test backend. Build artifacts are ignored `.build/` outputs; Candid declarations are tracked.

## Before public launch

Configure real email delivery, HTTPS, final domain and mainnet canisters; test passkeys and mail delivery on that origin. Add password reset/account recovery and linking if needed. Arrange independent security review, backups with restoration tests, controller/cycle monitoring, moderation, account deletion and storage quotas. Development testing does not establish that every possible vulnerability has been eliminated. Public IC deployment and paid cycles remain separate actions.
