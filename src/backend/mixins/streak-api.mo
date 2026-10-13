import Runtime "mo:core/Runtime";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import WorkoutTypes "../types/workouts";
import StreakTypes "../types/streak";
import StreakLib "../lib/streak";
import RecordsLib "../lib/records";

mixin (
  workouts : Map.Map<Principal, List.List<WorkoutTypes.Workout>>,
  authorize : Principal -> Principal,
) {
  // Return the current and longest workout streak for the calling user
  public shared query ({ caller = signer }) func getWorkoutStreak() : async StreakTypes.WorkoutStreak {
    let caller = authorize(signer);
    StreakLib.computeStreak(workouts, caller);
  };

  // Return all personal records for the calling user
  public shared query ({ caller = signer }) func getPersonalRecords() : async [StreakTypes.PersonalRecord] {
    let caller = authorize(signer);
    RecordsLib.computeAllRecords(workouts, caller);
  };

  // Return the personal record for a specific exercise, or null if none
  public shared query ({ caller = signer }) func getPersonalRecord(
    exerciseName : Text,
  ) : async ?StreakTypes.PersonalRecord {
    let caller = authorize(signer);
    RecordsLib.computeRecord(workouts, caller, exerciseName);
  };
};
