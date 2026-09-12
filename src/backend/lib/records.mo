import List "mo:core/List";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import WorkoutTypes "../types/workouts";
import StreakTypes "../types/streak";

module {
  public type PersonalRecord = StreakTypes.PersonalRecord;

  // Derive the personal record for a single exercise given a flat list of workouts
  func recordFromWorkouts(
    exerciseName : Text,
    list : List.List<WorkoutTypes.Workout>,
  ) : ?PersonalRecord {
    let relevant = list.filter(func(w : WorkoutTypes.Workout) : Bool {
      w.exerciseName == exerciseName
    });
    if (relevant.size() == 0) return null;

    var maxWeight : ?Float = null;
    var maxReps : Nat = 0;
    var maxSets : Nat = 0;
    var achievedAt : Int = 0;

    relevant.forEach(func(w : WorkoutTypes.Workout) {
      // Update max weight
      switch (w.weight) {
        case (?wt) {
          switch (maxWeight) {
            case (?mw) { if (wt > mw) { maxWeight := ?wt; achievedAt := w.timestamp } };
            case null { maxWeight := ?wt; achievedAt := w.timestamp };
          };
        };
        case null {};
      };
      // Update max reps
      if (w.reps > maxReps) {
        maxReps := w.reps;
        achievedAt := w.timestamp;
      };
      // Update max sets
      if (w.sets > maxSets) {
        maxSets := w.sets;
        achievedAt := w.timestamp;
      };
    });

    ?{
      exerciseName;
      maxWeight;
      maxReps;
      maxSets;
      achievedAt;
    };
  };

  // Derive all personal records (max weight, reps, sets per exercise) from full history
  public func computeAllRecords(
    workouts : Map.Map<Principal, List.List<WorkoutTypes.Workout>>,
    user : Principal,
  ) : [PersonalRecord] {
    let listOpt = workouts.get(user);
    let list = switch (listOpt) {
      case (?l) l;
      case null return [];
    };
    if (list.size() == 0) return [];

    // Collect unique exercise names
    let nameMap = Map.empty<Text, Bool>();
    list.forEach(func(w : WorkoutTypes.Workout) {
      nameMap.add(w.exerciseName, true)
    });

    let names = nameMap.keys().toArray();
    names.filterMap<Text, PersonalRecord>(func(name) {
      recordFromWorkouts(name, list)
    });
  };

  // Get personal record for a single exercise name
  public func computeRecord(
    workouts : Map.Map<Principal, List.List<WorkoutTypes.Workout>>,
    user : Principal,
    exerciseName : Text,
  ) : ?PersonalRecord {
    let listOpt = workouts.get(user);
    let list = switch (listOpt) {
      case (?l) l;
      case null return null;
    };
    recordFromWorkouts(exerciseName, list);
  };
};
