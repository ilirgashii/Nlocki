import List "mo:core/List";
import Map "mo:core/Map";
import Float "mo:core/Float";
import Int64 "mo:core/Int64";
import Nat64 "mo:core/Nat64";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import TaskTypes "../types/tasks";
import WorkoutTypes "../types/workouts";
import MealTypes "../types/meals";

mixin (
  tasks : Map.Map<Principal, List.List<TaskTypes.Task>>,
  workouts : Map.Map<Principal, List.List<WorkoutTypes.Workout>>,
  meals : Map.Map<Principal, List.List<MealTypes.Meal>>,
  waterStore : Map.Map<Principal, Map.Map<Text, Nat>>,
) {
  public shared query ({ caller }) func getDailySummary(date : Text) : async {
    taskCompletionPct : Float;
    totalCalories : Nat;
    totalProtein : Nat;
    totalCarbs : Nat;
    totalFat : Nat;
    waterMl : Nat;
    workoutCount : Nat;
  } {
    let userTasks = switch (tasks.get(caller)) {
      case (?list) list.filter(func(t : TaskTypes.Task) : Bool { t.date == date });
      case null List.empty<TaskTypes.Task>();
    };
    let taskCount = userTasks.size();
    let completedCount = userTasks.filter(func(t : TaskTypes.Task) : Bool { t.completed }).size();
    let taskCompletionPct : Float = if (taskCount == 0) { 0.0 } else {
      Float.fromInt64(Int64.fromNat64(Nat64.fromNat(completedCount))) / Float.fromInt64(Int64.fromNat64(Nat64.fromNat(taskCount))) * 100.0
    };

    let workoutCount = switch (workouts.get(caller)) {
      case (?list) list.filter(func(w : WorkoutTypes.Workout) : Bool { w.date == date }).size();
      case null 0;
    };

    let dayMeals = switch (meals.get(caller)) {
      case (?list) list.filter(func(m : MealTypes.Meal) : Bool { m.date == date });
      case null List.empty<MealTypes.Meal>();
    };
    let totalCalories = dayMeals.foldLeft(0, func(acc : Nat, m : MealTypes.Meal) : Nat { acc + m.calories });
    let totalProtein = dayMeals.foldLeft(0, func(acc : Nat, m : MealTypes.Meal) : Nat { acc + m.protein });
    let totalCarbs = dayMeals.foldLeft(0, func(acc : Nat, m : MealTypes.Meal) : Nat { acc + m.carbs });
    let totalFat = dayMeals.foldLeft(0, func(acc : Nat, m : MealTypes.Meal) : Nat { acc + m.fat });

    let waterMl = switch (waterStore.get(caller)) {
      case (?waterMap) switch (waterMap.get(date)) {
        case (?v) v;
        case null 0;
      };
      case null 0;
    };

    { taskCompletionPct; totalCalories; totalProtein; totalCarbs; totalFat; waterMl; workoutCount };
  };

  /// Returns aggregated stats for a week containing the given date range (7-day window)
  public shared query ({ caller }) func getWeeklySummary(startDate : Text, endDate : Text) : async {
    workoutsThisWeek : Nat;
    avgCaloriesPerDay : Float;
    avgWaterPerDay : Float;
  } {
    let workoutsThisWeek = switch (workouts.get(caller)) {
      case (?list) list.filter(func(w : WorkoutTypes.Workout) : Bool {
        w.date >= startDate and w.date <= endDate
      }).size();
      case null 0;
    };

    let dayMeals = switch (meals.get(caller)) {
      case (?list) list.filter(func(m : MealTypes.Meal) : Bool {
        m.date >= startDate and m.date <= endDate
      });
      case null List.empty<MealTypes.Meal>();
    };
    let totalCalories = dayMeals.foldLeft(0, func(acc : Nat, m : MealTypes.Meal) : Nat { acc + m.calories });

    let totalWaterMl = switch (waterStore.get(caller)) {
      case (?waterMap) {
        var total : Nat = 0;
        waterMap.forEach(func(date, ml) {
          if (date >= startDate and date <= endDate) total += ml;
        });
        total;
      };
      case null 0;
    };

    // Compute number of days in range (simple: count distinct dates with data, minimum 1)
    let daysInRange : Float = 7.0;
    let avgCaloriesPerDay : Float = Float.fromInt64(Int64.fromNat64(Nat64.fromNat(totalCalories))) / daysInRange;
    let avgWaterPerDay : Float = Float.fromInt64(Int64.fromNat64(Nat64.fromNat(totalWaterMl))) / daysInRange;

    { workoutsThisWeek; avgCaloriesPerDay; avgWaterPerDay };
  };
};
