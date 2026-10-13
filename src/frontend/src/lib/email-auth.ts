import {
  DelegationChain,
  DelegationIdentity,
  Ed25519KeyIdentity,
} from "@icp-sdk/core/identity";
export const localEmailMode = import.meta.env.VITE_LOCAL_AUTH === "true";
export const emailAuthEnabled =
  localEmailMode || import.meta.env.VITE_EMAIL_AUTH === "true";
export type EmailConfig = {
  localTesting: boolean;
  requireVerification: boolean;
  localInbox: boolean;
};
export async function emailRequest(
  path: string,
  body?: Record<string, unknown>,
) {
  const response = await fetch(`/api/auth/${path}`, {
    method: body ? "POST" : "GET",
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Could not connect to sign-in service.");
  return result;
}
export async function emailIdentity(
  path: string,
  credentials: Record<string, unknown> = {},
) {
  const session = Ed25519KeyIdentity.generate();
  const publicKey = Array.from(new Uint8Array(session.getPublicKey().toDer()))
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
  const result = await emailRequest(path, { ...credentials, publicKey });
  if (result.verificationRequired) return undefined;
  return DelegationIdentity.fromDelegation(
    session,
    DelegationChain.fromJSON(JSON.stringify(result.delegation)),
  );
}
