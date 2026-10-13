import Runtime "mo:core/Runtime";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import GoalsLib "../lib/goals";
import GoalTypes "../types/goals";

mixin (goals : Map.Map<Principal, GoalTypes.UserGoals>,
  authorize : Principal -> Principal,
) {
  public shared query ({ caller = signer }) func getGoals() : async GoalTypes.UserGoals {
    let caller = authorize(signer);
    GoalsLib.get(goals, caller);
  };

  public shared ({ caller = signer }) func saveGoals(dailyCalorieTarget : Nat, weeklyMinWorkouts : Nat) : async () {
    let caller = authorize(signer);
    if (dailyCalorieTarget < 100 or dailyCalorieTarget > 10000 or weeklyMinWorkouts == 0 or weeklyMinWorkouts > 14) Runtime.trap("Use a calorie target of 100–10000 and 1–14 weekly workouts");
    GoalsLib.save(goals, caller, { dailyCalorieTarget; weeklyMinWorkouts });
  };
};
