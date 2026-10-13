// Run only against an isolated restored database with API/tunnel stopped.
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import { resolve } from "node:path";
import { pool } from "../server/db.mjs";
import { createMedia } from "../server/media.mjs";
const apply = process.argv.includes("--apply");
if (apply && process.env.RESTORE_ISOLATED !== "true")
  throw Error(
    "Stop the API/tunnel and confirm RESTORE_ISOLATED=true before applying. Default is a dry run.",
  );
const master = readFileSync(
  resolve(process.env.AUTH_DATA_DIR || ".local-auth", "encryption.key"),
);
if (master.length !== 32)
  throw Error("Restore the original 32-byte authentication encryption key.");
const ledger = JSON.parse(
  readFileSync(process.env.DELETION_LEDGER_FILE, "utf8"),
);
if (
  !Array.isArray(ledger) ||
  ledger.some((x) => !x || !/^[a-f0-9]{64}$/.test(x.account_hash))
)
  throw Error("Expected a JSON array of keyed account_hash deletion records.");
const hashes = new Set(ledger.map((x) => x.account_hash));
try {
  const users = (await pool.query("SELECT id FROM users")).rows;
  let matched = 0;
  for (const { id } of users) {
    const accountHash = createHmac("sha256", master).update(id).digest("hex");
    if (!hashes.has(accountHash)) continue;
    matched++;
    if (!apply) continue;
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      await c.query("SELECT set_config('app.user_id',$1,true)", [id]);
      await c.query(
        "INSERT INTO media_gc(id) SELECT id FROM media WHERE owner_id=$1 ON CONFLICT DO NOTHING",
        [id],
      );
      await c.query(
        "DELETE FROM documents WHERE kind IN('message','request') AND data->>'recipientId'=$1",
        [id],
      );
      await c.query("DELETE FROM users WHERE id=$1", [id]);
      await c.query(
        "INSERT INTO deletion_tombstones(account_hash) VALUES($1) ON CONFLICT DO NOTHING",
        [accountHash],
      );
      await c.query("COMMIT");
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
  if (apply) {
    for (const accountHash of hashes)
      await pool.query(
        "INSERT INTO deletion_tombstones(account_hash) VALUES($1) ON CONFLICT DO NOTHING",
        [accountHash],
      );
    await createMedia(pool, {}).cleanup();
  }
  console.log(
    `${apply ? "Applied" : "Dry run"}: ${matched} restored accounts match the independent deletion ledger. No account IDs printed.`,
  );
} finally {
  await pool.end();
}
