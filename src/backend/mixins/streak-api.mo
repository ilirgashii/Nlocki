import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import WorkoutTypes "../types/workouts";
import StreakTypes "../types/streak";
import StreakLib "../lib/streak";
import RecordsLib "../lib/records";

mixin (
  workouts : Map.Map<Principal, List.List<WorkoutTypes.Workout>>,
) {
  // Return the current and longest workout streak for the calling user
  public shared query ({ caller }) func getWorkoutStreak() : async StreakTypes.WorkoutStreak {
    StreakLib.computeStreak(workouts, caller);
  };

  // Return all personal records for the calling user
  public shared query ({ caller }) func getPersonalRecords() : async [StreakTypes.PersonalRecord] {
    RecordsLib.computeAllRecords(workouts, caller);
  };

  // Return the personal record for a specific exercise, or null if none
  public shared query ({ caller }) func getPersonalRecord(
    exerciseName : Text,
  ) : async ?StreakTypes.PersonalRecord {
    RecordsLib.computeRecord(workouts, caller, exerciseName);
  };
};
