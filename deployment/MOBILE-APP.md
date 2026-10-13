# Mobile installation and server launch

Nlocki now includes a web manifest, Android/maskable icons, an iOS home-screen icon, an install/help button and a generic offline fallback. The icon is a pink tile with a dark N on a dark background. Installation is a PWA home-screen app, not an App Store or Google Play release.

## Connection and data

Installed Nlocki opens the same origin from which it was installed. All account APIs use relative `/api/` URLs, so the phone connects to that origin's authenticated Node API and PostgreSQL/private photo storage. The user may need to sign in again after installation, depending on the platform. Account data is not copied into localStorage or the service worker's cache. Reconnect to read/save data; offline writes, automatic synchronization and push notifications are not implemented.

The service worker caches only the generic offline page, its stylesheet and public installation assets. It never caches `/api/*` (including authentication, exports and private photos), and never persists signed-in pages or account data. Offline navigation shows a reconnect page, not another account's cached records. This policy applies to app-controlled Cache Storage; it is not a claim that the operating system/browser never keeps memory or screenshots.

## Domain and server

Use the production templates in SELF-HOSTING.md, not the development compose file. The intended origin is **https://app.gixha.com**. Keep the app/gateway behind the Cloudflare Tunnel with no published origin ports. Do not publish PostgreSQL or expose local-testing mode. The existing same-origin `/api/` gateway means you do not need an additional api.gixha.com hostname or permissive CORS.

Configure the tunnel/DNS hostname in Cloudflare as documented in CLOUDFLARE.md. Enable HTTPS at the edge. For a separately configured proxied HTTPS origin use Full (strict), not Flexible or unverified Full. A tunnel to the local Docker gateway does not require a public Certbot/Nginx listener. The templates themselves do not create DNS records, firewall rules, certificates or Cloudflare account changes.

Complete real SMTP/email verification, passkey real-domain tests, verified PostgreSQL TLS/private VM access, backups/restore rehearsal, operator contact/Impressum/privacy review and beta tester access before real users. Test country blocks and confirm the origin cannot be reached directly. The domain dashboard link alone does not authorize or connect a server.

## Install

- Android/Chrome: open the HTTPS site, sign in, then use the browser's Install app / Add to Home screen option. Nlocki's install button invokes the browser prompt only when the browser provides it; otherwise it gives instructions.
- iPhone/iPad: open the HTTPS site in Safari, Share → Add to Home Screen → Add. Test on a physical iPhone; automatic Android install prompts do not apply.
- Desktop: supported browsers offer installation in the address bar/browser menu. localhost can be used for browser checks because it is a trustworthy development origin. A phone's localhost points to the phone, not your WSL computer.

## Scaling and next steps

Start with a limited private beta. Measure CPU, RAM, database queries, concurrent connections, image storage, backup time and email limits before setting a capacity target; installing on phones does not increase server capacity. The current laptop/SSD/HDD and one app instance are not a high-availability cluster. Document the recovery window and single-machine failure risk.

For growth, first optimize slow queries and pagination, monitor pool limits and rate-limit behavior, and enforce storage quotas. Then consider multiple app instances behind a shared gateway with the same protected auth key and shared media/storage, PostgreSQL connection budgeting and tested deployment migrations. Do not duplicate independent databases or keys and expect accounts to synchronize automatically. Private object storage and a separately backed-up database can follow after reviewing access/processor contracts.

Future push notifications require explicit permission, authenticated subscription management, a push sender, cleanup on account deletion, platform testing and privacy review. App Store/Google Play packaging is a separate native-wrapper/store process. These features are not implied by adding a manifest.
