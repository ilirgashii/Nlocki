import Csv "../lib/csv";
import Runtime "mo:core/Runtime";
import List "mo:core/List";
import Map "mo:core/Map";
import Float "mo:core/Float";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import MealTypes "../types/meals";
import WorkoutTypes "../types/workouts";
import MealsLib "../lib/meals";
import WorkoutsLib "../lib/workouts";

mixin (
  meals : Map.Map<Principal, List.List<MealTypes.Meal>>,
  workouts : Map.Map<Principal, List.List<WorkoutTypes.Workout>>,
  authorize : Principal -> Principal,
) {

  /// Export nutrition log as CSV for the calling user.
  /// Returns header row + one row per meal.
  /// Columns: date,meal_name,calories,protein,carbs,fat
  public shared query ({ caller = signer }) func exportNutritionCSV(startDate : Text, endDate : Text) : async Text {
    let caller = authorize(signer);
    let rows = MealsLib.inRange(meals, caller, startDate, endDate);
    var csv = "date,meal_name,calories,protein,carbs,fat\n";
    for (m in rows.vals()) {
      csv := csv # m.date # "," # Csv.field(m.mealName) # "," # m.calories.toText() # "," # m.protein.toText() # "," # m.carbs.toText() # "," # m.fat.toText() # "\n";
    };
    csv;
  };

  /// Export fitness log as CSV for the calling user.
  /// Returns header row + one row per workout.
  /// Columns: date,exercise_name,sets,reps,weight
  public shared query ({ caller = signer }) func exportFitnessCSV(startDate : Text, endDate : Text) : async Text {
    let caller = authorize(signer);
    let rows = WorkoutsLib.inRange(workouts, caller, startDate, endDate);
    var csv = "date,exercise_name,sets,reps,weight\n";
    for (w in rows.vals()) {
      let weightText = switch (w.weight) {
        case (?wt) wt.toText();
        case null "0";
      };
      csv := csv # w.date # "," # Csv.field(w.exerciseName) # "," # w.sets.toText() # "," # w.reps.toText() # "," # weightText # "\n";
    };
    csv;
  };
};
