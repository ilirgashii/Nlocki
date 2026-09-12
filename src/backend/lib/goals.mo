import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Types "../types/goals";

module {
  public type UserGoals = Types.UserGoals;

  let defaultGoals : UserGoals = {
    dailyCalorieTarget = 2000;
    weeklyMinWorkouts = 3;
  };

  public func get(
    store : Map.Map<Principal, UserGoals>,
    user : Principal,
  ) : UserGoals {
    switch (store.get(user)) {
      case (?g) g;
      case null defaultGoals;
    };
  };

  public func save(
    store : Map.Map<Principal, UserGoals>,
    user : Principal,
    goals : UserGoals,
  ) {
    store.add(user, goals);
  };
};
