import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
module {
  public func text(value : Text, min : Nat, max : Nat, fieldName : Text) {
    if (value.size() < min or value.size() > max) Runtime.trap(fieldName # " has an invalid length");
  };
  public func weight(value : ?Float) {
    switch (value) { case (?v) { if (v != v or v < 0 or v > 5000) Runtime.trap("Invalid exercise weight") }; case null {} };
  };
  public func date(value : Text) {
    let chars = value.toArray();
    if (chars.size() != 10) Runtime.trap("Use a YYYY-MM-DD date");
    var index = 0;
    for (c in chars.vals()) {
      if (index == 4 or index == 7) { if (c != '-') Runtime.trap("Invalid date") } else if (c < '0' or c > '9') Runtime.trap("Invalid date");
      index += 1;
    };
    let year = Text.fromArray(chars.sliceToArray(0, 4)).toNat().unwrap();
    let month = Text.fromArray(chars.sliceToArray(5, 7)).toNat().unwrap();
    let day = Text.fromArray(chars.sliceToArray(8, 10)).toNat().unwrap();
    if (year < 1900 or year > 2200 or month < 1 or month > 12) Runtime.trap("Invalid date");
    let leap = year % 4 == 0 and (year % 100 != 0 or year % 400 == 0);
    let days = [31, if (leap) 29 else 28, 31,30,31,30,31,31,30,31,30,31];
    if (day < 1 or day > days[month - 1]) Runtime.trap("Invalid date");
  };
};
