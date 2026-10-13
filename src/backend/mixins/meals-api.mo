import Validation "../lib/validation";
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
  authorize : Principal -> Principal,
) {
  type MealView = MealTypes.Meal and { details : ?Text };
  func mealsView(record : MealTypes.Meal) : MealView { { record with details = details.get(record.id) } };
  func saveMealsDetails(id : Nat, value : ?Text) {
    switch (value) { case (?text) { if (text.size() > 10_000) Runtime.trap("Record details are too large"); details.add(id, text) }; case null {} };
  };

  public shared ({ caller = signer }) func addMeal(entry : MealLib.MealInput) : async MealView {
    let caller = authorize(signer);
    if (entry.calories > 100000 or entry.protein > 10000 or entry.carbs > 10000 or entry.fat > 10000) Runtime.trap("Invalid nutrition values");
    Validation.date(entry.date); Validation.text(entry.mealName, 1, 160, "Entry name");
    let id = nextId.value;
    nextId.value += 1;
    let record = MealLib.add(meals, caller, id, entry);
    saveMealsDetails(id, entry.details);
    mealsView(record);
  };

  public shared ({ caller = signer }) func deleteMeal(id : Nat) : async Bool {
    let caller = authorize(signer);
    let deleted = MealLib.delete(meals, caller, id);
    if (deleted) details.remove(id);
    deleted;
  };

  public shared query ({ caller = signer }) func getMealsForDate(date : Text) : async [MealView] {
    let caller = authorize(signer);
    MealLib.forDate(meals, caller, date).map(mealsView);
  };

  public shared query ({ caller = signer }) func getMealsInRange(startDate : Text, endDate : Text) : async [MealView] {
    let caller = authorize(signer);
    MealLib.inRange(meals, caller, startDate, endDate).map(mealsView);
  };
};
