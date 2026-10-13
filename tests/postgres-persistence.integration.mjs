// Restarts ONLY the three explicitly selected test containers; never deletes volumes.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import {
  Ed25519KeyIdentity,
  DelegationChain,
  DelegationIdentity,
} from "@icp-sdk/core/identity";
import sharp from "sharp";
const project = process.env.NLOCKI_TEST_COMPOSE_PROJECT;
if (!project || !/^nlocki-[a-z0-9-]+$/.test(project))
  throw Error(
    "Set NLOCKI_TEST_COMPOSE_PROJECT to an isolated stack you authorize this test to restart.",
  );
const base = process.env.NLOCKI_BASE_URL || "http://127.0.0.1:5173",
  key = Ed25519KeyIdentity.generate(),
  password = "Restart-test-password!",
  email = "restart-" + Date.now() + "@example.test";
let cookie, id;
const request = async (path, body) => {
  const r = await fetch(base + path, {
    method: "POST",
    headers: {
      Origin: base,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(body),
  });
  const value = await r.json();
  assert.equal(r.status, 200, JSON.stringify(value));
  return { value, cookie: r.headers.get("set-cookie")?.split(";")[0] };
};
const rpc = async (method, args = []) => {
  const r = await request("/api/rpc", { method, args, key: id });
  return r.value.result;
};
try {
  const signup = await request("/api/auth/signup", {
    email,
    password,
    publicKey: Buffer.from(key.getPublicKey().toDer()).toString("hex"),
  });
  cookie = signup.cookie;
  id = DelegationIdentity.fromDelegation(
    key,
    DelegationChain.fromJSON(JSON.stringify(signup.value.delegation)),
  )
    .getPrincipal()
    .toText();
  await rpc("createOrGetProfile");
  await rpc("addTask", ["2026-10-13", "Persist through DB/API restart"]);
  const photo =
    "data:image/jpeg;base64," +
    (
      await sharp({
        create: { width: 12, height: 12, channels: 3, background: "#111111" },
      })
        .jpeg()
        .toBuffer()
    ).toString("base64");
  const post = await rpc("createPost", ["Persisted photo", [photo]]);
  const run = (...args) =>
    execFileSync("docker", args, { stdio: "pipe", timeout: 60000 });
  run("stop", project + "-api-1");
  run("restart", project + "-db-1");
  run("start", project + "-api-1");
  run("restart", project + "-gateway-1");
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + "/api/auth/config")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(200);
  }
  assert.ok(ready, "Stack did not recover after restart");
  const tasks = await rpc("getTasksForDate", ["2026-10-13"]);
  assert.ok(tasks.some((v) => v.title === "Persist through DB/API restart"));
  assert.equal(
    (await fetch(base + post.photoUrl[0], { headers: { Cookie: cookie } }))
      .status,
    200,
  );
  await request("/api/auth/logout", {});
  cookie = undefined;
  const login = await request("/api/auth/login", {
    email,
    password,
    publicKey: Buffer.from(key.getPublicKey().toDer()).toString("hex"),
  });
  cookie = login.cookie;
  assert.equal(
    DelegationIdentity.fromDelegation(
      key,
      DelegationChain.fromJSON(JSON.stringify(login.value.delegation)),
    )
      .getPrincipal()
      .toText(),
    id,
  );
  assert.ok(
    (await rpc("getTasksForDate", ["2026-10-13"])).some(
      (v) => v.title === "Persist through DB/API restart",
    ),
  );
  console.log(
    "PASS: PostgreSQL, cookie/account identity, task and private photo persistence through DB/API/gateway restart and fresh password login",
  );
} finally {
  if (cookie && id)
    try {
      await request("/api/account/delete", {
        method: "accountDelete",
        args: [password],
        key: id,
      });
    } catch {}
}
