import Runtime "mo:core/Runtime";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import ScheduleLib "../lib/schedule";
import ScheduleTypes "../types/schedule";

mixin (
  schedules : Map.Map<Principal, [ScheduleTypes.WeeklyScheduleEntry]>,
  entryIds : Map.Map<Principal, Map.Map<Text, Text>>,
) {
  type EntryView = ScheduleTypes.WeeklyScheduleEntry and { id : ?Text };
  func key(entry : ScheduleTypes.WeeklyScheduleEntry) : Text { debug_show(entry.dayOfWeek) # ":" # entry.exerciseName };
  func ids(user : Principal) : Map.Map<Text, Text> {
    switch (entryIds.get(user)) { case (?map) map; case null { let map = Map.empty<Text, Text>(); entryIds.add(user, map); map } };
  };
  func canonical(entry : EntryView) : ScheduleTypes.WeeklyScheduleEntry {
    { dayOfWeek = entry.dayOfWeek; exerciseName = entry.exerciseName; sets = entry.sets; reps = entry.reps; weightKg = entry.weightKg; lastEditedWeight = entry.lastEditedWeight; lastEditedTimestamp = entry.lastEditedTimestamp };
  };
  public shared query ({ caller }) func getWeeklySchedule() : async [EntryView] {
    if (caller.isAnonymous()) Runtime.trap("Sign in required");
    let map = ids(caller);
    ScheduleLib.getSchedule(schedules, caller).map(func(e) : EntryView { { e with id = map.get(key(e)) } });
  };
  public shared ({ caller }) func saveWeeklySchedule(entries : [EntryView]) : async () {
    if (caller.isAnonymous()) Runtime.trap("Sign in required");
    let map = Map.empty<Text, Text>();
    for (entry in entries.vals()) {
      if (entry.dayOfWeek > 6) Runtime.trap("Invalid weekday");
      switch (entry.id) { case (?id) map.add(key(entry), id); case null {} };
    };
    entryIds.add(caller, map);
    ScheduleLib.saveSchedule(schedules, caller, entries.map(canonical));
  };
  public shared ({ caller }) func updateScheduleEntry(entry : EntryView) : async Bool {
    if (caller.isAnonymous()) Runtime.trap("Sign in required");
    if (entry.dayOfWeek > 6) Runtime.trap("Invalid weekday");
    let map = ids(caller);
    switch (entry.id) {
      case (?id) {
        let old = ScheduleLib.getSchedule(schedules, caller).find(func(e) { map.get(key(e)) == ?id });
        switch (old) {
          case (?oldEntry) { let oldKey = key(oldEntry); ScheduleLib.saveSchedule(schedules, caller, ScheduleLib.getSchedule(schedules, caller).filter(func(e) { key(e) != oldKey })); map.remove(oldKey) };
          case null {};
        };
        map.add(key(entry), id);
      };
      case null {};
    };
    ScheduleLib.updateEntry(schedules, caller, canonical(entry));
  };
  public shared ({ caller }) func clearScheduleDay(dayOfWeek : Nat) : async () {
    if (caller.isAnonymous()) Runtime.trap("Sign in required");
    let map = ids(caller);
    for (e in ScheduleLib.getSchedule(schedules, caller).vals()) { if (e.dayOfWeek == dayOfWeek) map.remove(key(e)) };
    ScheduleLib.clearDay(schedules, caller, dayOfWeek);
  };
};
