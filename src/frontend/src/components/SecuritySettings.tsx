import { ShieldCheck } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { useInternetIdentity } from "../hooks/use-auth";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function SecuritySettings() {
  const auth = useInternetIdentity();
  const [enabled, setEnabled] = useState<boolean>();
  const [secret, setSecret] = useState("");
  const [qr, setQr] = useState("");
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [disabling, setDisabling] = useState(false);
  useEffect(() => {
    auth
      .primaryActor()
      .then((a) => a.getSecondFactorStatus())
      .then((s) => setEnabled(s.enabled))
      .catch((e) => setError(e.message));
  }, [auth.primaryActor]);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not update security settings.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function setup() {
    const actor = await auth.primaryActor();
    const data = await actor.beginSecondFactorSetup();
    const uri = `otpauth://totp/Nlocki:${encodeURIComponent(auth.userId)}?secret=${data.secret}&issuer=Nlocki&algorithm=SHA256&digits=6&period=30`;
    setSecret(data.secret);
    setQr(await QRCode.toDataURL(uri));
  }
  return (
    <section
      className="rounded-2xl border border-primary/20 bg-card p-5 space-y-4"
      data-ocid="profile.security"
    >
      <div className="flex items-center gap-3">
        <ShieldCheck className="text-primary" />
        <div>
          <h2 className="font-semibold">Account security</h2>
          <p className="text-sm text-muted-foreground">
            Optional authenticator verification after sign-in
          </p>
        </div>
      </div>
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${enabled ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"}`}
      >
        {enabled === undefined
          ? "Checking…"
          : enabled
            ? "Two-factor authentication enabled"
            : "Two-factor authentication not enabled"}
      </span>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {recovery.length > 0 ? (
        <div className="space-y-3">
          <h3 className="font-semibold">Save your recovery codes now</h3>
          <p className="text-sm text-muted-foreground">
            Keep these offline. They are shown once and each works once. You
            still need your original email or passkey sign-in.
          </p>
          <div className="rounded-xl bg-muted p-4 font-mono text-sm space-y-2">
            {recovery.map((c) => (
              <div key={c}>{c}</div>
            ))}
          </div>
          <Button onClick={() => setRecovery([])}>I saved my codes</Button>
        </div>
      ) : secret ? (
        <div className="space-y-3">
          <p className="text-sm">
            Scan with a SHA-256-compatible authenticator such as 2FAS or Aegis.
            Setup expires after 10 minutes.
          </p>
          <img
            src={qr}
            alt="Authenticator setup QR code"
            className="rounded-xl"
          />
          <details>
            <summary className="text-sm cursor-pointer">
              Enter the key manually
            </summary>
            <code className="break-all text-xs">{secret}</code>
          </details>
          <Input
            aria-label="Confirm authenticator code"
            autoComplete="one-time-code"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="6-digit code"
          />
          <Button
            disabled={busy || code.length !== 6}
            onClick={() =>
              void run(async () => {
                const codes = await auth.confirmSecondFactor(code);
                setRecovery(codes);
                setSecret("");
                setQr("");
                setCode("");
                setEnabled(true);
              })
            }
          >
            {busy ? "Verifying…" : "Enable two-factor authentication"}
          </Button>
        </div>
      ) : disabling ? (
        <div className="space-y-3">
          <p className="text-sm">
            Enter a fresh authenticator code or an unused recovery code to
            disable 2FA.
          </p>
          <Input
            aria-label="Disable authenticator code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="one-time-code"
          />
          <Button
            variant="destructive"
            disabled={busy || !code.trim()}
            onClick={() =>
              void run(async () => {
                const a = await auth.primaryActor();
                const r = await a.disableSecondFactor(
                  code.trim().toUpperCase(),
                );
                if ("error" in r) throw new Error(r.error);
                setDisabling(false);
                setEnabled(false);
                setCode("");
                await auth.refreshSecurity();
              })
            }
          >
            Disable 2FA
          </Button>
          <Button variant="ghost" onClick={() => setDisabling(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          disabled={busy || enabled === undefined}
          variant={enabled ? "outline" : "default"}
          onClick={() => (enabled ? setDisabling(true) : void run(setup))}
        >
          {enabled
            ? "Disable two-factor authentication"
            : "Set up two-factor authentication"}
        </Button>
      )}
    </section>
  );
}
