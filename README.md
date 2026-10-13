# Nlocki

Private beta: fitness, nutrition, tasks and social features. Use test data while reviewing deployment and privacy controls. Calorie burn is a MET estimate, not medical advice.

## Run locally with Docker

Install Docker Desktop and enable WSL integration for your distro (Windows), or Docker Engine with Compose (Linux). From the repository root:

```bash
node scripts/setup-local.mjs
docker compose up --build -d
```

Node 24 is required for the setup helper. If Node is not installed, run that helper with Docker:

```bash
docker run --rm --user "$(id -u):$(id -g)" -v "$PWD:/app" -w /app node:24-bookworm-slim node scripts/setup-local.mjs
docker compose up --build -d
```

Open localhost port 5173 on your own computer. Local signup uses email/password and does not require Internet Identity, SMTP or email confirmation. This creates a real persistent account, not mock authentication. Optional authenticator TOTP and recovery codes are available. Online mode requires HTTPS and email verification; standard WebAuthn passkeys can be registered as an alternative login after account setup.

```bash
docker compose ps
docker compose logs --tail 100 api gateway db
docker compose down
```

`down` preserves data. **Do not use `down -v`** unless you deliberately want to erase accounts, app data and photos. Keep `.secrets` and the auth-state encryption key in protected backups. PostgreSQL is not published on a host port; only the gateway is bound to loopback. Never expose this local stack publicly.

The local named volumes hold PostgreSQL, authentication state and photos separately. Their physical disk location is Docker's storage location. For SSD/HDD placement on your own server, use the production bind-mount templates instead.

## Architecture and deployment

The default backend is Node 24 + PostgreSQL 17 with a restricted application role and row-level policies for app documents. Private JPEG files live outside the web root and are served through authenticated authorization checks. Browser app requests go through the same-origin gateway. Passwords use salted scrypt; cookies are HttpOnly/SameSite, online cookies are Secure. TOTP is enforced on the server. Database passwords and SMTP/tunnel credentials use private files, not committed environment values.

- [VM, SSD/HDD, private DB and backup guide](deployment/SELF-HOSTING.md)
- [Cloudflare tunnel and EU + Western Balkans policy](deployment/CLOUDFLARE.md)
- [German operator privacy/incident review](deployment/GERMANY-PRIVACY.md)
- [Production environment template](deployment/templates/production.env.example)

Target domain: **app.gixha.com**. No server, SMTP account, Cloudflare rule or public deployment is provisioned automatically. Production refuses to start without verified DB TLS, real operator details and an explicit deployment-review flag. These gates and draft notices do not certify legal compliance or eliminate breach risks.

The privacy panel supports data export, account deletion and optional health-data consent withdrawal. Draft Privacy, Beta terms and Impressum pages must be completed and reviewed for the actual German operator before real users. Health consent is separate from account terms. Beta status does not waive statutory rights or operator responsibilities.

## Development and checks

Use Node 24+ and pnpm 10.34.0. `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm check`, `VITE_BACKEND_MODE=http VITE_LOCAL_AUTH=true pnpm build`, `pnpm test:calories`. Run browser checks against the Docker stack with `NLOCKI_BASE_URL=http://127.0.0.1:5173` and, if needed, `PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium`: `pnpm test:email:browser`, `pnpm test:nutrition:browser`.

The earlier Motoko/Internet Computer implementation remains preserved for existing test-data recovery in `compose.ic.yaml`, `Dockerfile.ic`, `server/auth-ic.mjs` and `src/backend`. Old IC tests and Mops/DFX commands apply only to that legacy implementation. The new PostgreSQL stack does not silently import existing IC/SQLite data; preserve original volumes and keys and plan a reviewed migration/export first. Do not reset `.dfx` to fix authentication. Internet Identity requires a matching IC network; standard WebAuthn is the online passkey alternative for this self-hosted backend.

Additional checks: `pnpm test:postgres` checks account isolation, private media, messages, consent/export/deletion and TOTP enforcement. `pnpm test:postgres:persistence` requires an explicit `NLOCKI_TEST_COMPOSE_PROJECT` and restarts only that test stack. `pnpm test:passkeys` requires private test PostgreSQL connection settings and Chromium; it verifies WebAuthn with a virtual authenticator on loopback, not real domain/SMTP deployment. `pnpm test:restore` requires a separate isolated DB plus `RESTORE_TEST_DATABASE=true`; it checks deletion reconciliation without touching the active app database.
