import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
mkdirSync(".secrets", { recursive: true, mode: 0o700 });
for (const name of ["db_admin_password", "db_app_password"])
  if (!existsSync(`.secrets/${name}`))
    writeFileSync(`.secrets/${name}`, randomBytes(32).toString("hex"), {
      mode: 0o600,
      flag: "wx",
    });
console.log(
  "Local secrets prepared; existing secrets and database data preserved.",
);
