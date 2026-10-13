import Runtime "mo:core/Runtime";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import WorkoutLib "../lib/workouts";
import WorkoutTypes "../types/workouts";

mixin (
  workouts : Map.Map<Principal, List.List<WorkoutTypes.Workout>>,
  nextId : { var value : Nat },
  details : Map.Map<Nat, Text>,
) {
  type WorkoutView = WorkoutTypes.Workout and { details : ?Text };
  func workoutsView(record : WorkoutTypes.Workout) : WorkoutView { { record with details = details.get(record.id) } };
  func saveWorkoutsDetails(id : Nat, value : ?Text) {
    switch (value) { case (?text) { if (text.size() > 10_000) Runtime.trap("Record details are too large"); details.add(id, text) }; case null {} };
  };

  public shared ({ caller }) func addWorkout(entry : WorkoutLib.WorkoutInput) : async WorkoutView {
    if (caller.isAnonymous()) Runtime.trap("Sign in required");
    let id = nextId.value;
    nextId.value += 1;
    let record = WorkoutLib.add(workouts, caller, id, entry);
    saveWorkoutsDetails(id, entry.details);
    workoutsView(record);
  };

  public shared ({ caller }) func updateWorkout(id : Nat, entry : WorkoutLib.WorkoutInput) : async ?WorkoutView {
    if (caller.isAnonymous()) Runtime.trap("Sign in required");
    switch (WorkoutLib.update(workouts, caller, id, entry)) { case (?record) { saveWorkoutsDetails(id, entry.details); ?workoutsView(record) }; case null null };
  };

  public shared ({ caller }) func deleteWorkout(id : Nat) : async Bool {
    if (caller.isAnonymous()) Runtime.trap("Sign in required");
    let deleted = WorkoutLib.delete(workouts, caller, id);
    if (deleted) details.remove(id);
    deleted;
  };

  public shared query ({ caller }) func getWorkoutsForDate(date : Text) : async [WorkoutView] {
    if (caller.isAnonymous()) Runtime.trap("Sign in required");
    WorkoutLib.forDate(workouts, caller, date).map(workoutsView);
  };

  public shared query ({ caller }) func getWorkoutsInRange(startDate : Text, endDate : Text) : async [WorkoutView] {
    if (caller.isAnonymous()) Runtime.trap("Sign in required");
    WorkoutLib.inRange(workouts, caller, startDate, endDate).map(workoutsView);
  };
};
