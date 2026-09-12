import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import WaterLib "../lib/water";
import WaterTypes "../types/water";

mixin (waterStore : Map.Map<Principal, Map.Map<Text, Nat>>) {
  public shared ({ caller }) func logWater(date : Text, amount : Nat) : async WaterTypes.WaterLog {
    WaterLib.log(waterStore, caller, date, amount);
  };

  public shared query ({ caller }) func getWaterForDate(date : Text) : async WaterTypes.WaterLog {
    WaterLib.forDate(waterStore, caller, date);
  };
};
