import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "@tanstack/react-router";
import { Fingerprint, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { useInternetIdentity } from "../hooks/use-auth";
import { useUpdateProfile } from "../hooks/use-backend";
import { useTheme } from "../hooks/use-theme";

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <Button
        variant="ghost"
        className="absolute top-4 right-4"
        aria-label="Toggle theme"
        onClick={toggleTheme}
      >
        {theme === "dark" ? <Sun /> : <Moon />}
      </Button>
      <div className="w-full max-w-sm space-y-6">
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
            <Button type="submit" className="w-full" disabled={save.isPending}>
              {save.isPending ? "Saving…" : "Save profile"}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center">Welcome</h2>
            <p className="text-sm text-muted-foreground text-center">
              Sign in or create an account securely with Internet Identity. Use
              a passkey; Nlock&apos;i does not collect a password.
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
      </div>
      <footer className="mt-12 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Nlock&apos;i
      </footer>
    </div>
  );
}
