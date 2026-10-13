// Isolated WebAuthn verifier test on Chromium's trustworthy loopback origin.
// This does not test SMTP, production TLS, DNS or a real user's authenticator.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHash, randomBytes, scryptSync } from "node:crypto";
import { chromium } from "playwright-core";
import { pool } from "../server/db.mjs";
import { createPasskeys } from "../server/passkeys.mjs";
const base = "http://localhost:3158",
  password = "Only-test-WebAuthn-2026!";
const hash = (s) => createHash("sha256").update(s).digest("hex");
const salt = randomBytes(16).toString("hex"),
  id = "passkey-test-" + Date.now(),
  email = id + "@example.test";
const passwordHash = (v, s) => scryptSync(v, s, 64).toString("hex");
const user = { id, email, salt, password: passwordHash(password, salt) };
await pool.query(
  "INSERT INTO users(id,email,salt,password,identity,verified) VALUES($1,$2,$3,$4,$5,1)",
  [id, email, salt, user.password, "isolated fixture, not an auth identity"],
);
const passkeys = createPasskeys({
  pool,
  local: false,
  origins: [base],
  sessionUser: async () => user,
  passwordHash,
  delegation: async () => ({ authenticated: id }),
  setSession: async () => {},
  hash,
  rate: async () => {},
});
const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<!doctype html><title>Isolated passkey test</title>");
      return;
    }
    const input = JSON.parse(
      await Array.fromAsync(req).then((a) => Buffer.concat(a).toString()),
    );
    const data =
      req.url === "/api/register"
        ? await passkeys.registration(req, res, input, async (_req, p) =>
            assert.equal(p.method, "registerPasskey"),
          )
        : await passkeys.login(req, res, req.url, input);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  } catch (e) {
    res.writeHead(e.status || 400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: e.message }));
  }
});
await new Promise((resolve) => server.listen(3158, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage(),
    cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  await page.goto(base);
  const result = await page.evaluate(
    async ({ password, email }) => {
      const post = async (path, body) => {
        const r = await fetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        return { status: r.status, body: await r.json() };
      };
      const bytes = (s) =>
        Uint8Array.from(
          atob(s.replaceAll("-", "+").replaceAll("_", "/")),
          (c) => c.charCodeAt(0),
        );
      const bypass = await post("/api/register", {
        method: "getSecondFactorStatus",
        args: [password],
      });
      const wrong = await post("/api/register", {
        method: "registerPasskey",
        args: ["wrong-password"],
      });
      const r = await post("/api/register", {
        method: "registerPasskey",
        args: [password],
      });
      if (r.status !== 200) throw Error(JSON.stringify(r));
      const opts = r.body;
      opts.challenge = bytes(opts.challenge);
      opts.user.id = bytes(opts.user.id);
      opts.excludeCredentials = opts.excludeCredentials.map((v) => ({
        ...v,
        id: bytes(v.id),
      }));
      const credential = await navigator.credentials.create({
        publicKey: opts,
      });
      const response = credential.toJSON();
      const registered = await post("/api/register", {
        method: "registerPasskey",
        args: [password, response],
      });
      const registerReplay = await post("/api/register", {
        method: "registerPasskey",
        args: [password, response],
      });
      const o = await post("/api/auth/passkey/options", { email });
      const options = o.body;
      options.challenge = bytes(options.challenge);
      options.allowCredentials = options.allowCredentials.map((v) => ({
        ...v,
        id: bytes(v.id),
      }));
      const assertion = (
        await navigator.credentials.get({ publicKey: options })
      ).toJSON();
      const loggedIn = await post("/api/auth/passkey/verify", {
        email,
        response: assertion,
      });
      const loginReplay = await post("/api/auth/passkey/verify", {
        email,
        response: assertion,
      });
      return {
        bypass,
        wrong,
        registered,
        registerReplay,
        loggedIn,
        loginReplay,
      };
    },
    { password, email },
  );
  assert.equal(result.bypass.status, 401);
  assert.equal(result.wrong.status, 401);
  assert.equal(
    result.registered.status,
    200,
    JSON.stringify(result.registered),
  );
  assert.equal(result.registerReplay.status, 401);
  assert.equal(result.loggedIn.status, 200, JSON.stringify(result.loggedIn));
  assert.equal(result.loggedIn.body.authenticated, id);
  assert.equal(result.loginReplay.status, 401);
  assert.equal(
    (await pool.query("SELECT count(*) n FROM passkeys WHERE user_id=$1", [id]))
      .rows[0].n,
    "1",
  );
  console.log(
    "PASS: real WebAuthn registration/assertion verification with Chromium virtual authenticator, password check, single-use challenges and stored credential counter",
  );
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
  await pool.query("DELETE FROM users WHERE id=$1", [id]);
  await pool.end();
}
