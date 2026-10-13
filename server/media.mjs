import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  unlinkSync,
  readdirSync,
  statSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
export function createMedia(pool, { sessionUser, local, rate }) {
  const root = resolve(process.env.MEDIA_ROOT || ".local-media");
  mkdirSync(root, { recursive: true, mode: 0o700 });
  const valid = (id) =>
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id);
  async function store(owner, input, c) {
    if (
      typeof input !== "string" ||
      !input.startsWith("data:image/jpeg;base64,") ||
      input.length > 700000
    )
      throw Object.assign(
        new Error(
          "Upload a JPEG image under 512 KB; external URLs are not stored.",
        ),
        { status: 400 },
      );
    const raw = Buffer.from(input.slice(23), "base64");
    if (raw.length > 524288 || raw[0] !== 255 || raw[1] !== 216)
      throw Object.assign(new Error("Invalid JPEG"), { status: 400 });
    const quota = Number(
      (
        await c.query(
          "SELECT coalesce(sum(size),0) total FROM media WHERE owner_id=$1",
          [owner],
        )
      ).rows[0].total,
    );
    if (quota + raw.length > 50 * 1024 * 1024)
      throw Object.assign(new Error("Photo storage quota exceeded."), {
        status: 413,
      });
    const image = await sharp(raw, { limitInputPixels: 16_000_000 })
      .rotate()
      .resize({
        width: 512,
        height: 512,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82 })
      .toBuffer();
    const id = randomUUID();
    writeFileSync(join(root, `${id}.jpg`), image, { mode: 0o600, flag: "wx" });
    await c.query("INSERT INTO media VALUES($1,$2,$3,$4)", [
      id,
      owner,
      image.length,
      Date.now(),
    ]);
    return `/api/media/${id}`;
  }
  async function serve(req, res, path) {
    if (req.method !== "GET")
      throw Object.assign(new Error("Not found"), { status: 404 });
    const id = path.slice("/api/media/".length);
    if (!valid(id))
      throw Object.assign(new Error("Not found"), { status: 404 });
    const user = await sessionUser(req);
    if (!user)
      throw Object.assign(new Error("Please sign in"), { status: 401 });
    const factor = (
      await pool.query("SELECT secret FROM factors WHERE user_id=$1", [user.id])
    ).rows[0];
    if (factor?.secret && Number(user.mfa_until) < Date.now())
      throw Object.assign(new Error("Second factor required"), { status: 403 });
    await rate(`media:${user.id}`, 300, 60000);
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      await c.query("SELECT set_config('app.user_id',$1,true)", [user.id]);
      const entry = (await c.query("SELECT * FROM media WHERE id=$1", [id]))
        .rows[0];
      if (!entry) throw Object.assign(new Error("Not found"), { status: 404 });
      let allowed = entry.owner_id === user.id;
      if (!allowed) {
        const rows = (
          await c.query(
            "SELECT kind,data FROM documents WHERE owner_id=$1 AND shared=true AND kind IN('profile','post','story')",
            [entry.owner_id],
          )
        ).rows;
        allowed = rows.some(
          (r) =>
            (r.kind !== "profile" || r.data.isPublic) &&
            JSON.stringify(r.data).includes(`/api/media/${id}`) &&
            (r.kind !== "story" ||
              Number(r.data.timestamp.$bigint) >
                Date.now() * 1000000 - 86400000000000),
        );
      }
      await c.query("COMMIT");
      if (!allowed)
        throw Object.assign(new Error("Not found"), { status: 404 });
      const data = readFileSync(join(root, `${id}.jpg`));
      res.writeHead(200, {
        "Content-Type": "image/jpeg",
        "Content-Length": data.length,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
      });
      res.end(data);
    } catch (error) {
      await c.query("ROLLBACK");
      throw error;
    } finally {
      c.release();
    }
  }
  async function cleanup() {
    const queued = (await pool.query("SELECT id FROM media_gc LIMIT 1000"))
      .rows;
    for (const { id } of queued) {
      if (valid(id)) {
        try {
          unlinkSync(join(root, `${id}.jpg`));
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
      }
      await pool.query("DELETE FROM media_gc WHERE id=$1", [id]);
    }
    // Reconcile rollback/orphaned files only after a grace period, never while an upload transaction is active.
    for (const name of readdirSync(root)) {
      if (
        !/^[a-f0-9-]+\.jpg$/.test(name) ||
        Date.now() - statSync(join(root, name)).mtimeMs < 86400000
      )
        continue;
      const id = name.slice(0, -4);
      if (
        valid(id) &&
        !(await pool.query("SELECT 1 FROM media WHERE id=$1", [id])).rowCount
      )
        unlinkSync(join(root, name));
    }
  }
  async function exportImages(images) {
    return images.map(({ id, size, created }) => ({
      id,
      size,
      created,
      contentType: "image/jpeg",
      base64: readFileSync(join(root, `${id}.jpg`)).toString("base64"),
    }));
  }
  return { store, serve, cleanup, exportImages };
}
