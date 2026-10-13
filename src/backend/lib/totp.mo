import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Blob "mo:core/Blob";
import Nat8 "mo:core/Nat8";
import Text "mo:core/Text";
import Sha256 "mo:sha2/Sha256";

module {
  public func hash(value : Text) : Blob { Sha256.fromBlob(#sha256, value.encodeUtf8()) };
  public func base32(bytes : Blob) : Text {
    let alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567".toArray();
    var buffer = 0; var bits = 0; var result = "";
    for (byte in bytes.vals()) {
      buffer := buffer * 256 + byte.toNat(); bits += 8;
      while (bits >= 5) { bits -= 5; let divisor = 2 ** bits; result #= Text.fromChar(alphabet[(buffer / divisor) % 32]); buffer %= divisor };
    };
    if (bits > 0) result #= Text.fromChar(alphabet[(buffer * (2 ** (5 - bits))) % 32]);
    result;
  };
  public func code(secret : Blob, counter : Nat) : Text {
    let key = secret.toArray();
    let innerPad = Array.tabulate<Nat8>(64, func(i) { (if (i < key.size()) key[i] else 0) ^ 0x36 });
    let outerPad = Array.tabulate<Nat8>(64, func(i) { (if (i < key.size()) key[i] else 0) ^ 0x5c });
    let message = Array.tabulate(8, func(i) { Nat8.fromNat((counter / (256 ** (7 - i))) % 256) });
    let inner = Sha256.fromArray(#sha256, innerPad.concat(message));
    let digest = Sha256.fromArray(#sha256, outerPad.concat(inner.toArray())).toArray();
    let offset = (digest[digest.size() - 1] & 0x0f).toNat();
    let number = ((digest[offset] & 0x7f).toNat() * 16777216 + digest[offset + 1].toNat() * 65536 + digest[offset + 2].toNat() * 256 + digest[offset + 3].toNat()) % 1_000_000;
    let digits = number.toText(); var padded = digits;
    while (padded.size() < 6) padded := "0" # padded;
    padded;
  };
  public func match(secret : Blob, value : Text, counter : Nat, used : ?Nat) : ?Nat {
    if (value.size() != 6) return null;
    for (candidate in [counter, if (counter > 0) Nat.sub(counter, 1) else 0, counter + 1].vals()) {
      let fresh = switch (used) { case (?previous) candidate > previous; case null true };
      if (fresh and code(secret, candidate) == value) return ?candidate;
    };
    null;
  };
};
