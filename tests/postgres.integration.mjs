import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import {
  Ed25519KeyIdentity,
  DelegationChain,
  DelegationIdentity,
} from "@icp-sdk/core/identity";
import { Principal } from "@icp-sdk/core/principal";
import sharp from "sharp";
import { encode, decode } from "../server/wire.mjs";
const base = process.env.NLOCKI_BASE_URL || "http://127.0.0.1:5173";
const suffix = Date.now().toString(36);
async function account(tag) {
  const key = Ed25519KeyIdentity.generate();
  const password = `Test-${suffix}-private!`,
    email = `pg-${tag}-${suffix}@example.test`;
  const r = await fetch(base + "/api/auth/signup", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password,
      publicKey: Buffer.from(key.getPublicKey().toDer()).toString("hex"),
    }),
  });
  const body = await r.json();
  assert.equal(r.status, 200, JSON.stringify(body));
  assert.ok(
    body.delegation,
    "Use optional-verification LOCAL stack for this test",
  );
  const identity = DelegationIdentity.fromDelegation(
    key,
    DelegationChain.fromJSON(JSON.stringify(body.delegation)),
  );
  return {
    cookie: r.headers.get("set-cookie").split(";")[0],
    id: identity.getPrincipal().toText(),
    password,
    email,
  };
}
function packet(user, method, args = [], key) {
  const p = {
    method,
    args: encode(args),
    key: key ? key.getPrincipal().toText() : user.id,
    time: Date.now(),
    nonce: randomBytes(16).toString("hex"),
  };
  return key
    ? key
        .sign(new TextEncoder().encode(JSON.stringify(p)))
        .then((signature) => ({
          ...p,
          publicKey: Buffer.from(key.getPublicKey().toDer()).toString("hex"),
          signature: Buffer.from(signature).toString("hex"),
        }))
    : Promise.resolve(p);
}
async function request(user, path, p, origin = base) {
  const r = await fetch(base + path, {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      Cookie: user.cookie,
    },
    body: JSON.stringify(p),
  });
  return { status: r.status, body: await r.json() };
}
async function rpc(user, method, args = [], key, expected = 200) {
  const r = await request(
    user,
    "/api/rpc",
    await packet(user, method, args, key),
  );
  assert.equal(r.status, expected, `${method}: ${JSON.stringify(r.body)}`);
  return decode(r.body.result);
}
const a = await account("a"),
  b = await account("b");
try {
  const date = "2026-10-13";
  await rpc(a, "createOrGetProfile");
  await rpc(b, "createOrGetProfile");
  await rpc(a, "updateProfile", [
    ["alice_" + suffix],
    ["private bio"],
    ["Alice"],
    ["private@example.test"],
    ["+491234"],
    [false],
  ]);
  const profile = (await rpc(b, "getProfile", [a.id]))[0];
  assert.equal(profile.bio, "");
  assert.deepEqual(profile.email, []);
  assert.deepEqual(profile.phone, []);
  const task = await rpc(a, "addTask", [date, "Private task"]);
  assert.equal((await rpc(b, "getTasksForDate", [date])).length, 0);
  await rpc(b, "toggleTask", [task.id], undefined, 404);
  assert.equal(await rpc(b, "deleteTask", [task.id]), false);
  assert.equal((await rpc(a, "getTasksForDate", [date]))[0].completed, false);
  const meal = await rpc(a, "addMeal", [
    {
      date,
      mealName: "Apple",
      calories: 104n,
      protein: 1n,
      carbs: 28n,
      fat: 0n,
      details: [JSON.stringify({ mealType: "snack" })],
    },
  ]);
  assert.equal((await rpc(a, "getDailySummary", [date])).totalCalories, 104n);
  assert.equal((await rpc(b, "getMealsForDate", [date])).length, 0);
  assert.equal(
    (await rpc(a, "exportNutritionCSV", [date, date])).includes("Apple"),
    true,
  );
  await rpc(a, "addTask", ["2026-02-30", "invalid"], undefined, 400);
  const jpeg =
    "data:image/jpeg;base64," +
    (
      await sharp({
        create: { width: 16, height: 16, channels: 3, background: "#ff22aa" },
      })
        .jpeg()
        .toBuffer()
    ).toString("base64");
  const post = await rpc(a, "createPost", ["Private photo", [jpeg]]);
  const photo = post.photoUrl[0];
  assert.equal(
    (await fetch(base + photo, { headers: { Cookie: a.cookie } })).status,
    200,
  );
  assert.equal(
    (await fetch(base + photo, { headers: { Cookie: b.cookie } })).status,
    404,
  );
  assert.equal((await fetch(base + photo)).status, 401);
  assert.deepEqual(await rpc(b, "getUserPosts", [a.id]), []);
  await rpc(
    a,
    "createPost",
    ["Bad", ["https://169.254.169.254/private"]],
    undefined,
    400,
  );
  await rpc(a, "setHealthConsent", [false]);
  assert.deepEqual(await rpc(a, "getMealsForDate", [date]), []);
  await rpc(
    a,
    "addMeal",
    [
      {
        date,
        mealName: "Apple",
        calories: 104n,
        protein: 1n,
        carbs: 28n,
        fat: 0n,
        details: [],
      },
    ],
    undefined,
    403,
  );
  await rpc(a, "setHealthConsent", [true]);
  const exp = await request(
    a,
    "/api/account/export",
    await packet(a, "accountExport"),
  );
  assert.equal(exp.status, 200);
  assert.equal(exp.body.account.email, a.email);
  assert.ok(exp.body.documents.some((x) => x.kind === "task"));
  assert.equal(exp.body.media.length, 1);
  assert.ok(exp.body.media[0].base64);
  assert.equal(exp.body.media[0].contentType, "image/jpeg");
  assert.ok(!JSON.stringify(exp.body).includes("password"));
  assert.ok(!JSON.stringify(exp.body).includes(b.id));
  assert.equal(
    (
      await request(
        a,
        "/api/rpc",
        await packet(a, "getGoals"),
        "https://evil.example",
      )
    ).status,
    403,
  );
  // Recipient authorization and decline cooldown survive the SQL migration.
  const messageRequest = await rpc(a, "sendMessageRequest", [b.id, "Hello"]);
  await rpc(a, "sendMessageRequest", [b.id, "Duplicate"], undefined, 409);
  await rpc(a, "acceptMessageRequest", [messageRequest.id], undefined, 403);
  await rpc(b, "declineMessageRequest", [messageRequest.id]);
  await rpc(a, "sendMessageRequest", [b.id, "Too soon"], undefined, 403);
  await rpc(b, "acceptMessageRequest", [messageRequest.id]);
  const message = await rpc(a, "sendMessage", [b.id, "Private conversation"]);
  await rpc(a, "markMessageRead", [message.id], undefined, 403);
  await rpc(b, "markMessageRead", [message.id]);
  await rpc(b, "addReaction", [message.id, "👍"]);
  assert.equal(
    (await rpc(a, "getMessages", [b.id]))[0].reactions[0].userId,
    b.id,
  );
  await rpc(a, "updateProfile", [[], [], [], [], [], [true]]);
  assert.equal(
    (await fetch(base + photo, { headers: { Cookie: b.cookie } })).status,
    200,
  );
  const comment = await rpc(b, "createComment", [post.id, "Public comment"]);
  assert.equal((await rpc(a, "getComments", [post.id])).length, 1);
  await rpc(a, "updateProfile", [[], [], [], [], [], [false]]);
  await rpc(b, "getComments", [post.id], undefined, 404);
  assert.equal(
    (await fetch(base + photo, { headers: { Cookie: b.cookie } })).status,
    404,
  );
  // Signed second-factor keys: ownership, replay, revocation and primary bypass.
  const setup = await rpc(a, "beginSecondFactorSetup");
  const { totp } = await import("../server/api.mjs");
  const code = totp(setup.secret, Math.floor(Date.now() / 30000));
  const fresh = Ed25519KeyIdentity.generate();
  await rpc(a, "prepareSecondFactorSession", [], fresh);
  const confirmed = await rpc(a, "confirmSecondFactorSetup", [
    code,
    fresh.getPrincipal(),
  ]);
  assert.ok(confirmed.ok);
  assert.equal(confirmed.ok.length, 4);
  await rpc(a, "getTasksForDate", [date], undefined, 403);
  const signed = await packet(a, "getTasksForDate", [date], fresh);
  assert.equal((await request(a, "/api/rpc", signed)).status, 200);
  assert.equal((await request(a, "/api/rpc", signed)).status, 403);
  await rpc(b, "getTasksForDate", [date], fresh, 403);
  await rpc(a, "revokeSecondFactorSessions");
  await rpc(a, "getTasksForDate", [date], fresh, 403);
  const next = Ed25519KeyIdentity.generate();
  await rpc(a, "prepareSecondFactorSession", [], next);
  assert.ok(
    (await rpc(a, "verifySecondFactor", [confirmed.ok[0], next.getPrincipal()]))
      .ok === null,
  );
  const another = Ed25519KeyIdentity.generate();
  await rpc(a, "prepareSecondFactorSession", [], another);
  assert.ok(
    (
      await rpc(a, "verifySecondFactor", [
        confirmed.ok[0],
        another.getPrincipal(),
      ])
    ).error,
  );
  assert.ok(
    (await rpc(a, "disableSecondFactor", [confirmed.ok[1]])).ok === null,
  );
  const wrong = await request(
    a,
    "/api/account/delete",
    await packet(a, "accountDelete", ["wrong-password"]),
  );
  assert.equal(wrong.status, 401);
  const deleted = await request(
    a,
    "/api/account/delete",
    await packet(a, "accountDelete", [a.password]),
  );
  assert.equal(deleted.status, 200, JSON.stringify(deleted.body));
  assert.equal(deleted.body.deleted, true);
  assert.equal(
    (await fetch(base + photo, { headers: { Cookie: a.cookie } })).status,
    401,
  );
  await rpc(a, "getGoals", [], undefined, 401);
  assert.deepEqual(await rpc(b, "getProfile", [a.id]), []);
  console.log(
    "PASS: PostgreSQL owner isolation, private profiles/photos, rejected remote uploads, calories/export, consent withdrawal, CSRF, TOTP enforcement/replay/recovery/revocation, account erasure",
  );
} finally {
  for (const user of [a, b]) {
    try {
      await request(
        user,
        "/api/account/delete",
        await packet(user, "accountDelete", [user.password]),
      );
    } catch {}
  }
}
