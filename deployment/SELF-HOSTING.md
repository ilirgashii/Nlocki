# Self-hosting app.gixha.com

The operator is in Germany. VM software has not been selected. Ubuntu Server 24.04 LTS guests work with Proxmox, KVM, VMware or Hyper-V; the isolation below matters more than the choice. Do not expose an unpatched laptop directly to the Internet. A single physical laptop remains a single failure and administrator-trust boundary.

## Disks and guests

Prefer two guests on a private VM network: app VM (example 10.77.0.10) and database VM (10.77.0.20). Put PostgreSQL and auth-state on SSD; mount only the photo directory from the HDD into the app VM. Separate mounts remain separate storage even when attached to one VM. Do not share a whole disk or expose the database directory to the app VM. HDD loss affects photos, not the SSD database; SSD loss can make all accounts unavailable. Back up both.

Use dedicated Linux service users, encrypted host disks/backups where feasible, least-privilege hypervisor permissions and automatic security updates. The host administrator can access guests; VMs cannot protect against a compromised host administrator. Do not share VM credentials. Administer through your LAN/VPN with SSH keys and MFA, never public SSH/password logins.

## Private database

1. Install Docker Engine/Compose in each guest. Clone the repository; preserve `.secrets` and all persistent data. Copy `templates/production.env.example` outside the checkout and fill public paths/addresses/operator details.
2. On the DB VM create the SSD data directory and secret directory. Generate two independent passwords in files `db_admin_password` and `db_app_password` with mode 600. Copy only the application password securely to the app VM; never share the administrator password.
3. Create a private CA and PostgreSQL server certificate with DNS SAN `db.internal`. Keep the CA private key offline. The server certificate/key belong only on the DB VM; PostgreSQL's key must be readable by its container user (normally uid 999) with mode 600. Keep the certificate directory traversable by PostgreSQL (e.g. mode 755), public certificates mode 644, and server.key owned by uid 999 with mode 600. Copy only the public CA certificate to the app VM (mode 644). Do not disable TLS verification. Review certificate expiry and rotation.
4. Copy `templates/pg_hba.conf` and replace APP_VM_PRIVATE_IP with the exact app VM IP. Run from repository root: `docker compose --env-file /path/production.env -f deployment/database.compose.yaml up -d`. Initialization is for an empty directory only; it does not upgrade an existing schema.
5. Bind PostgreSQL only to DB_BIND_IP. Allow port 5432 only from the app VM; reject all other sources. Enforce this with VM network/hypervisor ACLs and Docker's host firewall path (Docker publishing can bypass simple UFW rules). Verify from a third guest that access fails. Never publish 5432 on the router, Cloudflare tunnel or public NIC. Do not install public phpMyAdmin/Adminer.

## App VM and tunnel

Create SSD_STATE_DIR and HDD_PHOTOS_DIR owned by uid 1000 (the Node container user) with mode 700. Confirm the HDD is mounted before starting the app (`findmnt`); fail deployment if absent to avoid writing photos to an unintended disk. Set up `/srv/nlocki-secrets` mode 700 with app DB password, SMTP password and tunnel token files. API secret files must be readable only by uid 1000 (mode 600); the Cloudflare connector token must be owned by its image user (currently uid 65532, verify the selected image) with mode 600. Directory permissions on the host stay restricted. Docker Compose file-backed secrets are private bind mounts, not a secret vault; restrict host/root access and backups.

Complete SMTP settings with a verified sender, TLS, SPF/DKIM/DMARC and a suitable processor contract. Fill real operator name/address/privacy contact, keep OPERATOR_COUNTRY=DE and review `GERMANY-PRIVACY.md`. PUBLIC_BETA_READY defaults false. No dummy contact details should be published.

Run `docker compose --env-file /path/production.env -f deployment/app.compose.yaml up --build -d`. No origin HTTP/API ports are published. Follow `CLOUDFLARE.md` for a tunnel hostname app.gixha.com, country policy, cache exclusion and private beta access. Only Cloudflare may set trusted geo headers because the origin is unreachable publicly. Never expose the gateway alongside the tunnel. Protect the Cloudflare account with MFA. Pin tested image digests before production and keep an update process.

Before launch test outside-network HTTPS, blocked countries, email delivery and code expiry, WebAuthn on the real HTTPS hostname, TOTP/recovery, two-account privacy, deletion/export, disk capacity, restarts and a complete restore. Monitoring must cover container failures, space, certificates, failed backups and email failures. A tunnel and geo rule do not eliminate breaches or VPN access.

## Backups and restore

Stop the API during a consistent backup window. Capture PostgreSQL `pg_dump -Fc`, auth-state including encryption.key, photos and the current deletion_tombstones ledger. Encrypt the entire bundle to an offline/public recipient key (e.g. age), store an additional copy outside this laptop, restrict access and expire backups after at most 30 days. Never place unencrypted dumps in the web root or Git. Back up the deletion ledger independently after deletions and before each restore; otherwise deleted accounts can reappear.

Restore into isolated guests with tunnel stopped. Restore matching DB + auth encryption key + photos; verify app role restrictions and TLS. Reconcile the latest independent deletion ledger with restored account IDs using the original encryption key (HMAC-SHA256): remove matching users, incoming conversations and photo files, preserving deletion tombstones. Do not reopen until this is verified. Restore tooling and automated backup/retention are not provisioned by these templates; treat a rehearsed restore and independently preserved ledger as launch prerequisites.

## Existing test data

The PostgreSQL stack is a separate database. It does not automatically import old SQLite/Motoko accounts, messages or photos. Keep old volumes and encryption keys. Never run `docker compose down -v` or delete `.dfx` to fix login. Legacy code is preserved in `compose.ic.yaml`, `Dockerfile.ic` and `server/auth-ic.mjs`; do not publish that legacy development stack. A migration must be dry-run and reviewed against an export/backup before deleting anything.

A reviewed reconciliation helper is provided at `scripts/reconcile-deletions.mjs`. Supply `DELETION_LEDGER_FILE` pointing to a JSON array of `{ "account_hash": "64-lowercase-hex" }` records exported independently from `deletion_tombstones`, the original `AUTH_DATA_DIR/encryption.key`, restored `MEDIA_ROOT`, and private PostgreSQL connection settings. It defaults to a dry run; applying requires `RESTORE_ISOLATED=true` plus `--apply`. Keep the API/tunnel stopped throughout. This helper does not create backups, verify ledger freshness or enforce the 30-day expiry; those remain separately monitored operator procedures.

For an existing PostgreSQL beta database from before consent history was introduced, apply `server/sql/migrations/002-consent-events.sql` as the database administrator before updating the API. New empty databases already initialize this table. Never rerun the entire initial schema against an existing database.
