import { AuthClient } from "@dfinity/auth-client";
import type { Identity } from "@icp-sdk/core/agent";
import { useQueryClient } from "@tanstack/react-query";
import {
  type PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

type Auth = {
  identity?: Identity;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoggingIn: boolean;
  loginError?: Error;
  login: () => void;
  clear: () => void;
};
const Context = createContext<Auth | null>(null);
export function useInternetIdentity() {
  const value = useContext(Context);
  if (!value) throw new Error("Authentication provider is missing");
  return value;
}
export function InternetIdentityProvider({ children }: PropsWithChildren) {
  const [client, setClient] = useState<AuthClient>();
  const [identity, setIdentity] = useState<Identity>();
  const [isInitializing, setInitializing] = useState(true);
  const [isLoggingIn, setLoggingIn] = useState(false);
  const [loginError, setError] = useState<Error>();
  const qc = useQueryClient();
  useEffect(() => {
    let active = true;
    let idleClient: AuthClient | undefined;
    AuthClient.create({
      idleOptions: {
        idleTimeout: 30 * 60 * 1000,
        onIdle: () => {
          qc.clear();
          setIdentity(undefined);
          void idleClient?.logout().finally(() => window.location.reload());
        },
      },
    })
      .then(async (auth) => {
        idleClient = auth;
        const authenticated = await auth.isAuthenticated();
        if (active) {
          setClient(auth);
          setIdentity(authenticated ? auth.getIdentity() : undefined);
        }
      })
      .catch((error) => {
        if (active)
          setError(error instanceof Error ? error : new Error(String(error)));
      })
      .finally(() => {
        if (active) setInitializing(false);
      });
    return () => {
      active = false;
    };
  }, [qc]);
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
        onSuccess: () => {
          qc.clear();
          setIdentity(client.getIdentity());
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
  async function clear() {
    try {
      await client?.logout();
      qc.clear();
      setIdentity(undefined);
    } catch (error) {
      setError(error instanceof Error ? error : new Error(String(error)));
    }
  }
  return (
    <Context.Provider
      value={{
        identity,
        isAuthenticated: !!identity && !identity.getPrincipal().isAnonymous(),
        isInitializing,
        isLoggingIn,
        loginError,
        login,
        clear,
      }}
    >
      {children}
    </Context.Provider>
  );
}
