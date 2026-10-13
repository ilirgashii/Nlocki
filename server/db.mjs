import pg from "pg";
import { readFileSync } from "node:fs";
export const pool = new pg.Pool({
  host: process.env.PGHOST || "db",
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || "nlocki",
  user: process.env.PGUSER || "nlocki_app",
  password: process.env.PGPASSWORD_FILE
    ? readFileSync(process.env.PGPASSWORD_FILE, "utf8").trim()
    : process.env.PGPASSWORD,
  ssl: process.env.PGSSL_CA_FILE
    ? {
        ca: readFileSync(process.env.PGSSL_CA_FILE, "utf8"),
        rejectUnauthorized: true,
      }
    : false,
  max: 10,
  connectionTimeoutMillis: 5000,
  statement_timeout: 10000,
  idle_in_transaction_session_timeout: 15000,
});
if (process.env.NODE_ENV === "production" && !process.env.PGSSL_CA_FILE)
  throw new Error("Production PostgreSQL requires verified TLS.");
export async function getDb() {
  const role = (
    await pool.query(
      "SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user",
    )
  ).rows[0];
  if (role.rolsuper || role.rolbypassrls)
    throw new Error(
      "Use the restricted application PostgreSQL role, not an administrator.",
    );
  return {
    prepare(sql) {
      let i = 0;
      const query = sql.replace(/\?/g, () => `$${++i}`);
      return {
        async get(...values) {
          return (await pool.query(query, values)).rows[0];
        },
        async all(...values) {
          return (await pool.query(query, values)).rows;
        },
        async run(...values) {
          const r = await pool.query(query, values);
          return { changes: r.rowCount };
        },
      };
    },
  };
}
