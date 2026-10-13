import { useEffect, useState } from "react";
import { useInternetIdentity } from "../hooks/use-auth";
import { type EmailConfig, emailRequest } from "../lib/email-auth";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
export function EmailLogin() {
  const { emailLogin, isLoggingIn, isInitializing } = useInternetIdentity();
  const [config, setConfig] = useState<EmailConfig>();
  const [signup, setSignup] = useState(false);
  const [verification, setVerification] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    emailRequest("config")
      .then(setConfig)
      .catch(() =>
        setError("Sign-in service unavailable. Check Docker logs and retry."),
      );
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const done = await emailLogin(
        verification ? "verify" : signup ? "signup" : "login",
        email,
        password,
        code,
      );
      if (!done) setVerification(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in.");
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="text-xl font-semibold">
        {verification
          ? "Confirm your email"
          : signup
            ? "Create your account"
            : "Welcome back"}
      </h2>
      {config?.localTesting && (
        <p className="rounded-xl bg-primary/5 p-3 text-sm text-muted-foreground">
          Local testing ·{" "}
          {config.requireVerification
            ? "Email codes go to your test inbox."
            : "Use an email and password. No passkey or email code needed."}
        </p>
      )}
      <Label htmlFor="auth-email">Email</Label>
      <Input
        id="auth-email"
        type="email"
        autoComplete="email"
        required
        maxLength={254}
        value={email}
        disabled={verification || isLoggingIn}
        onChange={(e) => setEmail(e.target.value)}
      />
      {!verification && (
        <>
          <Label htmlFor="auth-password">Password</Label>
          <Input
            id="auth-password"
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            required
            minLength={config?.localTesting ? 8 : 12}
            maxLength={128}
            value={password}
            disabled={isLoggingIn}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            At least {config?.localTesting ? 8 : 12} characters. Use a separate
            password for testing.
          </p>
        </>
      )}
      {verification && (
        <>
          <Label htmlFor="email-code">Confirmation code</Label>
          <Input
            id="email-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            Enter the six-digit code. It expires after 10 minutes.
          </p>
          {config?.localInbox && (
            <a
              className="text-primary underline text-sm"
              href="/api/auth/dev/inbox"
              target="_blank"
              rel="noreferrer"
            >
              Open local test inbox
            </a>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button
        className="w-full"
        type="submit"
        disabled={isLoggingIn || isInitializing || !config}
      >
        {isLoggingIn
          ? "Please wait…"
          : verification
            ? "Confirm email"
            : signup
              ? "Create account"
              : "Sign in"}
      </Button>
      {verification ? (
        <div className="flex justify-between">
          <Button
            type="button"
            variant="ghost"
            disabled={isLoggingIn}
            onClick={async () => {
              try {
                await emailRequest("resend", { email, password });
                setError("A new code has been sent.");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Could not resend.");
              }
            }}
          >
            Resend code
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setVerification(false);
              setCode("");
            }}
          >
            Back
          </Button>
        </div>
      ) : (
        <Button
          className="w-full"
          type="button"
          variant="ghost"
          disabled={isLoggingIn}
          onClick={() => {
            setSignup(!signup);
            setError("");
          }}
        >
          {signup
            ? "Already have an account? Sign in"
            : "New here? Create an account"}
        </Button>
      )}
    </form>
  );
}
