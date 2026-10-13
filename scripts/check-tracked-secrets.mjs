import { execFileSync } from "node:child_process";
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean);
const privateDirectories = new Set([
  ".secrets",
  ".local-auth",
  ".local-state",
  ".local-media",
  ".dfx",
  ".aws",
  ".ssh",
  ".docker",
  "auth-state",
  "pg-data",
]);
const forbidden = files.filter((path) => {
  const parts = path.split("/");
  if (parts.slice(0, -1).some((part) => privateDirectories.has(part)))
    return true;
  const name = parts.at(-1);
  const env =
    name === ".env" || name.startsWith(".env.") || /\.env(?:\.|$)/.test(name);
  if (env && !/\.env\.(?:example|sample|template)$/.test(name)) return true;
  return (
    /\.(?:key|pem|p12|pfx|sqlite|sqlite3|dump|sql\.gz)$/.test(name) ||
    ["id_rsa", "id_ed25519"].includes(name)
  );
});
if (forbidden.length) {
  console.error(
    "Private configuration or state is tracked in Git (paths only):\n" +
      forbidden.map((path) => `- ${path}`).join("\n"),
  );
  console.error(
    "Untrack these files while preserving local copies. If credentials were already published, rotate/revoke them; deleting a file does not remove its Git history.",
  );
  process.exitCode = 1;
} else
  console.log(
    `PASS: ${files.length} tracked paths checked; private configuration/state is excluded. Public empty env templates are permitted.`,
  );
