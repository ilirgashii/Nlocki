import Blob "mo:core/Blob";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Random "mo:core/Random";
import Runtime "mo:core/Runtime";
import Totp "../lib/totp";

mixin (
  factors : Map.Map<Principal, { secret : Blob; used : ?Nat; recovery : [Blob] }>,
  pending : Map.Map<Principal, { secret : Blob; expires : Int }>,
  sessions : Map.Map<Principal, { owner : Principal; expires : Int }>,
  attempts : Map.Map<Principal, { count : Nat; lockedUntil : Int }>,
  registeredKeys : Map.Map<Principal, Int>,
  knownAccount : Principal -> Bool,
) {
  func sessionOwner(key : Principal) : Principal { switch (sessions.get(key)) { case (?session) session.owner; case null key } };
  func securityPrimary(caller : Principal) {
    if (caller.isAnonymous()) Runtime.trap("Sign in required");
    switch (sessions.get(caller)) { case (?_) Runtime.trap("Use your primary identity for security settings"); case null {} };
  };
  func securityRate(caller : Principal) : Bool {
    switch (attempts.get(caller)) { case (?a) a.lockedUntil <= Time.now(); case null true };
  };
  func securityFailure(caller : Principal) {
    let count = switch (attempts.get(caller)) { case (?a) if (a.lockedUntil > 0 and a.lockedUntil <= Time.now()) 1 else a.count + 1; case null 1 };
    attempts.add(caller, { count; lockedUntil = if (count >= 5) Time.now() + 300_000_000_000 else 0 });
  };
  func securityCounter() : Nat { (Time.now() / 30_000_000_000).toNat() };
  func securitySession(owner : Principal, target : Principal) {
    if (knownAccount(target)) Runtime.trap("Use a fresh session key");
    switch (registeredKeys.get(target)) { case (?expires) { if (expires <= Time.now()) Runtime.trap("Session key registration expired") }; case null Runtime.trap("Register the session key first") };
    if (target.isAnonymous() or target == owner) Runtime.trap("Use a fresh session key");
    switch (factors.get(target)) { case (?_) Runtime.trap("Invalid session key"); case null {} };
    switch (sessions.get(target)) { case (?_) Runtime.trap("Session key already used"); case null {} };
    // Retain revoked keys as tombstones so they cannot become new account identities.
    // Only the newest authenticated session remains valid.
    let old = sessions.entries().filter(func((_, session)) { session.owner == owner or session.expires <= Time.now() }).toArray();
    for ((key, _) in old.vals()) sessions.add(key, { owner = sessionOwner(key); expires = 0 });
    registeredKeys.remove(target);
    sessions.add(target, { owner; expires = Time.now() + 1_800_000_000_000 });
  };
  public shared ({ caller }) func prepareSecondFactorSession() : async () {
    if (caller.isAnonymous() or knownAccount(caller)) Runtime.trap("Use a fresh session key");
    switch (factors.get(caller)) { case (?_) Runtime.trap("Use a fresh session key"); case null {} };
    switch (sessions.get(caller)) { case (?_) Runtime.trap("Session key already used"); case null {} };
    let expired = registeredKeys.entries().filter(func((_, expiry)) { expiry <= Time.now() }).toArray();
    for ((key, _) in expired.vals()) registeredKeys.remove(key);
    if (registeredKeys.size() >= 10_000) Runtime.trap("Try again later");
    registeredKeys.add(caller, Time.now() + 600_000_000_000);
  };
  public shared query ({ caller }) func getSecondFactorStatus() : async { enabled : Bool } {
    securityPrimary(caller);
    { enabled = switch (factors.get(caller)) { case (?_) true; case null false } };
  };
  public shared ({ caller }) func beginSecondFactorSetup() : async { secret : Text } {
    securityPrimary(caller);
    switch (factors.get(caller)) { case (?_) Runtime.trap("Two-factor authentication is already enabled"); case null {} };
    let bytes = await Random.blob();
    switch (factors.get(caller)) { case (?_) Runtime.trap("Two-factor authentication is already enabled"); case null {} };
    pending.add(caller, { secret = bytes; expires = Time.now() + 600_000_000_000 });
    { secret = Totp.base32(bytes) };
  };
  public shared ({ caller }) func confirmSecondFactorSetup(code : Text, sessionKey : Principal) : async { #ok : [Text]; #error : Text } {
    securityPrimary(caller);
    if (not securityRate(caller)) return #error("Too many attempts. Wait five minutes.");
    let setup = switch (pending.get(caller)) { case (?p) p; case null return #error("Start setup again") };
    if (setup.expires < Time.now()) return #error("Setup expired. Start again.");
    let counter = switch (Totp.match(setup.secret, code, securityCounter(), null)) { case (?c) c; case null { securityFailure(caller); return #error("Invalid authenticator code") } };
    // Generate high-entropy recovery codes using IC randomness; return them only once.
    let random = await Random.blob();
    let current = switch (pending.get(caller)) { case (?p) p; case null return #error("Setup changed. Start again.") };
    if (current.secret != setup.secret or current.expires < Time.now()) return #error("Setup changed. Start again.");
    let bytes = random.toArray();
    let recovery = [0,1,2,3].map(func(index) { Totp.base32(Blob.fromArray(bytes.sliceToArray(index * 8, index * 8 + 8))) });
    securitySession(caller, sessionKey);
    factors.add(caller, { secret = setup.secret; used = ?counter; recovery = recovery.map(Totp.hash) });
    pending.remove(caller); attempts.remove(caller);
    #ok(recovery);
  };
  public shared ({ caller }) func verifySecondFactor(code : Text, sessionKey : Principal) : async { #ok; #error : Text } {
    securityPrimary(caller);
    if (not securityRate(caller)) return #error("Too many attempts. Wait five minutes.");
    let factor = switch (factors.get(caller)) { case (?f) f; case null return #error("Two-factor authentication is not enabled") };
    let counter = Totp.match(factor.secret, code, securityCounter(), factor.used);
    let recoveryHash = Totp.hash(code);
    let recovery = factor.recovery.find(func(hash) { hash == recoveryHash });
    if (counter == null and recovery == null) { securityFailure(caller); return #error("Invalid or already used code") };
    securitySession(caller, sessionKey);
    factors.add(caller, { factor with used = switch (counter) { case (?c) ?c; case null factor.used }; recovery = factor.recovery.filter(func(hash) { hash != recoveryHash }) });
    attempts.remove(caller);
    #ok;
  };
  public shared ({ caller }) func disableSecondFactor(code : Text) : async { #ok; #error : Text } {
    securityPrimary(caller);
    if (not securityRate(caller)) return #error("Too many attempts. Wait five minutes.");
    let factor = switch (factors.get(caller)) { case (?f) f; case null return #ok };
    if (Totp.match(factor.secret, code, securityCounter(), factor.used) == null and factor.recovery.find(func(hash) { hash == Totp.hash(code) }) == null) {
      securityFailure(caller); return #error("Invalid or already used code");
    };
    factors.remove(caller); pending.remove(caller); attempts.remove(caller);
    let old = sessions.entries().filter(func((_, session)) { session.owner == caller }).toArray();
    for ((key, _) in old.vals()) sessions.add(key, { owner = sessionOwner(key); expires = 0 });
    #ok;
  };
  public shared ({ caller }) func revokeSecondFactorSessions() : async () {
    securityPrimary(caller);
    let old = sessions.entries().filter(func((_, session)) { session.owner == caller }).toArray();
    for ((key, _) in old.vals()) sessions.add(key, { owner = sessionOwner(key); expires = 0 });
  };
};
