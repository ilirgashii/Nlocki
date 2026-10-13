import type { Identity } from "@icp-sdk/core/agent";
import { Principal } from "@icp-sdk/core/principal";
import type { BackendActor } from "./backend-client";
export const httpBackend = import.meta.env.VITE_BACKEND_MODE === "http";
function encode(value: unknown): unknown {
  if (typeof value === "bigint") return { $bigint: value.toString() };
  if (value && typeof (value as Principal).toText === "function")
    return { $principal: (value as Principal).toText() };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, encode(v)]),
    );
  return value;
}
function decode(value: any): any {
  if (value?.$bigint) return BigInt(value.$bigint);
  if (value?.$principal) return Principal.fromText(value.$principal);
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, decode(v)]),
    );
  return value;
}
export async function httpCall(
  identity: Identity,
  method: string,
  args: unknown[],
  path = "/api/rpc",
) {
  const packet: Record<string, unknown> = {
    method,
    args: encode(args),
    key: identity.getPrincipal().toText(),
    time: Date.now(),
    nonce: Array.from(crypto.getRandomValues(new Uint8Array(16)), (v) =>
      v.toString(16).padStart(2, "0"),
    ).join(""),
  };
  // Fresh Ed25519 keys used after TOTP prove possession on every protected request.
  const signer = identity as Identity & {
    sign?: (v: Uint8Array) => Promise<ArrayBuffer>;
    getPublicKey?: () => { toDer: () => ArrayBuffer };
  };
  if (signer.sign && signer.getPublicKey) {
    const payload = new TextEncoder().encode(JSON.stringify(packet));
    try {
      packet.publicKey = Array.from(
        new Uint8Array(signer.getPublicKey().toDer()),
        (v) => v.toString(16).padStart(2, "0"),
      ).join("");
      packet.signature = Array.from(
        new Uint8Array(await signer.sign(payload)),
        (v) => v.toString(16).padStart(2, "0"),
      ).join("");
    } catch {
      /* Primary cookie-authenticated delegations need no secondary proof. */
    }
  }
  const response = await fetch(path, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(packet),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Request failed.");
  return path === "/api/rpc" ? decode(result.result) : result;
}
export function connectHttp(identity: Identity): BackendActor {
  return new Proxy(
    {},
    {
      get(_target, method) {
        if (method === "then") return undefined;
        return (...args: unknown[]) => httpCall(identity, String(method), args);
      },
    },
  ) as BackendActor;
}
