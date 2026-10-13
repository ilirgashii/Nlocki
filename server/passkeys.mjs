import { randomBytes, timingSafeEqual } from "node:crypto";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
export function createPasskeys({
  pool,
  local,
  origins,
  sessionUser,
  passwordHash,
  delegation,
  setSession,
  hash,
  rate,
}) {
  const rpID = process.env.PASSKEY_RP_ID || new URL(origins[0]).hostname;
  const cookie = (req) =>
    (req.headers.cookie || "")
      .split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith("nlocki_challenge="))
      ?.slice(17);
  const fail = () => {
    throw Object.assign(
      new Error("Could not verify this passkey. Try email sign-in."),
      { status: 401 },
    );
  };
  async function challenge(res, user, kind, value) {
    const token = randomBytes(32).toString("hex");
    await pool.query("DELETE FROM passkey_challenges WHERE expires<$1", [
      Date.now(),
    ]);
    await pool.query("INSERT INTO passkey_challenges VALUES($1,$2,$3,$4,$5)", [
      hash(token),
      user.id,
      kind,
      value,
      Date.now() + 300000,
    ]);
    res.setHeader(
      "Set-Cookie",
      `nlocki_challenge=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=300${local ? "" : "; Secure"}`,
    );
  }
  async function pending(req, user, kind) {
    const token = cookie(req);
    if (!token) fail();
    const r = (
      await pool.query(
        "DELETE FROM passkey_challenges WHERE token=$1 AND user_id=$2 AND kind=$3 AND expires>$4 RETURNING challenge",
        [hash(token), user.id, kind, Date.now()],
      )
    ).rows[0];
    if (!r) fail();
    return r.challenge;
  }
  async function registration(req, res, input, perform) {
    if (local)
      throw Object.assign(
        new Error("Passkeys are for the HTTPS online deployment."),
        { status: 404 },
      );
    const user = await sessionUser(req);
    if (!user) fail();
    if (input?.method !== "registerPasskey") fail();
    await perform(req, input);
    const [password, response] = input.args;
    const calculated = await passwordHash(password, user.salt);
    if (
      !timingSafeEqual(
        Buffer.from(calculated, "hex"),
        Buffer.from(user.password, "hex"),
      )
    )
      fail();
    await rate(`passkey:${user.id}`, 10, 300000);
    if (!response) {
      const credentials = (
        await pool.query("SELECT id FROM passkeys WHERE user_id=$1", [user.id])
      ).rows;
      const options = await generateRegistrationOptions({
        rpName: "Nlock’i",
        rpID,
        userID: new TextEncoder().encode(user.id),
        userName: user.email,
        attestationType: "none",
        excludeCredentials: credentials.map((r) => ({ id: r.id })),
        authenticatorSelection: {
          residentKey: "required",
          userVerification: "required",
        },
      });
      await challenge(res, user, "register", options.challenge);
      return options;
    }
    const expected = await pending(req, user, "register");
    const result = await verifyRegistrationResponse({
      response,
      expectedChallenge: expected,
      expectedOrigin: origins,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
    if (!result.verified || !result.registrationInfo) fail();
    const credential = result.registrationInfo.credential;
    await pool.query(
      "INSERT INTO passkeys(id,user_id,public_key,counter,transports) VALUES($1,$2,$3,$4,$5)",
      [
        credential.id,
        user.id,
        Buffer.from(credential.publicKey),
        credential.counter,
        JSON.stringify(credential.transports || []),
      ],
    );
    return { registered: true };
  }
  async function login(req, res, path, input) {
    if (local)
      throw Object.assign(
        new Error("Passkeys are for the HTTPS online deployment."),
        { status: 404 },
      );
    const email = String(input.email || "")
      .trim()
      .toLowerCase();
    await rate(`passkey-login:${hash(email)}`, 10, 300000);
    const user = (
      await pool.query("SELECT * FROM users WHERE email=$1 AND verified=1", [
        email,
      ])
    ).rows[0];
    if (!user) fail();
    if (path.endsWith("/options")) {
      const creds = (
        await pool.query(
          "SELECT id,transports FROM passkeys WHERE user_id=$1",
          [user.id],
        )
      ).rows;
      if (!creds.length) fail();
      const options = await generateAuthenticationOptions({
        rpID,
        userVerification: "required",
        allowCredentials: creds.map((r) => ({
          id: r.id,
          transports: r.transports,
        })),
      });
      await challenge(res, user, "login", options.challenge);
      return options;
    }
    const expected = await pending(req, user, "login");
    const stored = (
      await pool.query("SELECT * FROM passkeys WHERE id=$1 AND user_id=$2", [
        input.response?.id,
        user.id,
      ])
    ).rows[0];
    if (!stored) fail();
    const result = await verifyAuthenticationResponse({
      response: input.response,
      expectedChallenge: expected,
      expectedOrigin: origins,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: stored.id,
        publicKey: new Uint8Array(stored.public_key),
        counter: Number(stored.counter),
        transports: stored.transports,
      },
    });
    if (!result.verified) fail();
    await pool.query("UPDATE passkeys SET counter=$1 WHERE id=$2", [
      result.authenticationInfo.newCounter,
      stored.id,
    ]);
    const response = await delegation(user, input);
    await setSession(res, user);
    return response;
  }
  return { registration, login };
}
