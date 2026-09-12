import Map "mo:core/Map";
import Principal "mo:core/Principal";
import ScheduleLib "../lib/schedule";
import ScheduleTypes "../types/schedule";

mixin (schedules : Map.Map<Principal, [ScheduleTypes.WeeklyScheduleEntry]>) {

  // Returns the caller's weekly schedule
  public shared query ({ caller }) func getWeeklySchedule() : async [ScheduleTypes.WeeklyScheduleEntry] {
    ScheduleLib.getSchedule(schedules, caller);
  };

  // Replaces the caller's full weekly schedule
  public shared ({ caller }) func saveWeeklySchedule(entries : [ScheduleTypes.WeeklyScheduleEntry]) : async () {
    ScheduleLib.saveSchedule(schedules, caller, entries);
  };

  // Updates a single exercise slot (matched by dayOfWeek + exerciseName)
  public shared ({ caller }) func updateScheduleEntry(entry : ScheduleTypes.WeeklyScheduleEntry) : async Bool {
    ScheduleLib.updateEntry(schedules, caller, entry);
  };

  // Clears all entries for a given day (0=Mon … 6=Sun) for the caller
  public shared ({ caller }) func clearScheduleDay(dayOfWeek : Nat) : async () {
    ScheduleLib.clearDay(schedules, caller, dayOfWeek);
  };
};
