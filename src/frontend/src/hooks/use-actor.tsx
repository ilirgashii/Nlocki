import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { type BackendActor, connectBackend } from "../lib/backend-client";
import { useInternetIdentity } from "./use-auth";

export function useActor() {
  const { identity } = useInternetIdentity();
  const userId = identity?.getPrincipal().toText() ?? "";
  const connection = useQuery({
    queryKey: ["backend-connection", userId],
    enabled: !!identity,
    queryFn: () =>
      connectBackend(
        import.meta.env.VITE_BACKEND_CANISTER_ID,
        import.meta.env.VITE_BACKEND_HOST || "https://icp-api.io",
        identity!,
      ),
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
  return { actor: connection.data, userId, connection };
}
export function useBackendQuery<T>(
  key: unknown[],
  read: (actor: BackendActor) => Promise<T>,
  enabled = true,
  poll?: number,
) {
  const { actor, userId } = useActor();
  return useQuery<T>({
    queryKey: ["account", userId, ...key],
    enabled: !!actor && enabled,
    queryFn: () => read(actor!),
    refetchInterval: poll,
  });
}
export function useBackendMutation<T, V>(
  write: (actor: BackendActor, value: V) => Promise<T>,
) {
  const { actor, userId } = useActor();
  const qc = useQueryClient();
  return useMutation<T, Error, V>({
    mutationFn: (value) => {
      if (!actor) throw new Error("Connect to the backend and sign in first.");
      return write(actor, value);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["account", userId] }),
    onError: (error) => toast.error(error.message),
  });
}
