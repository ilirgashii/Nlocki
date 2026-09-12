import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import MealLib "../lib/meals";
import MealTypes "../types/meals";

mixin (
  meals : Map.Map<Principal, List.List<MealTypes.Meal>>,
  nextId : { var value : Nat },
) {
  public shared ({ caller }) func addMeal(entry : MealLib.MealInput) : async MealTypes.Meal {
    let id = nextId.value;
    nextId.value += 1;
    MealLib.add(meals, caller, id, entry);
  };

  public shared ({ caller }) func deleteMeal(id : Nat) : async Bool {
    MealLib.delete(meals, caller, id);
  };

  public shared query ({ caller }) func getMealsForDate(date : Text) : async [MealTypes.Meal] {
    MealLib.forDate(meals, caller, date);
  };

  public shared query ({ caller }) func getMealsInRange(startDate : Text, endDate : Text) : async [MealTypes.Meal] {
    MealLib.inRange(meals, caller, startDate, endDate);
  };
};
