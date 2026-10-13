// Run against a separate, disposable database with NO application/tunnel connected.
import assert from "node:assert/strict";
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes, randomUUID, createHmac } from "node:crypto";
import { spawnSync } from "node:child_process";
import { pool } from "../server/db.mjs";
if (process.env.RESTORE_TEST_DATABASE !== "true")
  throw Error(
    "Use an isolated test database and explicitly set RESTORE_TEST_DATABASE=true.",
  );
const dir = mkdtempSync(join(tmpdir(), "nlocki-restore-")),
  master = randomBytes(32),
  suffix = randomUUID(),
  id = "deleted-" + suffix,
  keep = "keep-" + suffix,
  photo = randomUUID();
writeFileSync(join(dir, "encryption.key"), master, { mode: 0o600 });
writeFileSync(join(dir, photo + ".jpg"), "test photo bytes", { mode: 0o600 });
const accountHash = createHmac("sha256", master).update(id).digest("hex");
writeFileSync(
  join(dir, "ledger.json"),
  JSON.stringify([{ account_hash: accountHash }]),
  { mode: 0o600 },
);
try {
  for (const who of [id, keep])
    await pool.query(
      "INSERT INTO users(id,email,salt,password,identity,verified) VALUES($1,$2,$3,$4,$5,1)",
      [who, who + "@example.test", "fixture", "fixture", "fixture"],
    );
  await pool.query("INSERT INTO media VALUES($1,$2,$3,$4)", [
    photo,
    id,
    16,
    Date.now(),
  ]);
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT set_config('app.user_id',$1,true)", [keep]);
    await c.query(
      "INSERT INTO documents(owner_id,kind,data) VALUES($1,'message',$2)",
      [keep, JSON.stringify({ recipientId: id, text: "Restored message" })],
    );
    await c.query("COMMIT");
  } finally {
    c.release();
  }
  const run = (apply) =>
    spawnSync(
      process.execPath,
      ["scripts/reconcile-deletions.mjs", ...(apply ? ["--apply"] : [])],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          AUTH_DATA_DIR: dir,
          MEDIA_ROOT: dir,
          DELETION_LEDGER_FILE: join(dir, "ledger.json"),
          RESTORE_ISOLATED: "true",
        },
        encoding: "utf8",
      },
    );
  const dry = run(false);
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, /Dry run: 1/);
  assert.equal(
    (await pool.query("SELECT id FROM users WHERE id=$1", [id])).rowCount,
    1,
  );
  assert.ok(existsSync(join(dir, photo + ".jpg")));
  const applied = run(true);
  assert.equal(applied.status, 0, applied.stderr);
  assert.match(applied.stdout, /Applied: 1/);
  assert.equal(
    (await pool.query("SELECT id FROM users WHERE id=$1", [id])).rowCount,
    0,
  );
  assert.equal(
    (await pool.query("SELECT id FROM users WHERE id=$1", [keep])).rowCount,
    1,
  );
  assert.ok(!existsSync(join(dir, photo + ".jpg")));
  assert.equal(
    (
      await pool.query(
        "SELECT 1 FROM deletion_tombstones WHERE account_hash=$1",
        [accountHash],
      )
    ).rowCount,
    1,
  );
  const check = await pool.connect();
  try {
    await check.query("BEGIN");
    await check.query("SELECT set_config('app.user_id',$1,true)", [keep]);
    assert.equal(
      (await check.query("SELECT 1 FROM documents WHERE owner_id=$1", [keep]))
        .rowCount,
      0,
    );
    await check.query("COMMIT");
  } finally {
    check.release();
  }
  console.log(
    "PASS: isolated restore reconciliation dry run, matching account deletion, incoming message/photo removal, unaffected account preservation and retained ledger",
  );
} finally {
  await pool.query("DELETE FROM users WHERE id=ANY($1::text[])", [[id, keep]]);
  await pool.query("DELETE FROM deletion_tombstones WHERE account_hash=$1", [
    accountHash,
  ]);
  await pool.end();
  rmSync(dir, { recursive: true, force: true });
}
