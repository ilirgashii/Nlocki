# Cloudflare for app.gixha.com

These are proposed settings, not changes already applied to your Cloudflare account. The account dashboard link does not provide credentials or permission to modify it remotely.

1. In Zero Trust → Networks → Tunnels create a remotely managed Cloudflare Tunnel. Save its connector token in `/srv/nlocki-secrets/cloudflare_tunnel_token` (mode 0600). Never put it in Git, chat, a URL, or command-line arguments.
2. Add public hostname **app.gixha.com** to the tunnel, service **http://gateway:8080**. Use the production app Compose stack on the app VM. There are no published origin ports; do not port-forward it on your router. Do not add an unproxied DNS record pointing to the VM.
3. Under the gixha.com zone, Security → WAF → Custom rules, create a **Block** rule for this expression:

```
(http.host eq "app.gixha.com" and not ip.src.country in {"AT" "BE" "BG" "HR" "CY" "CZ" "DK" "EE" "FI" "FR" "DE" "GR" "HU" "IE" "IT" "LV" "LT" "LU" "MT" "NL" "PL" "PT" "RO" "SK" "SI" "ES" "SE" "AL" "BA" "ME" "MK" "RS" "XK"})
```

The list is EU27 plus Albania, Bosnia-Herzegovina, Montenegro, North Macedonia, Serbia and Kosovo. Verify the country code reported for real Kosovo requests before launch; `XK` is a commonly used Kosovo code but IP geolocation databases and Cloudflare expression support must be confirmed in your dashboard. Unknown locations are blocked. UK, Switzerland and Norway are not in the EU27 list. Country controls concern IP location, not citizenship, and VPNs can bypass them. App API performs an additional country check only in the tunnel-only production configuration; do not trust client-supplied country headers on an exposed origin.

4. Create a cache rule to **bypass cache for `/api/*`** on app.gixha.com. Never use Cache Everything for authenticated pages, photos or exports. API/image responses are `private, no-store`. Disable Rocket Loader and HTML modifications if they conflict with the app's CSP.
5. Enable HTTPS/Always Use HTTPS and reasonable managed security protections available on your plan. Cloudflare Access with an explicit beta tester allowlist is recommended before a wider release; it provides an additional beta gate, not a replacement for app authorization.
6. Test from an allowed country and a blocked country, verify the private origin cannot be reached directly, and confirm private images cannot be fetched logged out or by another account. Check logout, email delivery, passkey registration on app.gixha.com, export and deletion.

Review Cloudflare's DPA, sub-processors, logging/retention and international transfer safeguards. Geo-blocking does not remove GDPR obligations. The actual zone/account rule has not been installed by the coding task.
