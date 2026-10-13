import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { idlFactory } from "../src/frontend/src/declarations/backend.did.js";
const container = process.env.NLOCKI_DOCKER_CONTAINER;
if (!container)
  throw new Error(
    "Set NLOCKI_DOCKER_CONTAINER to your local development test container; this test restarts it.",
  );
const requireFrontend = createRequire(
  new URL("../src/frontend/package.json", import.meta.url),
);
const { Actor, HttpAgent } = requireFrontend("@icp-sdk/core/agent");
const { Ed25519KeyIdentity, DelegationIdentity, DelegationChain } =
  requireFrontend("@icp-sdk/core/identity");
const id = execFileSync(
  "docker",
  ["exec", container, "dfx", "canister", "id", "backend"],
  { encoding: "utf8" },
).trim();
const identity = Ed25519KeyIdentity.generate();
async function connect(signer = identity) {
  const agent = new HttpAgent({
    identity: signer,
    host: process.env.NLOCKI_BACKEND_HOST || "http://127.0.0.1:4943",
  });
  await agent.fetchRootKey();
  return Actor.createActor(idlFactory, { agent, canisterId: id });
}
const base = process.env.NLOCKI_BASE_URL || "http://127.0.0.1:5173";
const email = `docker-${Date.now()}@example.test`,
  password = "docker-testing-password";
const publicKey = Buffer.from(identity.getPublicKey().toDer()).toString("hex");
let cookie;
async function emailRequest(path, input) {
  const r = await fetch(`${base}/api/auth/${path}`, {
    method: "POST",
    headers: {
      Origin: new URL(base).origin,
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify(input),
  });
  const value = await r.json();
  assert.equal(r.status, 200, value.error);
  if (r.headers.get("set-cookie"))
    cookie = r.headers.get("set-cookie").split(";")[0];
  return value;
}
function signer(result) {
  return DelegationIdentity.fromDelegation(
    identity,
    DelegationChain.fromJSON(JSON.stringify(result.delegation)),
  );
}
let emailResult = await emailRequest("signup", { email, password, publicKey });
assert.ok(
  emailResult.delegation,
  "Run the Docker persistence test in default quick signup mode",
);
const emailIdentity = signer(emailResult),
  emailPrincipal = emailIdentity.getPrincipal().toText();
await (await connect(emailIdentity)).addTask(
  "2020-01-03",
  "Email Docker persistence",
);
const date = "2020-01-03",
  title = `Docker restart ${Date.now()}`;
await (await connect()).addTask(date, title);
execFileSync("docker", ["restart", "--time", "60", container], {
  timeout: 90_000,
  stdio: "pipe",
});
const deadline = Date.now() + 180_000;
let ready = false;
while (Date.now() < deadline) {
  try {
    const response = await fetch(
      process.env.NLOCKI_BASE_URL || "http://127.0.0.1:5173",
      { signal: AbortSignal.timeout(3000) },
    );
    if (response.ok) {
      ready = true;
      break;
    }
  } catch {
    /* startup still in progress */
  }
  await delay(1000);
}
assert.equal(ready, true, "Frontend must become ready after restart");
assert.equal(
  execFileSync(
    "docker",
    ["exec", container, "dfx", "canister", "id", "backend"],
    { encoding: "utf8" },
  ).trim(),
  id,
);
assert.equal(
  (await (await connect()).getTasksForDate(date)).some(
    (task) => task.title === title,
  ),
  true,
);
emailResult = await emailRequest("session", { publicKey });
assert.equal(signer(emailResult).getPrincipal().toText(), emailPrincipal);
emailResult = await emailRequest("login", { email, password, publicKey });
const restored = signer(emailResult);
assert.equal(restored.getPrincipal().toText(), emailPrincipal);
assert.equal(
  (await (await connect(restored)).getTasksForDate(date)).some(
    (task) => task.title === "Email Docker persistence",
  ),
  true,
);
console.log(
  "PASS: Docker frontend readiness, unchanged backend ID and signed user data, email account/password and cookie session preserved across container restart",
);
