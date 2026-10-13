import { startRegistration } from "@simplewebauthn/browser";
import { useEffect, useState } from "react";
import { useInternetIdentity } from "../hooks/use-auth";
import { httpBackend, httpCall } from "../lib/http-backend";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
export function AccountPrivacy() {
  const auth = useInternetIdentity();
  const [local, setLocal] = useState(true);
  const [consent, setConsent] = useState<boolean>();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (httpBackend && auth.identity)
      httpCall(auth.identity, "getPrivacyStatus", [])
        .then((s) => setConsent(s.healthConsent))
        .catch((e) => setError(e.message));
  }, [auth.identity]);
  useEffect(() => {
    fetch("/api/auth/config")
      .then((r) => r.json())
      .then((c) => setLocal(c.localTesting))
      .catch(() => {});
  }, []);
  if (!httpBackend) return null;
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rounded-2xl border bg-card p-5 space-y-4">
      <h2 className="font-semibold">Account privacy</h2>
      <p className="text-sm text-muted-foreground">
        Optional fitness and nutrition data can reveal health information.
        Consent is separate from basic account use; you can withdraw it and
        remove that data at any time.
      </p>
      <Button
        disabled={busy || !auth.identity || consent === undefined}
        variant="outline"
        onClick={() =>
          void run(async () => {
            if (
              consent &&
              !window.confirm(
                "Delete all fitness and nutrition entries and withdraw consent? This cannot be undone.",
              )
            )
              return;
            await httpCall(auth.identity!, "setHealthConsent", [!consent]);
            setConsent(!consent);
            window.location.reload();
          })
        }
      >
        {consent
          ? "Withdraw consent and delete fitness/nutrition data"
          : "I explicitly consent to optional fitness/nutrition processing"}
      </Button>
      <Button
        variant="outline"
        disabled={busy || !auth.identity}
        onClick={() =>
          void run(async () => {
            const value = await httpCall(
              auth.identity!,
              "accountExport",
              [],
              "/api/account/export",
            );
            const url = URL.createObjectURL(
              new Blob([JSON.stringify(value, null, 2)], {
                type: "application/json",
              }),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = "nlocki-account-export.json";
            a.click();
            URL.revokeObjectURL(url);
          })
        }
      >
        Export my data
      </Button>
      {!local && (
        <details>
          <summary className="cursor-pointer">Register a passkey</summary>
          <div className="space-y-3 mt-3">
            <p className="text-sm">
              Add a device passkey as an alternative to your password. Confirm
              your current password first.
            </p>
            <Input
              aria-label="Password for passkey registration"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              disabled={busy || !password || !auth.identity}
              onClick={() =>
                void run(async () => {
                  const options = await httpCall(
                    auth.identity!,
                    "registerPasskey",
                    [password],
                    "/api/passkeys/register",
                  );
                  const response = await startRegistration({
                    optionsJSON: options,
                  });
                  await httpCall(
                    auth.identity!,
                    "registerPasskey",
                    [password, response],
                    "/api/passkeys/register",
                  );
                  setPassword("");
                  setError("Passkey registered.");
                })
              }
            >
              Add passkey
            </Button>
          </div>
        </details>
      )}
      <details>
        <summary className="cursor-pointer text-destructive">
          Delete my account
        </summary>
        <div className="space-y-3 mt-3">
          <p className="text-sm">
            This removes your active account, posts, messages, fitness data and
            stored photos. Backups expire according to the privacy notice. This
            action cannot be undone.
          </p>
          <Input
            aria-label="Confirm account password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
            />
            I understand that my account will be deleted.
          </label>
          <Button
            variant="destructive"
            disabled={busy || !confirm || !password || !auth.identity}
            onClick={() =>
              void run(async () => {
                await httpCall(
                  auth.identity!,
                  "accountDelete",
                  [password],
                  "/api/account/delete",
                );
                await auth.clear();
                window.location.assign("/");
              })
            }
          >
            Permanently delete account
          </Button>
        </div>
      </details>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </section>
  );
}
