import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Types "../types/water";

module {
  public type WaterLog = Types.WaterLog;

  // Returns the per-user water map, creating it if absent
  func getUserMap(
    store : Map.Map<Principal, Map.Map<Text, Nat>>,
    user : Principal,
  ) : Map.Map<Text, Nat> {
    switch (store.get(user)) {
      case (?m) m;
      case null {
        let m = Map.empty<Text, Nat>();
        store.add(user, m);
        m;
      };
    };
  };

  public func log(
    store : Map.Map<Principal, Map.Map<Text, Nat>>,
    user : Principal,
    date : Text,
    amount : Nat,
  ) : WaterLog {
    let waterMap = getUserMap(store, user);
    let existing = switch (waterMap.get(date)) {
      case (?v) v;
      case null 0;
    };
    waterMap.add(date, existing + amount);
    { date; amount = existing + amount };
  };

  public func forDate(
    store : Map.Map<Principal, Map.Map<Text, Nat>>,
    user : Principal,
    date : Text,
  ) : WaterLog {
    let waterMap = getUserMap(store, user);
    let amount = switch (waterMap.get(date)) {
      case (?v) v;
      case null 0;
    };
    { date; amount };
  };
};
