import Array "mo:core/Array";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import ScheduleTypes "../types/schedule";

module {
  public type WeeklyScheduleEntry = ScheduleTypes.WeeklyScheduleEntry;
  public type WeeklySchedule = ScheduleTypes.WeeklySchedule;

  // Returns all schedule entries for a user
  public func getSchedule(
    schedules : Map.Map<Principal, [WeeklyScheduleEntry]>,
    user : Principal,
  ) : WeeklySchedule {
    switch (schedules.get(user)) {
      case (?entries) entries;
      case null [];
    };
  };

  // Replaces the full weekly schedule for a user
  public func saveSchedule(
    schedules : Map.Map<Principal, [WeeklyScheduleEntry]>,
    user : Principal,
    entries : [WeeklyScheduleEntry],
  ) : () {
    schedules.add(user, entries);
  };

  // Updates a single entry (matched by dayOfWeek + exerciseName) in a user's schedule
  public func updateEntry(
    schedules : Map.Map<Principal, [WeeklyScheduleEntry]>,
    user : Principal,
    updated : WeeklyScheduleEntry,
  ) : Bool {
    let current = getSchedule(schedules, user);
    var found = false;
    let newEntries = current.map(func(e) {
      if (e.dayOfWeek == updated.dayOfWeek and e.exerciseName == updated.exerciseName) {
        found := true;
        updated;
      } else {
        e;
      };
    });
    if (found) {
      schedules.add(user, newEntries);
    } else {
      schedules.add(user, newEntries.concat([updated]));
    };
    true;
  };

  // Removes all entries for a specific day from a user's schedule
  public func clearDay(
    schedules : Map.Map<Principal, [WeeklyScheduleEntry]>,
    user : Principal,
    dayOfWeek : Nat,
  ) : () {
    let current = getSchedule(schedules, user);
    let filtered = current.filter(func(e : WeeklyScheduleEntry) : Bool {
      e.dayOfWeek != dayOfWeek;
    });
    schedules.add(user, filtered);
  };
};
