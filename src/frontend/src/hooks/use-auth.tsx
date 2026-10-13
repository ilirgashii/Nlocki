import { AuthClient } from "@dfinity/auth-client";
import type { Identity } from "@icp-sdk/core/agent";
import { Ed25519KeyIdentity } from "@icp-sdk/core/identity";
import { useQueryClient } from "@tanstack/react-query";
import {
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { type BackendActor, connectBackend } from "../lib/backend-client";
import {
  emailAuthEnabled,
  emailIdentity,
  emailRequest,
  localEmailMode,
} from "../lib/email-auth";

type Auth = {
  identity?: Identity;
  primaryIdentity?: Identity;
  userId: string;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoggingIn: boolean;
  secondFactorRequired: boolean;
  loginError?: Error;
  recoveryCodes: string[];
  dismissRecoveryCodes: () => void;
  login: () => void;
  emailLogin: (
    action: "signup" | "login" | "verify",
    email: string,
    password: string,
    code?: string,
  ) => Promise<boolean>;
  clear: () => Promise<void>;
  verifySecondFactor: (code: string) => Promise<void>;
  confirmSecondFactor: (code: string) => Promise<string[]>;
  primaryActor: () => Promise<BackendActor>;
  refreshSecurity: () => Promise<void>;
};
const Context = createContext<Auth | null>(null);
export function useInternetIdentity() {
  const value = useContext(Context);
  if (!value) throw new Error("Authentication provider is missing");
  return value;
}
const connectAuth = (id: Identity) =>
  connectBackend(
    import.meta.env.VITE_BACKEND_CANISTER_ID,
    import.meta.env.VITE_BACKEND_HOST || "https://icp-api.io",
    id,
  );

export function InternetIdentityProvider({ children }: PropsWithChildren) {
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [client, setClient] = useState<AuthClient>();
  const [primaryIdentity, setPrimary] = useState<Identity>();
  const [identity, setIdentity] = useState<Identity>();
  const [secondFactorRequired, setRequired] = useState(false);
  const [isInitializing, setInitializing] = useState(true);
  const [isLoggingIn, setLoggingIn] = useState(false);
  const [loginError, setError] = useState<Error>();
  const qc = useQueryClient();
  const authGeneration = useRef(0);
  const authMethod = useRef<"email" | "passkey">(
    localEmailMode ? "email" : "passkey",
  );
  const loadSecurity = useCallback(async (id: Identity) => {
    const generation = ++authGeneration.current;
    setIdentity(undefined);
    setRequired(false);
    setRecoveryCodes([]);
    setPrimary(id);
    setInitializing(true);
    try {
      const actor = await connectAuth(id);
      const status = await actor.getSecondFactorStatus();
      if (generation !== authGeneration.current) return;
      setRequired(status.enabled);
      if (!status.enabled) setIdentity(id);
      setError(undefined);
    } catch (error) {
      if (generation === authGeneration.current)
        setError(error instanceof Error ? error : new Error(String(error)));
    } finally {
      if (generation === authGeneration.current) setInitializing(false);
    }
  }, []);
  useEffect(() => {
    let active = true;
    let idleClient: AuthClient | undefined;
    if (localEmailMode) {
      emailIdentity("session")
        .then(async (id) => {
          if (active && id) await loadSecurity(id);
        })
        .catch(() => {
          /* No persisted email session; show the sign-in form. */
        })
        .finally(() => {
          if (active) setInitializing(false);
        });
      return () => {
        active = false;
      };
    }
    AuthClient.create({
      idleOptions: {
        idleTimeout: 30 * 60 * 1000,
        onIdle: () => {
          qc.clear();
          setIdentity(undefined);
          setPrimary(undefined);
          void idleClient?.logout().then(() => window.location.reload());
        },
      },
    })
      .then(async (auth) => {
        idleClient = auth;
        if (!active) return;
        setClient(auth);
        if (await auth.isAuthenticated())
          await loadSecurity(auth.getIdentity());
        else if (emailAuthEnabled) {
          try {
            const id = await emailIdentity("session");
            if (active && id) {
              authMethod.current = "email";
              await loadSecurity(id);
            }
          } catch {
            /* No saved email session. */
          }
          if (active) setInitializing(false);
        } else setInitializing(false);
      })
      .catch((error) => {
        if (active) {
          setError(error instanceof Error ? error : new Error(String(error)));
          setInitializing(false);
        }
      });
    return () => {
      active = false;
    };
  }, [qc, loadSecurity]);
  useEffect(() => {
    if (!client || !primaryIdentity || authMethod.current === "email") return;
    const timer = window.setInterval(async () => {
      if (!(await client.isAuthenticated())) {
        authGeneration.current += 1;
        await client.logout();
        qc.clear();
        setIdentity(undefined);
        setPrimary(undefined);
        setRequired(false);
        setRecoveryCodes([]);
        setError(
          new Error("Your sign-in session expired. Please sign in again."),
        );
      }
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [client, primaryIdentity, qc]);
  // Session keys remain in memory. Reloads require a new TOTP/recovery verification.
  useEffect(() => {
    if (!identity || identity === primaryIdentity) return;
    const timer = window.setTimeout(
      () => {
        qc.clear();
        setIdentity(undefined);
        setRequired(true);
      },
      29 * 60 * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [identity, primaryIdentity, qc]);
  async function emailLogin(
    action: "signup" | "login" | "verify",
    email: string,
    password: string,
    code?: string,
  ) {
    const generation = authGeneration.current;
    setLoggingIn(true);
    setError(undefined);
    try {
      const id = await emailIdentity(action, { email, password, code });
      if (generation !== authGeneration.current)
        throw new Error("Sign-in changed. Please try again.");
      if (!id) return false;
      authMethod.current = "email";
      qc.clear();
      await loadSecurity(id);
      return true;
    } finally {
      setLoggingIn(false);
    }
  }
  // Email delegations expire after 30 minutes; require a fresh sign-in, not stale requests.
  useEffect(() => {
    if (authMethod.current !== "email" || !primaryIdentity) return;
    const timer = window.setTimeout(
      () => {
        authGeneration.current += 1;
        qc.clear();
        setIdentity(undefined);
        setPrimary(undefined);
        setRequired(false);
        setRecoveryCodes([]);
      },
      29 * 60 * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [primaryIdentity, qc]);
  function login() {
    if (!client) {
      setError(
        new Error("Authentication is not ready. Refresh and try again."),
      );
      return;
    }
    setLoggingIn(true);
    setError(undefined);
    client
      .login({
        identityProvider:
          import.meta.env.VITE_IDENTITY_PROVIDER ||
          "https://identity.internetcomputer.org",
        maxTimeToLive: 8n * 60n * 60n * 1_000_000_000n,
        onSuccess: async () => {
          authMethod.current = "passkey";
          qc.clear();
          await loadSecurity(client.getIdentity());
          setLoggingIn(false);
        },
        onError: (error) => {
          setError(new Error(error || "Sign in cancelled."));
          setLoggingIn(false);
        },
      })
      .catch((error) => {
        setError(error instanceof Error ? error : new Error(String(error)));
        setLoggingIn(false);
      });
  }
  const primaryActor = useCallback(async () => {
    if (!primaryIdentity) throw new Error("Sign in first.");
    return connectAuth(primaryIdentity);
  }, [primaryIdentity]);
  async function sessionKey() {
    const key = Ed25519KeyIdentity.generate();
    const actor = await connectAuth(key);
    await actor.prepareSecondFactorSession();
    return key;
  }
  async function verifySecondFactor(code: string) {
    const generation = authGeneration.current;
    const key = await sessionKey();
    const actor = await primaryActor();
    const result = await actor.verifySecondFactor(
      code.trim().toUpperCase(),
      key.getPrincipal(),
    );
    if ("error" in result) throw new Error(result.error);
    if (generation !== authGeneration.current)
      throw new Error("Sign-in changed. Please try again.");
    qc.clear();
    setIdentity(key);
    setRequired(false);
    setError(undefined);
  }
  async function confirmSecondFactor(code: string) {
    const generation = authGeneration.current;
    const key = await sessionKey();
    const actor = await primaryActor();
    const result = await actor.confirmSecondFactorSetup(
      code.trim(),
      key.getPrincipal(),
    );
    if ("error" in result) throw new Error(result.error);
    if (generation !== authGeneration.current)
      throw new Error("Sign-in changed. Please try again.");
    qc.clear();
    setIdentity(key);
    setRequired(false);
    setRecoveryCodes(result.ok);
    return result.ok;
  }
  async function refreshSecurity() {
    if (primaryIdentity) {
      qc.clear();
      await loadSecurity(primaryIdentity);
    }
  }
  async function clear() {
    authGeneration.current += 1;
    if (primaryIdentity) {
      try {
        await (await connectAuth(primaryIdentity)).revokeSecondFactorSessions();
      } catch {
        /* Local logout still clears credentials when offline. */
      }
    }
    if (emailAuthEnabled)
      await emailRequest("logout", {}).catch(() => {
        /* Clear local state even if offline. */
      });
    await client?.logout();
    setRecoveryCodes([]);
    qc.clear();
    setIdentity(undefined);
    setPrimary(undefined);
    setRequired(false);
  }
  return (
    <Context.Provider
      value={{
        identity,
        primaryIdentity,
        recoveryCodes,
        dismissRecoveryCodes: () => setRecoveryCodes([]),
        userId: primaryIdentity?.getPrincipal().toText() ?? "",
        isAuthenticated:
          !!primaryIdentity && !primaryIdentity.getPrincipal().isAnonymous(),
        isInitializing,
        isLoggingIn,
        secondFactorRequired,
        loginError,
        login,
        emailLogin,
        clear,
        verifySecondFactor,
        confirmSecondFactor,
        primaryActor,
        refreshSecurity,
      }}
    >
      {children}
    </Context.Provider>
  );
}
