import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { ArrowLeft, Eye, EyeOff, Fingerprint, Moon, Sun } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useUpdateProfile } from "../hooks/use-backend";
import { useTheme } from "../hooks/use-theme";

type View = "login" | "register";

interface RegisterForm {
  displayName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
}

type FormErrors = Partial<RegisterForm>;

export default function LoginPage() {
  const { login, isLoggingIn, isInitializing } = useInternetIdentity();
  const { theme, toggleTheme } = useTheme();
  const updateProfile = useUpdateProfile();
  const [view, setView] = useState<View>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<RegisterForm>({
    displayName: "",
    username: "",
    email: "",
    phone: "",
    password: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  function setField<K extends keyof RegisterForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const next: FormErrors = {};
    if (!form.displayName.trim())
      next.displayName = "Display name is required.";
    if (!form.username.trim()) next.username = "Username is required.";
    else if (!/^[a-zA-Z0-9_]{3,24}$/.test(form.username.trim()))
      next.username = "3–24 chars, letters, numbers, underscores only.";
    if (!form.email.trim()) next.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.email = "Enter a valid email address.";
    if (!form.password.trim()) next.password = "Password is required.";
    else if (form.password.length < 6)
      next.password = "At least 6 characters required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleRegister() {
    if (!validate()) return;
    try {
      await updateProfile.mutateAsync({
        username: form.username.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        bio: "",
        isPublic: false,
        followersCount: 0,
        followingCount: 0,
      });
      localStorage.setItem("auth:username", form.username.trim());
      localStorage.setItem("auth:displayName", form.displayName.trim());
      login();
    } catch {
      toast.error("Could not save profile. Please try again.");
    }
  }

  const isBusy = isLoggingIn || isInitializing || updateProfile.isPending;

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Animated gradient blobs */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        {/* Top-right pink blob */}
        <motion.div
          className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, oklch(0.7 0.24 354 / 0.35) 0%, oklch(0.65 0.18 300 / 0.15) 60%, transparent 80%)",
            filter: "blur(64px)",
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [1, 1.08, 0.96, 1.04, 1], opacity: 0.6 }}
          transition={{
            duration: 8,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "mirror",
            ease: [0.4, 0, 0.2, 1],
          }}
        />
        {/* Bottom-left purple blob */}
        <motion.div
          className="absolute -bottom-48 -left-48 w-[500px] h-[500px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, oklch(0.65 0.22 300 / 0.3) 0%, oklch(0.6 0.18 340 / 0.12) 60%, transparent 80%)",
            filter: "blur(72px)",
          }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [1, 0.92, 1.1, 0.98, 1], opacity: 0.4 }}
          transition={{
            duration: 10,
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "mirror",
            ease: [0.4, 0, 0.2, 1],
            delay: 2,
          }}
        />
        {/* Center soft glow */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 50%, oklch(var(--primary) / 0.04) 0%, transparent 70%)",
          }}
        />
        {/* Background base */}
        <div
          className="absolute inset-0 bg-background"
          style={{ zIndex: -1 }}
        />
      </div>

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-20">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          data-ocid="login.theme_toggle"
          className="rounded-xl text-muted-foreground hover:text-foreground backdrop-blur-sm bg-card/40 border border-border/50 hover:bg-card/70 transition-smooth"
        >
          <AnimatePresence mode="wait">
            {theme === "dark" ? (
              <motion.span
                key="sun"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Sun className="w-4 h-4" />
              </motion.span>
            ) : (
              <motion.span
                key="moon"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Moon className="w-4 h-4" />
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-12">
        <AnimatePresence mode="wait">
          {view === "login" ? (
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 28, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="w-full max-w-sm"
            >
              {/* Hero branding */}
              <motion.div
                className="flex flex-col items-center gap-4 mb-10"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                <div
                  className="w-20 h-20 rounded-2xl gradient-pink-accent flex items-center justify-center shadow-elevated"
                  style={{
                    boxShadow:
                      "0 8px 32px oklch(var(--primary) / 0.4), 0 2px 8px oklch(var(--primary) / 0.2)",
                  }}
                >
                  <span className="font-display font-black text-3xl text-primary-foreground">
                    N
                  </span>
                </div>
                <div className="text-center space-y-1">
                  <h1 className="font-display font-black text-5xl text-foreground tracking-tight leading-none">
                    Nlock&apos;i
                  </h1>
                  <p className="text-muted-foreground text-sm font-body italic">
                    Life in easy mode.
                  </p>
                </div>
              </motion.div>

              {/* Glass card */}
              <motion.div
                className="rounded-2xl p-8 space-y-6 border border-border/60"
                style={{
                  background: "oklch(var(--card) / 0.75)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  boxShadow:
                    "0 8px 32px oklch(var(--foreground) / 0.08), inset 0 1px 0 oklch(var(--primary) / 0.08)",
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.4 }}
              >
                <div className="space-y-1 text-center">
                  <h2 className="font-display font-semibold text-xl text-foreground">
                    Welcome back
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Sign in securely with Internet Identity
                  </p>
                </div>

                <Button
                  className="w-full gap-2.5 h-12 font-display font-semibold text-base gradient-pink-accent text-primary-foreground hover:opacity-90 transition-smooth border-0 rounded-xl"
                  style={{
                    boxShadow: "0 4px 16px oklch(var(--primary) / 0.35)",
                  }}
                  onClick={login}
                  disabled={isBusy}
                  data-ocid="login.ii_button"
                >
                  {isBusy ? (
                    <motion.div
                      className="w-5 h-5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 0.8,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "linear",
                      }}
                    />
                  ) : (
                    <Fingerprint className="w-5 h-5" />
                  )}
                  {isBusy ? "Connecting…" : "Login with Internet Identity"}
                </Button>

                <div className="flex items-center gap-3">
                  <Separator className="flex-1 bg-border/60" />
                  <span className="text-xs text-muted-foreground px-1">or</span>
                  <Separator className="flex-1 bg-border/60" />
                </div>

                <p className="text-center text-sm text-muted-foreground">
                  New here?{" "}
                  <button
                    type="button"
                    onClick={() => setView("register")}
                    className="text-primary font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                    data-ocid="login.create_account_link"
                  >
                    Create an account
                  </button>
                </p>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="register"
              initial={{ opacity: 0, y: 28, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.97 }}
              transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
              className="w-full max-w-sm"
            >
              {/* Compact branding */}
              <motion.div
                className="flex items-center gap-3 mb-8"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 }}
              >
                <div className="w-10 h-10 rounded-xl gradient-pink-accent flex items-center justify-center shadow-elevated flex-shrink-0">
                  <span className="font-display font-black text-base text-primary-foreground">
                    N
                  </span>
                </div>
                <div>
                  <h1 className="font-display font-black text-2xl text-foreground tracking-tight leading-none">
                    Nlock&apos;i
                  </h1>
                  <p className="text-muted-foreground text-xs italic">
                    Life in easy mode.
                  </p>
                </div>
              </motion.div>

              {/* Glass card */}
              <motion.div
                className="rounded-2xl p-8 border border-border/60"
                style={{
                  background: "oklch(var(--card) / 0.75)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  boxShadow:
                    "0 8px 32px oklch(var(--foreground) / 0.08), inset 0 1px 0 oklch(var(--primary) / 0.08)",
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                {/* Header row */}
                <div className="flex items-center gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setView("login");
                      setErrors({});
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Back to login"
                    data-ocid="register.back_link"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h2 className="font-display font-semibold text-lg text-foreground leading-none">
                      Create account
                    </h2>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      Fill in your details to get started
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Display Name */}
                  <motion.div
                    className="space-y-1.5"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                  >
                    <Label
                      htmlFor="displayName"
                      className="text-sm font-medium"
                    >
                      Display Name <span className="text-primary">*</span>
                    </Label>
                    <Input
                      id="displayName"
                      placeholder="e.g. Alex Fit"
                      value={form.displayName}
                      onChange={(e) => setField("displayName", e.target.value)}
                      className={
                        errors.displayName
                          ? "border-destructive focus-visible:ring-destructive"
                          : ""
                      }
                      data-ocid="register.display_name_input"
                    />
                    {errors.displayName && (
                      <p
                        className="text-destructive text-xs"
                        data-ocid="register.display_name_field_error"
                      >
                        {errors.displayName}
                      </p>
                    )}
                  </motion.div>

                  {/* Username */}
                  <motion.div
                    className="space-y-1.5"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.18 }}
                  >
                    <Label htmlFor="username" className="text-sm font-medium">
                      Username <span className="text-primary">*</span>
                    </Label>
                    <Input
                      id="username"
                      placeholder="e.g. alex_fit"
                      value={form.username}
                      onChange={(e) => setField("username", e.target.value)}
                      className={
                        errors.username
                          ? "border-destructive focus-visible:ring-destructive"
                          : ""
                      }
                      data-ocid="register.username_input"
                    />
                    {errors.username && (
                      <p
                        className="text-destructive text-xs"
                        data-ocid="register.username_field_error"
                      >
                        {errors.username}
                      </p>
                    )}
                  </motion.div>

                  {/* Email */}
                  <motion.div
                    className="space-y-1.5"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.21 }}
                  >
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email <span className="text-primary">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                      className={
                        errors.email
                          ? "border-destructive focus-visible:ring-destructive"
                          : ""
                      }
                      data-ocid="register.email_input"
                    />
                    {errors.email && (
                      <p
                        className="text-destructive text-xs"
                        data-ocid="register.email_field_error"
                      >
                        {errors.email}
                      </p>
                    )}
                  </motion.div>

                  {/* Phone */}
                  <motion.div
                    className="space-y-1.5"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.24 }}
                  >
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Phone number{" "}
                      <span className="text-muted-foreground font-normal text-xs">
                        (optional)
                      </span>
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+383 44 000 000"
                      value={form.phone}
                      onChange={(e) => setField("phone", e.target.value)}
                      data-ocid="register.phone_input"
                    />
                    <p className="text-xs text-muted-foreground">
                      For display only — no SMS will be sent.
                    </p>
                  </motion.div>

                  {/* Password */}
                  <motion.div
                    className="space-y-1.5"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.27 }}
                  >
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password <span className="text-primary">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Min. 6 characters"
                        value={form.password}
                        onChange={(e) => setField("password", e.target.value)}
                        className={
                          errors.password
                            ? "border-destructive focus-visible:ring-destructive pr-10"
                            : "pr-10"
                        }
                        data-ocid="register.password_input"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-smooth"
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                        data-ocid="register.password_toggle"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {errors.password && (
                      <p
                        className="text-destructive text-xs"
                        data-ocid="register.password_field_error"
                      >
                        {errors.password}
                      </p>
                    )}
                  </motion.div>

                  {/* Submit */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.32 }}
                  >
                    <Button
                      className="w-full gap-2.5 h-11 font-display font-semibold gradient-pink-accent text-primary-foreground hover:opacity-90 transition-smooth border-0 rounded-xl mt-2"
                      style={{
                        boxShadow: "0 4px 16px oklch(var(--primary) / 0.3)",
                      }}
                      onClick={handleRegister}
                      disabled={isBusy}
                      data-ocid="register.submit_button"
                    >
                      {isBusy ? (
                        <motion.div
                          className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 0.8,
                            repeat: Number.POSITIVE_INFINITY,
                            ease: "linear",
                          }}
                        />
                      ) : (
                        <Fingerprint className="w-4 h-4" />
                      )}
                      {isBusy
                        ? "Connecting…"
                        : "Register with Internet Identity"}
                    </Button>
                  </motion.div>

                  {/* Copyright */}
                  <motion.p
                    className="text-[11px] text-muted-foreground text-center leading-relaxed pt-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    © {new Date().getFullYear()} Nlock&apos;i. All rights
                    reserved. By registering you agree to our{" "}
                    <button
                      type="button"
                      className="text-primary hover:underline focus-visible:outline-none"
                    >
                      Terms of Service
                    </button>{" "}
                    and{" "}
                    <button
                      type="button"
                      className="text-primary hover:underline focus-visible:outline-none"
                    >
                      Privacy Policy
                    </button>
                    .
                  </motion.p>
                </div>
              </motion.div>

              <p className="text-center text-sm text-muted-foreground mt-5">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setView("login");
                    setErrors({});
                  }}
                  className="text-primary font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                  data-ocid="register.sign_in_link"
                >
                  Sign in
                </button>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center py-4 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Nlock&apos;i. All rights reserved.
      </footer>
    </div>
  );
}
