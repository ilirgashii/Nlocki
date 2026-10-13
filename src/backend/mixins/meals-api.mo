import Runtime "mo:core/Runtime";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import MealLib "../lib/meals";
import MealTypes "../types/meals";

mixin (
  meals : Map.Map<Principal, List.List<MealTypes.Meal>>,
  nextId : { var value : Nat },
  details : Map.Map<Nat, Text>,
) {
  type MealView = MealTypes.Meal and { details : ?Text };
  func mealsView(record : MealTypes.Meal) : MealView { { record with details = details.get(record.id) } };
  func saveMealsDetails(id : Nat, value : ?Text) {
    switch (value) { case (?text) { if (text.size() > 10_000) Runtime.trap("Record details are too large"); details.add(id, text) }; case null {} };
  };

  public shared ({ caller }) func addMeal(entry : MealLib.MealInput) : async MealView {
    if (caller.isAnonymous()) Runtime.trap("Sign in required");
    let id = nextId.value;
    nextId.value += 1;
    let record = MealLib.add(meals, caller, id, entry);
    saveMealsDetails(id, entry.details);
    mealsView(record);
  };

  public shared ({ caller }) func deleteMeal(id : Nat) : async Bool {
    if (caller.isAnonymous()) Runtime.trap("Sign in required");
    let deleted = MealLib.delete(meals, caller, id);
    if (deleted) details.remove(id);
    deleted;
  };

  public shared query ({ caller }) func getMealsForDate(date : Text) : async [MealView] {
    if (caller.isAnonymous()) Runtime.trap("Sign in required");
    MealLib.forDate(meals, caller, date).map(mealsView);
  };

  public shared query ({ caller }) func getMealsInRange(startDate : Text, endDate : Text) : async [MealView] {
    if (caller.isAnonymous()) Runtime.trap("Sign in required");
    MealLib.inRange(meals, caller, startDate, endDate).map(mealsView);
  };
};
