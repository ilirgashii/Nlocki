import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "@tanstack/react-router";
import {
  CalendarCheck,
  Dumbbell,
  Fingerprint,
  Moon,
  ShieldCheck,
  Sun,
  UtensilsCrossed,
} from "lucide-react";
import { useState } from "react";
import { EmailLogin } from "../components/EmailLogin";
import { useInternetIdentity } from "../hooks/use-auth";
import { useUpdateProfile } from "../hooks/use-backend";
import { useTheme } from "../hooks/use-theme";
import { emailAuthEnabled, localEmailMode } from "../lib/email-auth";

export default function LoginPage() {
  const { login, isLoggingIn, isInitializing, isAuthenticated, loginError } =
    useInternetIdentity();
  const { theme, toggleTheme } = useTheme();
  const save = useUpdateProfile();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  async function register(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username.trim())) {
      setError("Use 3–24 letters, numbers or underscores.");
      return;
    }
    try {
      await save.mutateAsync({
        username: username.trim(),
        displayName: displayName.trim(),
        bio: "",
        isPublic: false,
      });
      await navigate({ to: "/" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save profile.");
    }
  }
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-10 relative overflow-hidden">
      <Button
        variant="ghost"
        className="absolute top-4 right-4"
        aria-label="Toggle theme"
        onClick={toggleTheme}
      >
        {theme === "dark" ? <Sun /> : <Moon />}
      </Button>
      <div
        className="absolute -top-40 -left-32 w-[550px] h-[550px] rounded-full bg-primary/10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-40 -right-20 w-[500px] h-[500px] rounded-full bg-violet-500/10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div className="relative w-full max-w-5xl grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
        <section className="space-y-7 hidden lg:block">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary">
            <ShieldCheck size={16} />
            Your life. Your space.
          </span>
          <h2 className="font-display text-5xl font-bold leading-tight">
            Make room for
            <br />
            <span className="text-primary">better days.</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-md">
            One calm place to plan your day, build healthy habits, and stay
            connected.
          </p>
          <div className="grid gap-3">
            {[
              {
                icon: CalendarCheck,
                title: "A little more organized",
                text: "Plan the things that matter, one day at a time.",
              },
              {
                icon: Dumbbell,
                title: "A little more active",
                text: "Track your workouts and celebrate your progress.",
              },
              {
                icon: UtensilsCrossed,
                title: "A little more balanced",
                text: "Make nutrition and hydration easier to follow.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="flex gap-4 rounded-2xl border bg-card/60 p-4"
              >
                <div className="rounded-xl bg-primary/10 p-3 h-fit text-primary">
                  <Icon size={20} />
                </div>
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <div className="w-full max-w-md mx-auto rounded-3xl border bg-card/90 p-6 md:p-9 space-y-6 shadow-xl">
          <div className="text-center">
            <h1 className="font-display font-bold text-4xl">Nlock&apos;i</h1>
            <p className="text-muted-foreground mt-2">Life in easy mode.</p>
          </div>
          {isAuthenticated ? (
            <form onSubmit={register} className="space-y-4">
              <h2 className="text-xl font-semibold">Set up your profile</h2>
              <Label htmlFor="displayName">Display name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={80}
              />
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                maxLength={24}
                autoComplete="username"
              />
              <p className="text-sm text-muted-foreground">
                Your profile starts private. You can change this in your profile
                settings.
              </p>
              <Button
                type="submit"
                className="w-full"
                disabled={save.isPending}
              >
                {save.isPending ? "Saving…" : "Save profile"}
              </Button>
            </form>
          ) : emailAuthEnabled ? (
            <div className="space-y-4">
              <EmailLogin />
              {!localEmailMode && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  onClick={login}
                  disabled={isLoggingIn || isInitializing}
                >
                  <Fingerprint />
                  Login with Internet Identity
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-center">Welcome</h2>
              <p className="text-sm text-muted-foreground text-center">
                Sign in or create an account securely with Internet Identity.
                Use a passkey; Nlock&apos;i does not collect a password.
              </p>
              <Button
                className="w-full gap-2"
                onClick={login}
                disabled={isLoggingIn || isInitializing}
              >
                <Fingerprint />
                {isLoggingIn ? "Signing in…" : "Login with Internet Identity"}
              </Button>
            </div>
          )}
          {(error || loginError) && (
            <p role="alert" className="text-sm text-destructive">
              {error || loginError?.message}
            </p>
          )}
          <div className="border-t pt-4 flex gap-2 items-center justify-center text-xs text-muted-foreground">
            <ShieldCheck size={14} />
            {emailAuthEnabled
              ? "Email sign-in · Optional authenticator 2FA"
              : "Passkey sign-in · Optional authenticator 2FA"}
          </div>
        </div>
      </div>
      <footer className="mt-12 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Nlock&apos;i
      </footer>
    </div>
  );
}
