import {
  randomBytes,
  randomUUID,
  createHmac,
  createPublicKey,
  verify,
  timingSafeEqual,
} from "node:crypto";
import { Principal } from "@icp-sdk/core/principal";
import { encode, decode } from "./wire.mjs";
import { createMedia } from "./media.mjs";
import { foods } from "./foods.mjs";
const now = () => BigInt(Date.now()) * 1_000_000n;
const err = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
const text = (v, min = 0, max = 500) => {
  if (typeof v !== "string" || v.trim().length < min || v.length > max)
    err(400, "Invalid text length.");
  return v;
};
const number = (v, min = 0, max = 10000) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) err(400, "Invalid number.");
  return n;
};
const date = (v) => {
  if (
    typeof v !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
    v < "1900-01-01" ||
    v > "2200-12-31" ||
    Number.isNaN(Date.parse(v)) ||
    new Date(v).toISOString().slice(0, 10) !== v
  )
    err(400, "Invalid date.");
  return v;
};
const option = (v) =>
  Array.isArray(v) && v.length <= 1 ? v : err(400, "Invalid optional value.");
const b32 = (bytes) => {
  let n = 0,
    b = 0,
    out = "";
  for (const byte of bytes) {
    n = n * 256 + byte;
    b += 8;
    while (b >= 5) {
      b -= 5;
      out += "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"[(n >> b) & 31];
      n %= 2 ** b;
    }
  }
  if (b) out += "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"[(n << (5 - b)) & 31];
  return out;
};
const from32 = (s) => {
  let n = 0,
    b = 0,
    out = [];
  for (const c of s) {
    const v = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".indexOf(c);
    if (v < 0) err(400, "Invalid key");
    n = n * 32 + v;
    b += 5;
    if (b >= 8) {
      b -= 8;
      out.push((n >> b) & 255);
      n %= 2 ** b;
    }
  }
  return Buffer.from(out);
};
export function totp(secret, counter) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const d = createHmac("sha256", from32(secret)).update(msg).digest(),
    o = d[31] & 15;
  return String((d.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}
const jsonData = (v) => JSON.stringify(encode(v));
const rowView = (r) => ({ ...decode(r.data), id: BigInt(r.id) });
export function createApi(ctx) {
  const {
    pool,
    master,
    encrypt,
    decrypt,
    sessionUser,
    hash,
    rate,
    passwordHash,
    local,
  } = ctx;
  const media = createMedia(pool, ctx);
  async function signed(packet, user) {
    if (packet.key === user.id) return true;
    if (
      typeof packet.publicKey !== "string" ||
      !/^[a-f0-9]{88}$/i.test(packet.publicKey) ||
      typeof packet.signature !== "string" ||
      !/^[a-f0-9]{128}$/i.test(packet.signature)
    )
      err(403, "Session proof required.");
    const der = Buffer.from(packet.publicKey, "hex");
    if (Principal.selfAuthenticating(der).toText() !== packet.key)
      err(403, "Invalid session key.");
    if (
      !Number.isFinite(packet.time) ||
      Math.abs(Date.now() - packet.time) > 120000 ||
      !/^[a-f0-9]{32}$/.test(packet.nonce || "")
    )
      err(403, "Expired session proof.");
    const content = JSON.stringify({
      method: packet.method,
      args: packet.args,
      key: packet.key,
      time: packet.time,
      nonce: packet.nonce,
    });
    if (
      !verify(
        null,
        Buffer.from(content),
        createPublicKey({ key: der, format: "der", type: "spki" }),
        Buffer.from(packet.signature, "hex"),
      )
    )
      err(403, "Invalid session proof.");
    await pool.query("DELETE FROM nonces WHERE expires<$1", [Date.now()]);
    const used = await pool.query(
      "INSERT INTO nonces VALUES($1,$2) ON CONFLICT DO NOTHING",
      [`${packet.key}:${packet.nonce}`, Date.now() + 180000],
    );
    if (!used.rowCount) err(403, "Session proof already used.");
    return false;
  }
  async function perform(req, packet) {
    const user = await sessionUser(req);
    if (!user) err(401, "Please sign in.");
    await rate(`api:${user.id}`, 600, 60000);
    const primary = await signed(packet, user),
      args = decode(packet.args);
    if (!Array.isArray(args) || args.length > 8) err(400, "Invalid arguments.");
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      await c.query("SELECT set_config('app.user_id',$1,true)", [user.id]);
      await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
        user.id,
      ]);
      const q = async (sql, params = []) => c.query(sql, params),
        own = async (kind) =>
          (
            await q(
              "SELECT * FROM documents WHERE owner_id=$1 AND kind=$2 ORDER BY id DESC",
              [user.id, kind],
            )
          ).rows;
      const first = async (kind) => (await own(kind))[0];
      const save = async (
        kind,
        data,
        id = null,
        shared = false,
        parent = null,
      ) => {
        if (id) {
          await q("UPDATE documents SET data=$1 WHERE id=$2 AND owner_id=$3", [
            jsonData(data),
            id,
            user.id,
          ]);
          return { ...data, id: BigInt(id) };
        }
        const r = (
          await q(
            "INSERT INTO documents(owner_id,kind,data,shared,parent_id) VALUES($1,$2,$3,$4,$5) RETURNING id",
            [user.id, kind, jsonData(data), shared, parent],
          )
        ).rows[0];
        return { ...data, id: BigInt(r.id) };
      };
      const single = async (kind, data) =>
        save(kind, data, (await first(kind))?.id, kind === "profile");
      const remove = async (kind, id) =>
        (
          await q(
            "DELETE FROM documents WHERE id=$1 AND kind=$2 AND owner_id=$3",
            [String(id), kind, user.id],
          )
        ).rowCount > 0;
      const find = async (kind, id) => {
        const r = (
          await q("SELECT * FROM documents WHERE id=$1 AND kind=$2", [
            String(id),
            kind,
          ])
        ).rows[0];
        if (!r) err(404, "Item not found or private.");
        return r;
      };
      const factor = (
        await q("SELECT * FROM factors WHERE user_id=$1 FOR UPDATE", [user.id])
      ).rows[0];
      const security = new Set([
        "getSecondFactorStatus",
        "beginSecondFactorSetup",
        "confirmSecondFactorSetup",
        "verifySecondFactor",
        "disableSecondFactor",
        "revokeSecondFactorSessions",
        "prepareSecondFactorSession",
      ]);
      if (!security.has(packet.method)) {
        if (primary && factor?.secret) err(403, "Second factor required.");
        if (!primary) {
          const key = (
            await q(
              "SELECT * FROM factor_keys WHERE key=$1 AND owner_id=$2 AND registered=false AND expires>$3",
              [packet.key, user.id, Date.now()],
            )
          ).rows[0];
          if (!key) err(403, "Second-factor session expired.");
        }
      } else if (packet.method !== "prepareSecondFactorSession" && !primary)
        err(403, "Use your primary sign-in for security settings.");
      const health = (
        await q(
          "SELECT health_consent FROM agreements WHERE user_id=$1 ORDER BY accepted DESC LIMIT 1",
          [user.id],
        )
      ).rows[0]?.health_consent;
      const healthWrites = new Set([
        "addMeal",
        "addWorkout",
        "updateWorkout",
        "logWater",
        "saveGoals",
        "saveWeeklySchedule",
        "updateScheduleEntry",
      ]);
      if (!health && healthWrites.has(packet.method))
        err(
          403,
          "Enable optional fitness/nutrition consent in Account privacy first.",
        );
      const profileRow = async (id = user.id) =>
        (
          await q(
            "SELECT * FROM documents WHERE owner_id=$1 AND kind='profile'",
            [id],
          )
        ).rows[0];
      const profileView = async (r) => {
        if (!r) return null;
        const p = decode(r.data),
          id = r.owner_id,
          owner = id === user.id,
          visible = owner || p.isPublic;
        const counts = (
          await q(
            "SELECT (SELECT count(*) FROM follows WHERE from_id=$1) following,(SELECT count(*) FROM follows WHERE to_id=$1) followers",
            [id],
          )
        ).rows[0];
        return {
          userId: id,
          username: p.username,
          bio: visible ? p.bio : "",
          displayName: visible ? p.displayName : [],
          avatarUrl: visible ? p.avatarUrl : [],
          email: owner ? p.email : [],
          phone: owner ? p.phone : [],
          isPublic: p.isPublic,
          followingCount: BigInt(counts.following),
          followersCount: BigInt(counts.followers),
        };
      };
      const getProfile = async () => {
        let p = await profileRow();
        if (!p) {
          await single("profile", {
            username: user.id,
            bio: "",
            displayName: [],
            avatarUrl: [],
            email: [],
            phone: [],
            isPublic: false,
          });
          p = await profileRow();
        }
        return profileView(p);
      };
      const visiblePost = async (id) => {
        const r = await find("post", id);
        if (
          r.owner_id !== user.id &&
          !decode((await profileRow(r.owner_id)).data).isPublic
        )
          err(404, "Post not found or private.");
        return r;
      };
      const postView = async (r) => {
        const counts = (
          await q(
            "SELECT (SELECT count(*) FROM likes WHERE post_id=$1) likes,(SELECT count(*) FROM documents WHERE kind='comment' AND parent_id=$1) comments",
            [r.id],
          )
        ).rows[0];
        return {
          ...rowView(r),
          likeCount: BigInt(counts.likes),
          commentCount: BigInt(counts.comments),
        };
      };
      const profileName = async () => (await getProfile()).username;
      const input = async (kind, v) => {
        if (!v || typeof v !== "object") err(400, "Invalid input");
        date(v.date);
        text(kind === "workout" ? v.exerciseName : v.mealName, 1, 120);
        for (const field of kind === "workout"
          ? ["sets", "reps"]
          : ["calories", "protein", "carbs", "fat"])
          number(
            v[field],
            kind === "workout" ? 1 : 0,
            kind === "workout" ? 10000 : 100000,
          );
        option(v.details);
        if (v.details[0]) {
          text(v.details[0], 0, 4000);
          const meta = JSON.parse(v.details[0]);
          if (kind === "workout") {
            if (meta.durationMin != null) number(meta.durationMin, 0, 600);
            if (meta.bodyWeightKg != null) number(meta.bodyWeightKg, 20, 400);
            if (meta.exerciseMet != null) number(meta.exerciseMet, 1, 20);
            if (meta.caloriesBurned != null)
              number(meta.caloriesBurned, 0, 100000);
          } else if (
            !["breakfast", "lunch", "dinner", "snack"].includes(meta.mealType)
          )
            err(400, "Invalid meal type");
        }
        if (kind === "workout") {
          option(v.weight);
          if (v.weight.length) number(v.weight[0], 0, 5000);
        }
        return { ...v, timestamp: now() };
      };
      const matchCode = (code) => {
        if (!factor?.secret) return null;
        const current = Math.floor(Date.now() / 30000),
          secret = decrypt(factor.secret);
        for (const counter of [current, current - 1, current + 1])
          if (
            counter > Number(factor.used ?? -1) &&
            totp(secret, counter) === code
          )
            return counter;
        return null;
      };
      const recoveryHash = (code) =>
        createHmac("sha256", master).update(`recovery:${code}`).digest("hex");
      const checkCode = async (code) => {
        if (!factor?.secret)
          return { error: "Two-factor authentication is not enabled." };
        if (Number(factor.locked_until) > Date.now())
          return { error: "Too many attempts. Wait five minutes." };
        const counter = matchCode(code),
          recovery = factor.recovery.includes(recoveryHash(code));
        if (counter === null && !recovery) {
          const n =
            (Number(factor.locked_until) &&
            Number(factor.locked_until) <= Date.now()
              ? 0
              : Number(factor.attempts)) + 1;
          await q(
            "UPDATE factors SET attempts=$1,locked_until=$2 WHERE user_id=$3",
            [n, n >= 5 ? Date.now() + 300000 : 0, user.id],
          );
          return { error: "Invalid or already used code" };
        }
        await q(
          "UPDATE factors SET used=$1,recovery=$2,attempts=0,locked_until=0 WHERE user_id=$3",
          [
            counter ?? factor.used,
            JSON.stringify(
              factor.recovery.filter((v) => v !== recoveryHash(code)),
            ),
            user.id,
          ],
        );
        return { ok: null };
      };
      const authorizeKey = async (key) => {
        text(key, 1, 100);
        const r = (
          await q(
            "SELECT * FROM factor_keys WHERE key=$1 AND owner_id=$2 AND registered=true AND expires>$3",
            [key, user.id, Date.now()],
          )
        ).rows[0];
        if (!r) err(403, "Register a fresh session key first.");
        await q(
          "UPDATE factor_keys SET expires=0 WHERE owner_id=$1 AND registered=false",
          [user.id],
        );
        await q(
          "UPDATE factor_keys SET registered=false,expires=$1 WHERE key=$2",
          [Date.now() + 1800000, key],
        );
        await q("UPDATE sessions SET mfa_until=$1 WHERE token=$2", [
          Date.now() + 1800000,
          user.session_token,
        ]);
      };
      let result;
      const [a, b, d, e, f, g] = args;
      switch (packet.method) {
        case "prepareSecondFactorSession":
          if (primary) err(403, "Use a fresh key.");
          if (
            (await q("SELECT id FROM users WHERE id=$1", [packet.key])).rowCount
          )
            err(403, "Use a fresh key.");
          if (
            (await q("SELECT key FROM factor_keys WHERE key=$1", [packet.key]))
              .rowCount
          )
            err(403, "Session key already used.");
          await q(
            "DELETE FROM factor_keys WHERE registered=true AND expires<$1",
            [Date.now()],
          );
          await q("INSERT INTO factor_keys VALUES($1,$2,$3,true)", [
            packet.key,
            user.id,
            Date.now() + 600000,
          ]);
          break;
        case "getSecondFactorStatus":
          result = { enabled: !!factor?.secret };
          break;
        case "beginSecondFactorSetup":
          if (factor?.secret) err(400, "Two-factor already enabled");
          {
            const secret = b32(randomBytes(32));
            await q(
              "INSERT INTO factors(user_id,pending,pending_expires) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET pending=excluded.pending,pending_expires=excluded.pending_expires",
              [user.id, encrypt(secret), Date.now() + 600000],
            );
            result = { secret };
          }
          break;
        case "confirmSecondFactorSetup":
          if (
            !factor?.pending ||
            factor.secret ||
            Number(factor.pending_expires) < Date.now()
          ) {
            result = { error: "Setup expired. Start again." };
            break;
          }
          if (Number(factor.locked_until) > Date.now()) {
            result = { error: "Too many attempts. Wait five minutes." };
            break;
          }
          {
            const secret = decrypt(factor.pending),
              counter = Math.floor(Date.now() / 30000);
            const matched = [counter, counter - 1, counter + 1].find(
              (n) => totp(secret, n) === a,
            );
            if (matched === undefined) {
              const tries =
                (Number(factor.locked_until) &&
                Number(factor.locked_until) <= Date.now()
                  ? 0
                  : Number(factor.attempts)) + 1;
              await q(
                "UPDATE factors SET attempts=$1,locked_until=$2 WHERE user_id=$3",
                [tries, tries >= 5 ? Date.now() + 300000 : 0, user.id],
              );
              result = { error: "Invalid authenticator code" };
              break;
            }
            await authorizeKey(b);
            const codes = Array.from({ length: 4 }, () => b32(randomBytes(16)));
            await q(
              "UPDATE factors SET secret=pending,pending=null,pending_expires=null,used=$1,recovery=$2,attempts=0,locked_until=0 WHERE user_id=$3",
              [matched, JSON.stringify(codes.map(recoveryHash)), user.id],
            );
            result = { ok: codes };
          }
          break;
        case "verifySecondFactor":
          result = await checkCode(a);
          if ("ok" in result) await authorizeKey(b);
          break;
        case "disableSecondFactor":
          result = await checkCode(a);
          if ("ok" in result) {
            await q("DELETE FROM factors WHERE user_id=$1", [user.id]);
            await q("UPDATE factor_keys SET expires=0 WHERE owner_id=$1", [
              user.id,
            ]);
            await q("UPDATE sessions SET mfa_until=0 WHERE user_id=$1", [
              user.id,
            ]);
          }
          break;
        case "revokeSecondFactorSessions":
          await q("UPDATE factor_keys SET expires=0 WHERE owner_id=$1", [
            user.id,
          ]);
          await q("UPDATE sessions SET mfa_until=0 WHERE user_id=$1", [
            user.id,
          ]);
          break;
        case "getTaskRoutine":
          date(a);
          result = (await own("routine"))
            .filter(
              (r) =>
                r.data.startDate <= a &&
                (!r.data.endDate || a < r.data.endDate),
            )
            .map(rowView)
            .reverse();
          break;
        case "addTaskRoutine":
          date(a);
          if (
            (await own("routine")).filter((r) => !r.data.endDate).length >= 100
          )
            err(400, "Maximum 100 daily routine items");
          result = await save("routine", {
            title: text(b.trim(), 1, 200),
            startDate: a,
          });
          break;
        case "deleteTaskRoutine": {
          date(b);
          const r = await find("routine", a);
          if (r.owner_id !== user.id) err(404, "Routine not found");
          await save("routine", { ...decode(r.data), endDate: b }, r.id);
          await q(
            "DELETE FROM documents WHERE owner_id=$1 AND kind='task' AND data->>'routineId'=$2 AND data->>'date'>=$3",
            [user.id, String(a), b],
          );
          break;
        }
        case "deleteScheduleEntry": {
          text(a, 1, 100);
          const entries = decode(
            (await first("schedule"))?.data ?? { entries: [] },
          ).entries;
          await single("schedule", {
            entries: entries.filter((v) => v.id[0] !== a),
          });
          break;
        }
        case "getPreviousWorkoutWeights": {
          date(a);
          const rows = (await own("workout"))
            .filter((r) => r.data.date < a)
            .sort(
              (x, y) =>
                y.data.date.localeCompare(x.data.date) ||
                Number(BigInt(y.id) - BigInt(x.id)),
            );
          const seen = new Set();
          result = rows.flatMap((r) => {
            const w = rowView(r);
            if (seen.has(w.exerciseName)) return [];
            seen.add(w.exerciseName);
            return [
              {
                name: w.exerciseName,
                weightKg: w.weight[0] ?? 0,
                date: w.date,
              },
            ];
          });
          break;
        }
        case "getTasksForDate":
          date(a);
          const routineTasks = new Set(
            (await own("task"))
              .filter((t) => t.data.date === a)
              .map((t) => t.data.routineId),
          );
          for (const r of (await own("routine")).filter(
            (r) =>
              r.data.startDate <= a && (!r.data.endDate || a < r.data.endDate),
          )) {
            if (!routineTasks.has(r.id))
              await save("task", {
                date: a,
                title: r.data.title,
                completed: false,
                routineId: r.id,
              });
          }
          result = (await own("task"))
            .filter((r) => r.data.date === a)
            .map(rowView);
          break;
        case "addTask":
          result = await save("task", {
            date: date(a),
            title: text(b.trim(), 1, 200),
            completed: false,
          });
          break;
        case "toggleTask":
          {
            const r = await find("task", a);
            if (r.owner_id !== user.id) err(404, "Task not found");
            await save(
              "task",
              { ...decode(r.data), completed: !r.data.completed },
              r.id,
            );
            result = true;
          }
          break;
        case "deleteTask":
          result = await remove("task", a);
          break;
        case "addWorkout":
          result = await save("workout", await input("workout", a));
          break;
        case "updateWorkout":
          {
            const r = await find("workout", a);
            if (r.owner_id !== user.id) err(404, "Workout not found");
            result = [await save("workout", await input("workout", b), r.id)];
          }
          break;
        case "deleteWorkout":
          result = await remove("workout", a);
          break;
        case "addMeal":
          result = await save("meal", await input("meal", a));
          break;
        case "deleteMeal":
          result = await remove("meal", a);
          break;
        case "getWorkoutsForDate":
        case "getMealsForDate":
          date(a);
          result = (
            await own(packet.method === "getMealsForDate" ? "meal" : "workout")
          )
            .filter((r) => r.data.date === a)
            .map(rowView);
          break;
        case "getWorkoutsInRange":
        case "getMealsInRange":
          date(a);
          date(b);
          result = (
            await own(packet.method === "getMealsInRange" ? "meal" : "workout")
          )
            .filter((r) => r.data.date >= a && r.data.date <= b)
            .map(rowView);
          break;
        case "getWaterForDate":
          date(a);
          {
            const r = (await own("water")).find((r) => r.data.date === a);
            result = r ? decode(r.data) : { date: a, amount: 0n };
          }
          break;
        case "logWater":
          date(a);
          number(b, 1, 10000);
          {
            const r = (await own("water")).find((r) => r.data.date === a);
            result = await save(
              "water",
              { date: a, amount: BigInt(r ? decode(r.data).amount : 0) + b },
              r?.id,
            );
          }
          break;
        case "getGoals":
          result = decode(
            (await first("goals"))?.data ??
              encode({ dailyCalorieTarget: 2000n, weeklyMinWorkouts: 3n }),
          );
          break;
        case "saveGoals":
          number(a, 100, 10000);
          number(b, 1, 14);
          await single("goals", {
            dailyCalorieTarget: a,
            weeklyMinWorkouts: b,
          });
          break;
        case "getWeeklySchedule":
          result = decode(
            (await first("schedule"))?.data ?? { entries: [] },
          ).entries;
          break;
        case "saveWeeklySchedule":
          if (!Array.isArray(a) || a.length > 100) err(400, "Too many entries");
          for (const v of a) {
            number(v.dayOfWeek, 0, 6);
            number(v.sets, 1, 1000);
            number(v.reps, 1, 1000);
            text(v.exerciseName, 1, 120);
            option(v.weightKg);
            if (v.weightKg.length) number(v.weightKg[0], 0, 5000);
          }
          await single("schedule", { entries: a });
          break;
        case "updateScheduleEntry":
        case "clearScheduleDay":
          {
            const entries = decode(
              (await first("schedule"))?.data ?? { entries: [] },
            ).entries;
            if (packet.method === "clearScheduleDay") {
              number(a, 0, 6);
              await single("schedule", {
                entries: entries.filter((v) => v.dayOfWeek !== a),
              });
            } else {
              number(a.dayOfWeek, 0, 6);
              text(a.exerciseName, 1, 120);
              number(a.sets, 1, 1000);
              number(a.reps, 1, 1000);
              option(a.weightKg);
              if (a.weightKg.length) number(a.weightKg[0], 0, 5000);
              const i = entries.findIndex((v) => v.id[0] === a.id[0]);
              option(a.id);
              if (!a.id.length) err(400, "Schedule entry ID required");
              text(a.id[0], 1, 100);
              if (i < 0) {
                if (entries.length >= 100)
                  err(400, "Too many planned exercises");
                entries.push(a);
              } else entries[i] = a;
              await single("schedule", { entries });
              result = true;
            }
          }
          break;
        case "createOrGetProfile":
          result = await getProfile();
          break;
        case "getMyProfile":
          result = [await getProfile()];
          break;
        case "getProfile":
          {
            const p = await profileView(await profileRow(text(a, 1, 100)));
            result = p ? [p] : [];
          }
          break;
        case "getUserByUsername":
          {
            const r = (
              await q(
                "SELECT * FROM documents WHERE kind='profile' AND lower(data->>'username')=lower($1)",
                [text(a, 1, 24)],
              )
            ).rows[0];
            result = r ? [await profileView(r)] : [];
          }
          break;
        case "updateProfile":
          {
            const p = await getProfile();
            const opts = [a, b, d, e, f, g];
            opts.forEach(option);
            if (a.length && !/^[A-Za-z0-9_]{3,24}$/.test(a[0]))
              err(400, "Use 3–24 letters, numbers or underscores.");
            if (b.length) text(b[0], 0, 254);
            if (d.length) text(d[0], 0, 32);
            if (e.length) text(e[0], 0, 500);
            if (f.length) text(f[0], 0, 80);
            if (g.length && typeof g[0] !== "boolean")
              err(400, "Invalid visibility");
            const value = {
              username: a[0] ?? p.username,
              email: b.length ? b : p.email,
              phone: d.length ? d : p.phone,
              bio: e[0] ?? p.bio,
              displayName: f.length ? f : p.displayName,
              avatarUrl: p.avatarUrl,
              isPublic: g[0] ?? p.isPublic,
            };
            await single("profile", value);
            await q(
              "UPDATE documents SET shared=$1 WHERE owner_id=$2 AND kind IN('post','story')",
              [value.isPublic, user.id],
            );
            result = await getProfile();
          }
          break;
        case "updateProfilePhoto":
          {
            const url = await media.store(user.id, a, c);
            const p = await getProfile();
            await single("profile", { ...p, avatarUrl: [url] });
          }
          break;
        case "searchUsers":
          text(a, 1, 80);
          result = await Promise.all(
            (
              await q(
                "SELECT * FROM documents WHERE kind='profile' AND (data->>'username' ILIKE $1) LIMIT 30",
                [`%${a.replace(/[%_\\]/g, "\\$&")}%`],
              )
            ).rows.map(profileView),
          );
          break;
        case "getFollowing":
        case "getFollowers":
          text(a, 1, 100);
          {
            const outgoing = packet.method === "getFollowing";
            const rows = (
              await q(
                `SELECT ${outgoing ? "to_id" : "from_id"} id FROM follows WHERE ${outgoing ? "from_id" : "to_id"}=$1 LIMIT 200`,
                [a],
              )
            ).rows;
            result = (
              await Promise.all(
                rows.map(async (r) => profileView(await profileRow(r.id))),
              )
            ).filter(Boolean);
          }
          break;
        case "isFollowing":
          result =
            (
              await q("SELECT 1 FROM follows WHERE from_id=$1 AND to_id=$2", [
                user.id,
                text(a, 1, 100),
              ])
            ).rowCount > 0;
          break;
        case "followUser":
          text(a, 1, 100);
          if (a === user.id || !(await profileRow(a)))
            err(400, "Invalid profile");
          await q("INSERT INTO follows VALUES($1,$2) ON CONFLICT DO NOTHING", [
            user.id,
            a,
          ]);
          break;
        case "unfollowUser":
          await q("DELETE FROM follows WHERE from_id=$1 AND to_id=$2", [
            user.id,
            text(a, 1, 100),
          ]);
          break;
        case "createPost":
          option(b);
          result = await save(
            "post",
            {
              authorId: user.id,
              authorUsername: await profileName(),
              text: text(a.trim(), 0, 4000),
              photoUrl: b.length ? [await media.store(user.id, b[0], c)] : [],
              timestamp: now(),
              likeCount: 0n,
              commentCount: 0n,
            },
            null,
            (await getProfile()).isPublic,
          );
          if (!a.trim() && !b.length) err(400, "Add text or photo");
          break;
        case "getFeed":
          {
            const rows = (
              await q(
                "SELECT * FROM documents WHERE kind='post' AND (owner_id=$1 OR owner_id IN(SELECT to_id FROM follows WHERE from_id=$1)) ORDER BY id DESC LIMIT 50",
                [user.id],
              )
            ).rows;
            result = await Promise.all(rows.map(postView));
          }
          break;
        case "getUserPosts":
          text(a, 1, 100);
          {
            const p = await profileRow(a);
            result =
              p && (a === user.id || p.data.isPublic)
                ? await Promise.all(
                    (
                      await q(
                        "SELECT * FROM documents WHERE owner_id=$1 AND kind='post' ORDER BY id DESC LIMIT 100",
                        [a],
                      )
                    ).rows.map(postView),
                  )
                : [];
          }
          break;
        case "deletePost":
          await remove("post", a);
          break;
        case "likePost":
          await visiblePost(a);
          await q("INSERT INTO likes VALUES($1,$2) ON CONFLICT DO NOTHING", [
            user.id,
            String(a),
          ]);
          break;
        case "unlikePost":
          await q("DELETE FROM likes WHERE user_id=$1 AND post_id=$2", [
            user.id,
            String(a),
          ]);
          break;
        case "hasLiked":
          await visiblePost(a);
          result =
            (
              await q("SELECT 1 FROM likes WHERE user_id=$1 AND post_id=$2", [
                user.id,
                String(a),
              ])
            ).rowCount > 0;
          break;
        case "createComment":
          {
            const parent = await visiblePost(a);
            result = await save(
              "comment",
              {
                postId: a,
                authorId: user.id,
                authorUsername: await profileName(),
                text: text(b.trim(), 1, 2000),
                timestamp: now(),
              },
              null,
              parent.shared,
              parent.id,
            );
          }
          break;
        case "getComments":
          await visiblePost(a);
          result = (
            await q(
              "SELECT * FROM documents WHERE kind='comment' AND parent_id=$1 ORDER BY id LIMIT 200",
              [String(a)],
            )
          ).rows.map(rowView);
          break;
        case "deleteComment":
          await remove("comment", a);
          break;
        case "createStory":
          option(b);
          result = await save(
            "story",
            {
              authorId: user.id,
              authorUsername: await profileName(),
              photoUrl: await media.store(user.id, a, c),
              text: b,
              timestamp: now(),
            },
            null,
            (await getProfile()).isPublic,
          );
          break;
        case "deleteStory":
          await remove("story", a);
          break;
        case "getStories":
        case "getUserStories":
          {
            const rows = (
              await q(
                "SELECT * FROM documents WHERE kind='story' ORDER BY id DESC LIMIT 100",
              )
            ).rows;
            result = rows
              .filter(
                (r) =>
                  Number(decode(r.data).timestamp) >
                    Number(now()) - 86400000000000 &&
                  (packet.method === "getStories" || r.owner_id === a),
              )
              .map(rowView);
          }
          break;
        case "canMessageUser":
          result = await canMessage(a);
          break;
        case "sendMessage":
          text(a, 1, 100);
          if (!(await canMessage(a)))
            err(403, "Request approval before messaging");
          {
            const saved = await save("message", {
              senderId: user.id,
              recipientId: a,
              text: text(b.trim(), 1, 4000),
              timestamp: now(),
              isRead: false,
              reactions: [],
            });
            result = { ...saved, id: String(saved.id) };
          }
          break;
        case "getMessages":
          text(a, 1, 100);
          {
            const r = (
              await q(
                "SELECT * FROM documents WHERE kind='message' AND ((owner_id=$1 AND data->>'recipientId'=$2) OR(owner_id=$2 AND data->>'recipientId'=$1)) ORDER BY id LIMIT 500",
                [user.id, a],
              )
            ).rows;
            const archive = decode(
              (await first("hidden"))?.data ?? { times: {} },
            ).times;
            result = r
              .filter(
                (r) =>
                  Number(decode(r.data).timestamp) > Number(archive[a] ?? 0),
              )
              .map((r) => ({ ...rowView(r), id: String(r.id) }));
          }
          break;
        case "markMessageRead":
          {
            const r = await find("message", a);
            if (r.data.recipientId !== user.id)
              err(403, "Not your incoming message");
            await q(
              "UPDATE documents SET data=jsonb_set(data,'{isRead}','true') WHERE id=$1",
              [r.id],
            );
          }
          break;
        case "deleteConversation":
          text(a, 1, 100);
          {
            const times = decode(
              (await first("hidden"))?.data ?? { times: {} },
            ).times;
            times[a] = now();
            await single("hidden", { times });
          }
          break;
        case "getArchivedConversations":
          result = decode((await first("archives"))?.data ?? { ids: [] }).ids;
          break;
        case "toggleArchivedConversation":
          text(a, 1, 100);
          {
            const ids = decode(
              (await first("archives"))?.data ?? { ids: [] },
            ).ids;
            await single("archives", {
              ids: ids.includes(a) ? ids.filter((v) => v !== a) : [...ids, a],
            });
          }
          break;
        case "getConversations":
          {
            const rows = (
              await q(
                "SELECT * FROM documents WHERE kind='message' AND (owner_id=$1 OR data->>'recipientId'=$1) ORDER BY id DESC LIMIT 1000",
                [user.id],
              )
            ).rows;
            const groups = new Map(),
              hidden = decode(
                (await first("hidden"))?.data ?? { times: {} },
              ).times;
            for (const r of rows) {
              const m = decode(r.data),
                other = m.senderId === user.id ? m.recipientId : m.senderId;
              if (Number(m.timestamp) <= Number(hidden[other] ?? 0)) continue;
              let value = groups.get(other);
              if (!value) {
                value = {
                  otherUserId: other,
                  otherUsername:
                    (await profileView(await profileRow(other)))?.username ??
                    "Deleted account",
                  lastMessage: m.text,
                  lastMessageTime: m.timestamp,
                  unreadCount: 0n,
                };
                groups.set(other, value);
              }
              if (m.recipientId === user.id && !m.isRead) value.unreadCount++;
            }
            result = [...groups.values()];
          }
          break;
        case "sendMessageRequest":
          text(a, 1, 100);
          if (a === user.id || !(await profileRow(a)))
            err(400, "Invalid recipient");
          if (
            (
              await q(
                "SELECT 1 FROM documents WHERE kind='request' AND owner_id=$1 AND data->>'recipientId'=$2 AND data->'status' ? 'declined' AND (data->'timestamp'->>'$bigint')::bigint>$3",
                [user.id, a, String(now() - 604800000000000n)],
              )
            ).rowCount
          )
            err(403, "Request declined; try later");
          if (
            (
              await q(
                "SELECT 1 FROM documents WHERE kind='request' AND owner_id=$1 AND data->>'recipientId'=$2 AND data->'status' ? 'pending'",
                [user.id, a],
              )
            ).rowCount
          )
            err(409, "A pending request already exists.");
          {
            const r = await save("request", {
              senderId: user.id,
              recipientId: a,
              previewText: text(b.trim(), 1, 200),
              status: { pending: null },
              timestamp: now(),
            });
            result = { ...r, id: String(r.id) };
          }
          break;
        case "getMessageRequests":
          result = (
            await q(
              "SELECT * FROM documents WHERE kind='request' AND data->>'recipientId'=$1 AND data->'status' ? 'pending' ORDER BY id DESC LIMIT 100",
              [user.id],
            )
          ).rows.map((r) => ({ ...rowView(r), id: String(r.id) }));
          break;
        case "acceptMessageRequest":
        case "declineMessageRequest":
          {
            const r = await find("request", a);
            if (r.data.recipientId !== user.id) err(403, "Not your request");
            await q(
              "UPDATE documents SET data=jsonb_set(data,'{status}',$1) WHERE id=$2",
              [
                JSON.stringify({
                  [packet.method === "acceptMessageRequest"
                    ? "accepted"
                    : "declined"]: null,
                }),
                r.id,
              ],
            );
          }
          break;
        case "addReaction":
        case "removeReaction":
          {
            const r = await find("message", a);
            if (r.owner_id !== user.id && r.data.recipientId !== user.id)
              err(403, "Not your message");
            const m = decode(r.data);
            text(b, 1, 16);
            const reactions = m.reactions.filter(
              (v) => !(v.userId === user.id && v.emoji === b),
            );
            if (packet.method === "addReaction")
              reactions.push({ userId: user.id, emoji: b, timestamp: now() });
            await q("UPDATE documents SET data=$1 WHERE id=$2", [
              jsonData({ ...m, reactions }),
              r.id,
            ]);
          }
          break;
        case "getPersonalRecords":
        case "getPersonalRecord":
          {
            const records = new Map();
            for (const r of await own("workout")) {
              const w = rowView(r);
              let p = records.get(w.exerciseName);
              if (!p) {
                p = {
                  exerciseName: w.exerciseName,
                  maxWeight: [],
                  maxReps: 0n,
                  maxSets: 0n,
                  achievedAt: w.timestamp,
                };
                records.set(w.exerciseName, p);
              }
              if (
                w.weight.length &&
                (!p.maxWeight.length || w.weight[0] > p.maxWeight[0])
              ) {
                p.maxWeight = w.weight;
                p.achievedAt = w.timestamp;
              }
              p.maxReps = w.reps > p.maxReps ? w.reps : p.maxReps;
              p.maxSets = w.sets > p.maxSets ? w.sets : p.maxSets;
            }
            result =
              packet.method === "getPersonalRecord"
                ? records.has(a)
                  ? [records.get(a)]
                  : []
                : [...records.values()];
          }
          break;
        case "getWorkoutStreak":
          {
            const dates = [
              ...new Set((await own("workout")).map((r) => r.data.date)),
            ].sort();
            let longest = 0,
              run = 0,
              last;
            for (const day of dates) {
              run =
                last && Date.parse(day) - Date.parse(last) === 86400000
                  ? run + 1
                  : 1;
              longest = Math.max(longest, run);
              last = day;
            }
            const today = new Date().toISOString().slice(0, 10),
              current =
                last && Date.parse(today) - Date.parse(last) <= 86400000
                  ? run
                  : 0;
            result = {
              currentStreak: BigInt(current),
              longestStreak: BigInt(longest),
              lastWorkoutDate: last ? [last] : [],
            };
          }
          break;
        case "getDailySummary":
          {
            date(a);
            const meals = (await own("meal"))
                .filter((r) => r.data.date === a)
                .map(rowView),
              tasks = (await own("task")).filter((r) => r.data.date === a),
              water = (await own("water")).find((r) => r.data.date === a);
            result = {
              totalCalories: meals.reduce((n, v) => n + v.calories, 0n),
              totalProtein: meals.reduce((n, v) => n + v.protein, 0n),
              totalCarbs: meals.reduce((n, v) => n + v.carbs, 0n),
              totalFat: meals.reduce((n, v) => n + v.fat, 0n),
              waterMl: water ? decode(water.data).amount : 0n,
              workoutCount: BigInt(
                (await own("workout")).filter((r) => r.data.date === a).length,
              ),
              taskCompletionPct: tasks.length
                ? (tasks.filter((r) => r.data.completed).length /
                    tasks.length) *
                  100
                : 0,
            };
          }
          break;
        case "getWeeklySummary":
          date(a);
          date(b);
          result = {
            workoutsThisWeek: BigInt(
              (await own("workout")).filter(
                (r) => r.data.date >= a && r.data.date <= b,
              ).length,
            ),
            avgCaloriesPerDay:
              (await own("meal"))
                .filter((r) => r.data.date >= a && r.data.date <= b)
                .map(rowView)
                .reduce((n, v) => n + Number(v.calories), 0) / 7,
            avgWaterPerDay:
              (await own("water"))
                .filter((r) => r.data.date >= a && r.data.date <= b)
                .reduce((n, v) => n + Number(decode(v.data).amount), 0) / 7,
          };
          break;
        case "exportFitnessCSV":
        case "exportNutritionCSV":
          {
            date(a);
            date(b);
            const kind =
              packet.method === "exportFitnessCSV" ? "workout" : "meal";
            const cell = (v) => {
              let str = String(v ?? "");
              if (/^[=+\-@\t\r]/.test(str)) str = "'" + str;
              return '"' + str.replaceAll('"', '""') + '"';
            };
            const rows = (await own(kind))
              .filter((r) => r.data.date >= a && r.data.date <= b)
              .map(rowView);
            result = [
              kind === "meal"
                ? "Date,Food,Calories,Protein,Carbs,Fat"
                : "Date,Exercise,Sets,Reps,Weight",
              ...rows.map((v) =>
                (kind === "meal"
                  ? [v.date, v.mealName, v.calories, v.protein, v.carbs, v.fat]
                  : [v.date, v.exerciseName, v.sets, v.reps, v.weight[0]]
                )
                  .map(cell)
                  .join(","),
              ),
            ].join("\n");
          }
          break;
        case "listFoodPresets":
          result = foods;
          break;
        case "searchFoodPresets":
          text(a, 0, 80);
          result = foods.filter(
            (v) =>
              v.name.toLowerCase().includes(a.toLowerCase()) ||
              v.category.toLowerCase().includes(a.toLowerCase()),
          );
          break;
        case "getFoodPreset":
          result = foods.filter((v) => v.id === a);
          break;
        case "suggestMeals":
          {
            [a, b, d, e].forEach((v) => number(v, -100000, 100000));
            result = foods
              .filter(
                (v) =>
                  Number(v.caloriesPer100g) <= Math.max(0, a) &&
                  v.proteinPer100g <= Math.max(0, b) &&
                  v.carbsPer100g <= Math.max(0, d) &&
                  v.fatPer100g <= Math.max(0, e),
              )
              .slice(0, 6)
              .map((v) => ({
                name: `${v.name} (100g)`,
                calories: Number(v.caloriesPer100g),
                protein: v.proteinPer100g,
                carbs: v.carbsPer100g,
                fat: v.fatPer100g,
              }));
          }
          break;
        case "getPrivacyStatus":
          result = {
            healthConsent: !!(
              await q(
                "SELECT health_consent FROM agreements WHERE user_id=$1 ORDER BY accepted DESC LIMIT 1",
                [user.id],
              )
            ).rows[0]?.health_consent,
          };
          break;
        case "setHealthConsent":
          if (typeof a !== "boolean") err(400, "Invalid consent");
          await q("UPDATE agreements SET health_consent=$1 WHERE user_id=$2", [
            a,
            user.id,
          ]);
          await q(
            "INSERT INTO consent_events(user_id,version,health_consent) VALUES($1,$2,$3)",
            [user.id, "2026-10-13-beta-1", a],
          );
          if (!a)
            await q(
              "DELETE FROM documents WHERE owner_id=$1 AND kind IN('workout','meal','water','goals','schedule')",
              [user.id],
            );
          break;
        case "registerPasskey":
          text(a, 8, 128);
          break;
        case "accountExport":
        case "accountDelete":
          break;
        default:
          err(404, "Unknown API method");
      }
      async function canMessage(id) {
        text(id, 1, 100);
        if (id === user.id) return false;
        return (
          (
            await q(
              "SELECT 1 FROM follows WHERE from_id=$1 AND to_id=$2 UNION ALL SELECT 1 FROM documents WHERE kind='request' AND ((owner_id=$1 AND data->>'recipientId'=$2) OR(owner_id=$2 AND data->>'recipientId'=$1)) AND data->'status' ? 'accepted'",
              [user.id, id],
            )
          ).rowCount > 0
        );
      }
      // Remove detached photo metadata in the same owner transaction; the file queue survives failures.
      await q(
        "WITH detached AS (DELETE FROM media m WHERE owner_id=$1 AND NOT EXISTS (SELECT 1 FROM documents d WHERE d.owner_id=$1 AND d.data::text LIKE '%'||m.id::text||'%') RETURNING id) INSERT INTO media_gc(id) SELECT id FROM detached ON CONFLICT DO NOTHING",
        [user.id],
      );
      await q("COMMIT");
      // Maintenance processes the durable file queue without holding an RPC connection.
      return encode(result ?? null);
    } catch (error) {
      await c.query("ROLLBACK");
      if (error.code === "23505")
        err(409, "That name or entry already exists.");
      throw error;
    } finally {
      c.release();
    }
  }
  async function handle(req, res, path, readBody, sendJson) {
    if (path.startsWith("/api/media/")) return media.serve(req, res, path);
    if (path === "/api/legal/config" && req.method === "GET")
      return sendJson(res, {
        operatorName:
          process.env.OPERATOR_NAME || "Operator not yet configured",
        contact: process.env.PRIVACY_CONTACT || "",
        country: process.env.OPERATOR_COUNTRY || "DE",
        address: process.env.OPERATOR_ADDRESS || "",
        localTesting: local,
      });
    if (path === "/api/passkeys/register" && req.method === "POST")
      return sendJson(
        res,
        await ctx.passkeys.registration(req, res, await readBody(req), perform),
      );
    if (path === "/api/rpc" && req.method === "POST") {
      const packet = await readBody(req);
      return sendJson(res, { result: await perform(req, packet) });
    }
    if (path === "/api/account/export" && req.method === "POST")
      return accountAction(req, res, "export", await readBody(req), sendJson);
    if (path === "/api/account/delete" && req.method === "POST")
      return accountAction(req, res, "delete", await readBody(req), sendJson);
    err(404, "Not found");
  }
  async function accountAction(req, res, action, body, sendJson) {
    const user = await sessionUser(req);
    if (!user) err(401, "Please sign in.");
    if (
      body.method !== (action === "export" ? "accountExport" : "accountDelete")
    )
      err(400, "Invalid account action");
    await perform(req, body);
    await rate(`privacy:${user.id}`, 5, 3600000);
    if (action === "delete") {
      if (typeof decode(body.args)[0] !== "string")
        err(400, "Confirm your password");
      const value = await passwordHash(decode(body.args)[0], user.salt);
      if (
        !timingSafeEqual(
          Buffer.from(value, "hex"),
          Buffer.from(user.password, "hex"),
        )
      )
        err(401, "Password is incorrect.");
    }
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      await c.query("SELECT set_config('app.user_id',$1,true)", [user.id]);
      if (action === "export") {
        const docs = (
          await c.query(
            "SELECT kind,data,id FROM documents WHERE owner_id=$1 OR (kind IN('message','request') AND data->>'recipientId'=$1)",
            [user.id],
          )
        ).rows;
        const images = (
          await c.query("SELECT id,size,created FROM media WHERE owner_id=$1", [
            user.id,
          ])
        ).rows;
        const relationships = (
          await c.query(
            "SELECT from_id,to_id FROM follows WHERE from_id=$1 OR to_id=$1",
            [user.id],
          )
        ).rows;
        const consent = (
          await c.query(
            "SELECT version,accepted,health_consent FROM agreements WHERE user_id=$1",
            [user.id],
          )
        ).rows;
        await c.query("COMMIT");
        return sendJson(res, {
          version: 1,
          relationships,
          consent,
          consentHistory: (
            await c.query(
              "SELECT version,health_consent,created FROM consent_events WHERE user_id=$1 ORDER BY created",
              [user.id],
            )
          ).rows,
          account: { id: user.id, email: user.email },
          documents: docs,
          media: await media.exportImages(images),
          exportedAt: new Date().toISOString(),
        });
      }
      await c.query(
        "INSERT INTO media_gc(id) SELECT id FROM media WHERE owner_id=$1 ON CONFLICT DO NOTHING",
        [user.id],
      );
      await c.query(
        "DELETE FROM documents WHERE kind IN('message','request') AND data->>'recipientId'=$1",
        [user.id],
      );
      await c.query(
        "INSERT INTO deletion_tombstones(account_hash) VALUES($1) ON CONFLICT DO NOTHING",
        [createHmac("sha256", master).update(user.id).digest("hex")],
      );
      await c.query("DELETE FROM users WHERE id=$1", [user.id]);
      await c.query("COMMIT");
      await media
        .cleanup()
        .catch(() => console.error("Photo deletion queued for retry."));
      res.setHeader(
        "Set-Cookie",
        `nlocki_session=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0${local ? "" : "; Secure"}`,
      );
      return sendJson(res, { deleted: true });
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
  return { handle, perform, cleanup: media.cleanup };
}
