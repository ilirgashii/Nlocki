import Validation "../lib/validation";
import Runtime "mo:core/Runtime";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import WaterLib "../lib/water";
import WaterTypes "../types/water";

mixin (waterStore : Map.Map<Principal, Map.Map<Text, Nat>>,
  authorize : Principal -> Principal,
) {
  public shared ({ caller = signer }) func logWater(date : Text, amount : Nat) : async WaterTypes.WaterLog {
    let caller = authorize(signer);
    Validation.date(date); if (amount == 0 or amount > 10_000) Runtime.trap("Water amount must be 1–10000 ml");
    WaterLib.log(waterStore, caller, date, amount);
  };

  public shared query ({ caller = signer }) func getWaterForDate(date : Text) : async WaterTypes.WaterLog {
    let caller = authorize(signer);
    WaterLib.forDate(waterStore, caller, date);
  };
};
