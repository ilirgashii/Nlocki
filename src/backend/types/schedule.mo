import Common "common";

module {
  // 0 = Monday … 6 = Sunday
  public type DayOfWeek = Nat;

  public type WeeklyScheduleEntry = {
    dayOfWeek : DayOfWeek;
    exerciseName : Text;
    sets : Nat;
    reps : Nat;
    weightKg : ?Float;
    lastEditedWeight : ?Float;
    lastEditedTimestamp : ?Common.Timestamp;
  };

  // Full 7-day template for one user (entries may cover multiple exercises per day)
  public type WeeklySchedule = [WeeklyScheduleEntry];
};
