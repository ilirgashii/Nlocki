import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  DelegationChain,
  DelegationIdentity,
  Ed25519KeyIdentity,
} from "@icp-sdk/core/identity";
import { HttpAgent, Actor } from "@icp-sdk/core/agent";
import { idlFactory } from "../src/frontend/src/declarations/backend.did.js";
const dir = mkdtempSync(join(tmpdir(), "nlocki-email-test-"));
const base = "http://127.0.0.1:3151";
const email = "integration@example.test",
  password = "test-only-password";
const key = Ed25519KeyIdentity.generate(),
  publicKey = Buffer.from(key.getPublicKey().toDer()).toString("hex");
const canisterId =
  process.env.NLOCKI_CANISTER_ID || "uxrrr-q7777-77774-qaaaq-cai";
let server, cookie;
async function start(verification = true) {
  server = spawn(process.execPath, ["server/auth-ic.mjs"], {
    env: {
      ...process.env,
      AUTH_LOCAL_TESTING: "true",
      AUTH_REQUIRE_EMAIL_VERIFICATION: String(verification),
      AUTH_ALLOWED_ORIGINS: base,
      AUTH_DATA_DIR: dir,
      AUTH_PORT: "3151",
      AUTH_BACKEND_CANISTER_ID: canisterId,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null)
      throw new Error("Email test service failed to start");
    try {
      if ((await fetch(`${base}/api/auth/config`)).ok) return;
    } catch {}
    await delay(50);
  }
  throw new Error("Email service startup timed out");
}
async function stop() {
  if (server && server.exitCode === null) {
    const ended = once(server, "exit");
    server.kill("SIGTERM");
    await ended;
  }
}
async function request(path, input, origin = base) {
  const response = await fetch(`${base}/api/auth/${path}`, {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(input),
  });
  return {
    status: response.status,
    body: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
async function backend(delegation) {
  const identity = DelegationIdentity.fromDelegation(
    key,
    DelegationChain.fromJSON(JSON.stringify(delegation)),
  );
  const agent = new HttpAgent({
    identity,
    host: process.env.NLOCKI_BACKEND_HOST || "http://127.0.0.1:4943",
  });
  await agent.fetchRootKey();
  return {
    actor: Actor.createActor(idlFactory, { agent, canisterId }),
    principal: identity.getPrincipal().toText(),
  };
}
try {
  for (const extra of [
    {
      NODE_ENV: "production",
      AUTH_LOCAL_TESTING: "true",
      AUTH_ALLOWED_ORIGINS: base,
    },
    {
      AUTH_LOCAL_TESTING: "true",
      AUTH_ALLOWED_ORIGINS: "https://public.example",
    },
    { AUTH_LOCAL_TESTING: "false", AUTH_ALLOWED_ORIGINS: base },
    {
      AUTH_LOCAL_TESTING: "false",
      AUTH_ALLOWED_ORIGINS: "https://public.example",
      SMTP_HOST: "",
      SMTP_FROM: "",
    },
  ]) {
    const blocked = spawnSync(process.execPath, ["server/auth-ic.mjs"], {
      env: { ...process.env, ...extra },
      stdio: "pipe",
      timeout: 5000,
    });
    assert.equal(
      blocked.status,
      1,
      "Unsafe online/local settings must fail closed",
    );
  }
  await start();
  assert.equal(
    (
      await request(
        "signup",
        { email, password, publicKey },
        "https://evil.example",
      )
    ).status,
    403,
  );
  assert.equal(
    (await request("signup", { email, password: "short", publicKey })).status,
    400,
  );
  let r = await request("signup", { email, password, publicKey });
  assert.equal(r.status, 200);
  assert.equal(r.body.verificationRequired, true);
  assert.equal(r.cookie, undefined);
  assert.equal((await request("session", { publicKey })).status, 401);
  assert.equal(
    (await request("login", { email, password: "not-the-password", publicKey }))
      .status,
    401,
  );
  const inbox = await (await fetch(`${base}/api/auth/dev/inbox`)).text();
  const code = inbox.match(/<strong>(\d{6})<\/strong>/)?.[1];
  assert.ok(code);
  assert.equal(
    (
      await request("verify", {
        email,
        password,
        publicKey,
        code: "wrong-code",
      })
    ).status,
    400,
  );
  r = await request("verify", { email, password, publicKey, code });
  assert.equal(r.status, 200);
  assert.ok(r.cookie);
  cookie = r.cookie;
  assert.equal(
    (await request("verify", { email, password, publicKey, code })).status,
    400,
  );
  const account = await backend(r.body.delegation);
  await account.actor.addTask("2020-01-04", "Email login persists");
  const database = readFileSync(join(dir, "accounts.sqlite"));
  assert.equal(database.includes(Buffer.from(password)), false);
  await stop();
  await start();
  r = await request("session", { publicKey });
  assert.equal(r.status, 200);
  const restored = await backend(r.body.delegation);
  assert.equal(restored.principal, account.principal);
  assert.equal(
    (await restored.actor.getTasksForDate("2020-01-04"))[0].title,
    "Email login persists",
  );
  assert.equal((await request("logout", {})).status, 200);
  assert.equal((await request("session", { publicKey })).status, 401);
  cookie = undefined;
  r = await request("login", { email, password, publicKey });
  assert.equal(r.status, 200);
  assert.equal((await backend(r.body.delegation)).principal, account.principal);
  for (let i = 0; i < 12; i++)
    r = await request("login", {
      email,
      password: "not-the-password",
      publicKey,
    });
  assert.equal(r.status, 429);
  await stop();
  await start(false);
  r = await request("signup", {
    email: "quick@example.test",
    password,
    publicKey,
  });
  assert.equal(r.status, 200);
  assert.ok(r.body.delegation);
  assert.ok(r.cookie);
  console.log(
    "PASS: email code confirmation/replay rejection, real signed backend access, account/session persistence after auth restart, logout, password validation/rate limits, origin rejection, production configuration guards and quick local signup",
  );
} finally {
  await stop();
  rmSync(dir, { recursive: true, force: true });
}
