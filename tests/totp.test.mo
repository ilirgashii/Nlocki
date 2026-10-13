import Totp "../src/backend/lib/totp";
let key = "12345678901234567890123456789012".encodeUtf8();
// Published RFC 6238 SHA-256 vectors, reduced to the configured six digits.
for ((seconds, expected) in [(59, "119246"), (1111111109, "084774"), (1111111111, "062674"), (1234567890, "819424"), (2000000000, "698825"), (20000000000, "737706")].vals()) {
  assert Totp.code(key, seconds / 30) == expected;
};
assert Totp.base32("foo".encodeUtf8()) == "MZXW6";
assert Totp.match(key, "119246", 1, null) == ?1;
assert Totp.match(key, "119246", 1, ?1) == null;
assert Totp.match(key, "abcdef", 1, null) == null;
