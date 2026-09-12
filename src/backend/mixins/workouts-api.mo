import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import WorkoutLib "../lib/workouts";
import WorkoutTypes "../types/workouts";

mixin (
  workouts : Map.Map<Principal, List.List<WorkoutTypes.Workout>>,
  nextId : { var value : Nat },
) {
  public shared ({ caller }) func addWorkout(entry : WorkoutLib.WorkoutInput) : async WorkoutTypes.Workout {
    let id = nextId.value;
    nextId.value += 1;
    WorkoutLib.add(workouts, caller, id, entry);
  };

  public shared ({ caller }) func deleteWorkout(id : Nat) : async Bool {
    WorkoutLib.delete(workouts, caller, id);
  };

  public shared query ({ caller }) func getWorkoutsForDate(date : Text) : async [WorkoutTypes.Workout] {
    WorkoutLib.forDate(workouts, caller, date);
  };

  public shared query ({ caller }) func getWorkoutsInRange(startDate : Text, endDate : Text) : async [WorkoutTypes.Workout] {
    WorkoutLib.inRange(workouts, caller, startDate, endDate);
  };
};
