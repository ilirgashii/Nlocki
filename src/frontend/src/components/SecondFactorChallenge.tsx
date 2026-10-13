import { LogOut, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useInternetIdentity } from "../hooks/use-auth";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function SecondFactorChallenge() {
  const { verifySecondFactor, clear } = useInternetIdentity();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await verifySecondFactor(code);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="min-h-screen grid place-items-center px-4 bg-background">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl border bg-card p-8 space-y-5 shadow-lg"
      >
        <div className="rounded-2xl bg-primary/10 p-4 w-fit">
          <ShieldCheck className="text-primary h-7 w-7" />
        </div>
        <h1 className="text-2xl font-display font-bold">One more step</h1>
        <p className="text-sm text-muted-foreground">
          {recovery
            ? "Enter a saved recovery code. Each code works once."
            : "Enter the 6-digit code from your authenticator app."}
        </p>
        <Input
          aria-label={recovery ? "Recovery code" : "Authenticator code"}
          autoFocus
          autoComplete="one-time-code"
          inputMode={recovery ? "text" : "numeric"}
          maxLength={recovery ? 32 : 6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="text-center text-xl tracking-widest"
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button className="w-full" disabled={busy || !code.trim()}>
          {busy ? "Verifying…" : "Verify and continue"}
        </Button>
        <button
          type="button"
          className="text-sm text-primary hover:underline"
          onClick={() => {
            setRecovery(!recovery);
            setCode("");
            setError("");
          }}
        >
          {recovery
            ? "Use authenticator code"
            : "Lost your device? Use a recovery code"}
        </button>
        <Button
          type="button"
          variant="ghost"
          className="w-full gap-2"
          onClick={() => void clear()}
        >
          <LogOut size={16} />
          Sign out
        </Button>
      </form>
    </div>
  );
}
