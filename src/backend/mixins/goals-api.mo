import Runtime "mo:core/Runtime";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import GoalsLib "../lib/goals";
import GoalTypes "../types/goals";

mixin (goals : Map.Map<Principal, GoalTypes.UserGoals>) {
  public shared query ({ caller }) func getGoals() : async GoalTypes.UserGoals {
    if (caller.isAnonymous()) Runtime.trap("Sign in required");
    GoalsLib.get(goals, caller);
  };

  public shared ({ caller }) func saveGoals(dailyCalorieTarget : Nat, weeklyMinWorkouts : Nat) : async () {
    if (caller.isAnonymous()) Runtime.trap("Sign in required");
    GoalsLib.save(goals, caller, { dailyCalorieTarget; weeklyMinWorkouts });
  };
};
