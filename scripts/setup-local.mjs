import {
  mkdirSync,
  existsSync,
  writeFileSync,
  lstatSync,
  rmdirSync,
  readFileSync,
  chmodSync,
} from "node:fs";
import { randomBytes } from "node:crypto";
mkdirSync(".secrets", { recursive: true, mode: 0o700 });
if (!lstatSync(".secrets").isDirectory())
  throw new Error(
    ".secrets must be a private directory, not a symlink or file. Existing contents were preserved.",
  );
chmodSync(".secrets", 0o700);
for (const name of ["db_admin_password", "db_app_password"]) {
  const path = `.secrets/${name}`;
  if (existsSync(path) && lstatSync(path).isDirectory()) {
    // Docker may create an empty directory when a secret source file is missing.
    // rmdir refuses nonempty directories, preserving any unexpected contents.
    try {
      rmdirSync(path);
    } catch {
      throw new Error(
        `${path} is a nonempty or inaccessible directory. Existing contents were preserved; inspect it before proceeding.`,
      );
    }
  }
  if (!existsSync(path)) {
    writeFileSync(path, randomBytes(32).toString("hex"), {
      mode: 0o600,
      flag: "wx",
    });
  } else {
    if (!lstatSync(path).isFile() || !readFileSync(path, "utf8").trim())
      throw new Error(
        `${path} must be a nonempty regular password file. Restore an existing password rather than replacing it for a populated database.`,
      );
    chmodSync(path, 0o600);
  }
}
console.log(
  "Local secrets prepared; existing secrets and database data preserved.",
);
