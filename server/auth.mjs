import { createServer } from "node:http";
import { getDb, pool } from "./db.mjs";
import { createPasskeys } from "./passkeys.mjs";
import { createApi } from "./api.mjs";
import { EU_BALKAN_COUNTRIES, PRIVACY_VERSION } from "./legal.mjs";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  randomBytes,
  randomInt,
  scrypt as scryptCallback,
  timingSafeEqual,
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
} from "node:crypto";
import { promisify } from "node:util";
import {
  DelegationChain,
  Ed25519KeyIdentity,
  Ed25519PublicKey,
} from "@icp-sdk/core/identity";
import { Principal } from "@icp-sdk/core/principal";
import nodemailer from "nodemailer";

process.umask(0o077);
const scrypt = promisify(scryptCallback);
const local = process.env.AUTH_LOCAL_TESTING === "true";
const verifyEmail =
  !local || process.env.AUTH_REQUIRE_EMAIL_VERIFICATION === "true";
const origins = (
  process.env.AUTH_ALLOWED_ORIGINS ||
  "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((s) => new URL(s.trim()).origin);
if (
  local &&
  (process.env.NODE_ENV === "production" ||
    origins.some(
      (s) => !["localhost", "127.0.0.1", "[::1]"].includes(new URL(s).hostname),
    ))
)
  throw new Error(
    "Local testing requires development mode and loopback origins.",
  );
if (!local && origins.some((s) => !s.startsWith("https://")))
  throw new Error("Online email authentication requires HTTPS origins.");
if (!local && (!process.env.SMTP_HOST || !process.env.SMTP_FROM))
  throw new Error("Online email authentication requires an SMTP service.");
const dir = resolve(process.env.AUTH_DATA_DIR || ".local-auth");
mkdirSync(dir, { recursive: true, mode: 0o700 });
const keyPath = resolve(dir, "encryption.key");
const db = await getDb();
if (
  !existsSync(keyPath) &&
  (existsSync(resolve(dir, "accounts.sqlite")) ||
    (await db.prepare("SELECT count(*) n FROM users").get()).n > 0)
)
  throw new Error(
    "Authentication encryption key is missing. Restore the complete auth data backup.",
  );
if (!existsSync(keyPath))
  writeFileSync(keyPath, randomBytes(32), { mode: 0o600, flag: "wx" });
const master = readFileSync(keyPath);
if (master.length !== 32)
  throw new Error("Invalid authentication encryption key.");
const smtp = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      requireTLS: !local,
      connectionTimeout: 10_000,
      socketTimeout: 15_000,
      tls: { minVersion: "TLSv1.2" },
      auth: process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD_FILE
              ? readFileSync(process.env.SMTP_PASSWORD_FILE, "utf8").trim()
              : process.env.SMTP_PASSWORD,
          }
        : undefined,
    })
  : undefined;
const hash = (s) => createHash("sha256").update(s).digest("hex");
const codeHash = (id, code) =>
  createHmac("sha256", master).update(`${id}:${code}`).digest("hex");
function encrypt(value) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", master, iv);
  return Buffer.concat([
    iv,
    cipher.update(value),
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString("base64");
}
function decrypt(value) {
  const b = Buffer.from(value, "base64"),
    d = createDecipheriv("aes-256-gcm", master, b.subarray(0, 12));
  d.setAuthTag(b.subarray(-16));
  return Buffer.concat([d.update(b.subarray(12, -16)), d.final()]).toString();
}
function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}
async function rate(bucket, max, ms) {
  const now = Date.now();
  const row = await db
    .prepare(
      "INSERT INTO limits(bucket,count,expires) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=CASE WHEN limits.expires<? THEN 1 ELSE limits.count+1 END,expires=CASE WHEN limits.expires<? THEN excluded.expires ELSE limits.expires END RETURNING count",
    )
    .get(bucket, now + ms, now, now);
  if (Number(row.count) > max)
    fail(429, "Too many attempts. Please try again later.");
}
async function passwordHash(password, salt) {
  return (
    await scrypt(password, Buffer.from(salt, "hex"), 64, {
      N: 32768,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    })
  ).toString("hex");
}
function credentials(body) {
  const email = String(body.email || "")
      .trim()
      .toLowerCase(),
    password = body.password;
  if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email))
    fail(400, "Enter a valid email address.");
  if (
    typeof password !== "string" ||
    password.length < (local ? 8 : 12) ||
    password.length > 128
  )
    fail(400, `Use a password with ${local ? 8 : 12}–128 characters.`);
  return { email, password };
}
function pubkey(body) {
  if (
    typeof body.publicKey !== "string" ||
    !/^[a-f0-9]{88}$/i.test(body.publicKey)
  )
    fail(400, "Invalid session public key.");
  try {
    return Ed25519PublicKey.fromDer(
      Uint8Array.from(Buffer.from(body.publicKey, "hex")),
    );
  } catch {
    fail(400, "Invalid session public key.");
  }
}
async function delegation(user, body) {
  const target = process.env.AUTH_BACKEND_CANISTER_ID;
  if (!target) fail(503, "Authentication backend is not configured.");
  const root = Ed25519KeyIdentity.fromJSON(decrypt(user.identity));
  const chain = await DelegationChain.create(
    root,
    pubkey(body),
    new Date(Date.now() + 30 * 60_000),
    target === "http" ? {} : { targets: [Principal.fromText(target)] },
  );
  return { delegation: chain.toJSON(), email: user.email };
}
async function sessionUser(req) {
  const token = (req.headers.cookie || "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("nlocki_session="))
    ?.slice(15);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return;
  return await db
    .prepare(
      "SELECT users.*, sessions.token session_token, sessions.mfa_until FROM users JOIN sessions ON sessions.user_id=users.id WHERE sessions.token=? AND sessions.expires>?",
    )
    .get(hash(token), Date.now());
}
async function setSession(res, user) {
  const token = randomBytes(32).toString("hex");
  await db.prepare("DELETE FROM sessions WHERE expires < ?").run(Date.now());
  await db
    .prepare("INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)")
    .run(hash(token), user.id, Date.now() + 7 * 86400_000);
  res.setHeader(
    "Set-Cookie",
    `nlocki_session=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=604800${local ? "" : "; Secure"}`,
  );
}
async function sendCode(user) {
  const code = String(randomInt(1_000_000)).padStart(6, "0");
  await db
    .prepare(
      "UPDATE users SET code=?,code_expires=?,code_attempts=0 WHERE id=?",
    )
    .run(codeHash(user.id, code), Date.now() + 600_000, user.id);
  if (local && !smtp) {
    await db
      .prepare("DELETE FROM inbox WHERE email=? OR created<?")
      .run(user.email, Date.now() - 600_000);
    await db
      .prepare("INSERT INTO inbox VALUES(?,?,?,?)")
      .run(randomBytes(12).toString("hex"), user.email, code, Date.now());
  } else {
    await smtp.sendMail({
      from: process.env.SMTP_FROM,
      to: user.email,
      subject: "Confirm your Nlock’i email",
      text: `Your confirmation code is ${code}. It expires in 10 minutes. If you did not request this, ignore this email.`,
    });
  }
}
function safeRequest(req) {
  const origin = req.headers.origin;
  if (origin && !origins.includes(origin))
    fail(403, "Request origin is not allowed.");
  if (!origin && req.method !== "GET") fail(403, "Origin header is required.");
  if (!origins.some((s) => new URL(s).host === req.headers.host))
    fail(403, "Request host is not allowed.");
}
async function body(req) {
  let size = 0,
    chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 750_000) fail(413, "Request too large.");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString() || "{}");
  } catch {
    fail(400, "Invalid JSON.");
  }
}
function json(res, value, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(value));
}
const passkeys = createPasskeys({
  pool,
  local,
  origins,
  sessionUser,
  passwordHash,
  delegation,
  setSession,
  hash,
  rate,
});
const api = createApi({
  db,
  pool,
  master,
  encrypt,
  decrypt,
  fail,
  rate,
  sessionUser,
  passwordHash,
  hash,
  local,
  passkeys,
});
const server = createServer(async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  try {
    if (req.url === "/health") {
      await pool.query("SELECT 1");
      return json(res, { ok: true });
    }
    safeRequest(req);
    if (
      !local &&
      process.env.TRUST_CLOUDFLARE === "true" &&
      !EU_BALKAN_COUNTRIES.includes(req.headers["cf-ipcountry"])
    )
      fail(403, "Service unavailable in this region.");
    const path = new URL(req.url, "http://localhost").pathname;
    if (!path.startsWith("/api/auth/"))
      return await api.handle(req, res, path, body, json);
    if (req.method === "GET" && path === "/api/auth/config")
      return json(res, {
        localTesting: local,
        requireVerification: verifyEmail,
        localInbox: local && !smtp,
        privacyVersion: PRIVACY_VERSION,
        httpBackend: true,
      });
    if (req.method === "GET" && path === "/api/auth/dev/inbox") {
      if (!local || smtp) fail(404, "Not found.");
      // Development inbox contains only email codes, never passwords or identity keys.
      const rows = await db
        .prepare(
          "SELECT email,code FROM inbox WHERE created>? ORDER BY created DESC LIMIT 20",
        )
        .all(Date.now() - 600_000);
      const escape = (s) =>
        String(s).replace(
          /[&<>"']/g,
          (c) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#39;",
            })[c],
        );
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
      );
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(
        `<h1>Nlock’i local test inbox</h1><p>Development only. Refresh after requesting a code.</p>${rows.map((r) => `<p>${escape(r.email)}: <strong>${escape(r.code)}</strong></p>`).join("") || "<p>No pending codes.</p>"}`,
      );
    }
    if (req.method !== "POST") fail(404, "Not found.");
    const input = await body(req);
    if (path.startsWith("/api/auth/passkey/"))
      return json(res, await passkeys.login(req, res, path, input));
    if (path === "/api/auth/signup") {
      await rate(`signup:${req.socket.remoteAddress}`, 30, 3600_000);
      const { email, password } = credentials(input);
      if (
        !local &&
        (input.acceptedTerms !== PRIVACY_VERSION || input.adult !== true)
      )
        fail(
          400,
          "Confirm the current beta terms and adult eligibility to create an account. Health-data consent is optional.",
        );
      pubkey(input);
      if (await db.prepare("SELECT id FROM users WHERE email=?").get(email))
        fail(
          409,
          "Cannot create this account. Try signing in or confirming your email.",
        );
      const salt = randomBytes(16).toString("hex");
      const identity = Ed25519KeyIdentity.generate();
      const user = {
        id: identity.getPrincipal().toText(),
        email,
        salt,
        password: await passwordHash(password, salt),
        identity: encrypt(JSON.stringify(identity.toJSON())),
        verified: verifyEmail ? 0 : 1,
      };
      await db
        .prepare(
          "INSERT INTO users(id,email,salt,password,identity,verified) VALUES(?,?,?,?,?,?)",
        )
        .run(
          user.id,
          email,
          user.salt,
          user.password,
          user.identity,
          user.verified,
        );
      await db
        .prepare(
          "INSERT INTO agreements(user_id,version,accepted,health_consent) VALUES(?,?,?,?)",
        )
        .run(
          user.id,
          PRIVACY_VERSION,
          Date.now(),
          local || input.healthConsent === true,
        );
      if (!user.verified) {
        await sendCode(user);
        return json(res, { verificationRequired: true });
      }
      const result = await delegation(user, input);
      await setSession(res, user);
      return json(res, result);
    }
    if (path === "/api/auth/login" || path === "/api/auth/resend") {
      const { email, password } = credentials(input);
      await rate(`login:${hash(email)}`, 10, 300_000);
      await rate(`login-ip:${req.socket.remoteAddress}`, 100, 300_000);
      const user = await db
        .prepare("SELECT * FROM users WHERE email=?")
        .get(email);
      const salt = user?.salt || "00".repeat(16);
      const calculated = await passwordHash(password, salt);
      if (
        !user ||
        !timingSafeEqual(
          Buffer.from(calculated, "hex"),
          Buffer.from(user.password, "hex"),
        )
      )
        fail(401, "Email or password is incorrect.");
      if (!user.verified) {
        await rate(`mail:${user.id}`, 3, 600_000);
        await sendCode(user);
        return json(res, { verificationRequired: true });
      }
      if (path === "/api/auth/resend") return json(res, { verified: true });
      const result = await delegation(user, input);
      await setSession(res, user);
      return json(res, result);
    }
    if (path === "/api/auth/verify") {
      const { email, password } = credentials(input);
      await rate(`verify:${hash(email)}`, 10, 300_000);
      const user = await db
        .prepare("SELECT * FROM users WHERE email=?")
        .get(email);
      const calculated = await passwordHash(
        password,
        user?.salt || "00".repeat(16),
      );
      if (
        !user ||
        !timingSafeEqual(
          Buffer.from(calculated, "hex"),
          Buffer.from(user.password, "hex"),
        )
      )
        fail(401, "Email or password is incorrect.");
      pubkey(input);
      if (
        !user.code ||
        user.verified ||
        user.code_expires < Date.now() ||
        user.code_attempts >= 5
      )
        fail(400, "Code expired or too many attempts. Request a new code.");
      await db
        .prepare("UPDATE users SET code_attempts=code_attempts+1 WHERE id=?")
        .run(user.id);
      if (
        !/^\d{6}$/.test(String(input.code)) ||
        !timingSafeEqual(
          Buffer.from(codeHash(user.id, String(input.code)), "hex"),
          Buffer.from(user.code, "hex"),
        )
      )
        fail(400, "Confirmation code is incorrect.");
      const result = await delegation(user, input);
      await db
        .prepare(
          "UPDATE users SET verified=1,code=NULL,code_expires=NULL WHERE id=?",
        )
        .run(user.id);
      await db.prepare("DELETE FROM inbox WHERE email=?").run(user.email);
      await setSession(res, user);
      return json(res, result);
    }
    if (path === "/api/auth/session") {
      const user = await sessionUser(req);
      if (!user) fail(401, "Please sign in.");
      return json(res, await delegation(user, input));
    }
    if (path === "/api/auth/logout") {
      const token = (req.headers.cookie || "")
        .split(";")
        .map((s) => s.trim())
        .find((s) => s.startsWith("nlocki_session="))
        ?.slice(15);
      if (token)
        await db.prepare("DELETE FROM sessions WHERE token=?").run(hash(token));
      res.setHeader(
        "Set-Cookie",
        `nlocki_session=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0${local ? "" : "; Secure"}`,
      );
      return json(res, { ok: true });
    }
    fail(404, "Not found.");
  } catch (error) {
    if ([401, 403, 429].includes(error.status))
      void pool
        .query("INSERT INTO security_events(kind) VALUES($1)", [
          `${error.status}:${new URL(req.url, "http://localhost").pathname.startsWith("/api/auth") ? "auth" : "access"}`,
        ])
        .catch(() => {});
    json(
      res,
      {
        error: error.status
          ? error.message
          : "Authentication service failed. Please try again.",
      },
      error.status || 503,
    );
  }
});
const maintenance = setInterval(() => {
  void api
    .cleanup()
    .catch(() =>
      console.error("Media cleanup failed; inspect storage health."),
    );
  void pool
    .query("DELETE FROM sessions WHERE expires<$1", [Date.now()])
    .catch(() => {});
  void pool
    .query("DELETE FROM inbox WHERE created<$1", [Date.now() - 600000])
    .catch(() => {});
  void pool
    .query("DELETE FROM security_events WHERE created<now()-interval '30 days'")
    .catch(() => {});
}, 60000);
maintenance.unref();
server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.listen(
  Number(process.env.AUTH_PORT || 3010),
  process.env.AUTH_BIND || "127.0.0.1",
  () =>
    console.log(
      `Email authentication ready (${local ? "local development" : "online"}, verification ${verifyEmail ? "required" : "optional for local testing"})`,
    ),
);
function stop() {
  server.close(() => {
    void pool.end().then(() => process.exit(0));
  });
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
