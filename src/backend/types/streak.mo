import CommonTypes "common";

module {
  public type Timestamp = CommonTypes.Timestamp;

  // Workout streak counters per user
  public type WorkoutStreak = {
    currentStreak : Nat;
    longestStreak : Nat;
    lastWorkoutDate : ?Text; // YYYY-MM-DD or null if none
  };

  // Personal record for a single exercise
  public type PersonalRecord = {
    exerciseName : Text;
    maxWeight : ?Float;
    maxReps : Nat;
    maxSets : Nat;
    achievedAt : Timestamp;
  };
};
