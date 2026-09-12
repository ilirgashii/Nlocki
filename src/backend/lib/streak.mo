import List "mo:core/List";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import WorkoutTypes "../types/workouts";
import StreakTypes "../types/streak";

module {
  public type WorkoutStreak = StreakTypes.WorkoutStreak;

  // Convert a nanosecond UTC timestamp to "YYYY-MM-DD" string
  // Uses integer arithmetic: seconds since epoch → days → date components
  func _timestampToDate(nsTimestamp : Int) : Text {
    let secsSinceEpoch : Int = nsTimestamp / 1_000_000_000;
    // Days since Unix epoch (1970-01-01)
    let daysSinceEpoch : Int = secsSinceEpoch / 86400;
    // Compute calendar date using Gregorian algorithm (epoch = day 0)
    let z : Int = daysSinceEpoch + 719468;
    let era : Int = (if (z >= 0) z else z - 146096) / 146097;
    let doe : Int = z - era * 146097;
    let yoe : Int = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y : Int = yoe + era * 400;
    let doy : Int = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp : Int = (5 * doy + 2) / 153;
    let d : Int = doy - (153 * mp + 2) / 5 + 1;
    let m : Int = mp + (if (mp < 10) 3 else -9);
    let yr : Int = y + (if (m <= 2) 1 else 0);
    let pad2 = func(n : Int) : Text {
      if (n < 10) { "0" # debug_show(n) } else { debug_show(n) }
    };
    debug_show(yr) # "-" # pad2(m) # "-" # pad2(d)
  };

  // Compute current and longest workout streak for the given user
  public func computeStreak(
    workouts : Map.Map<Principal, List.List<WorkoutTypes.Workout>>,
    user : Principal,
  ) : WorkoutStreak {
    let listOpt = workouts.get(user);
    let list = switch (listOpt) {
      case (?l) l;
      case null {
        return { currentStreak = 0; longestStreak = 0; lastWorkoutDate = null };
      };
    };
    if (list.size() == 0) {
      return { currentStreak = 0; longestStreak = 0; lastWorkoutDate = null };
    };

    // Collect unique workout dates using a Set
    let dateSet = Set.empty<Text>();
    list.forEach(func(w : WorkoutTypes.Workout) {
      // Use the stored date field (YYYY-MM-DD) directly
      dateSet.add(w.date)
    });

    // Sort dates ascending
    let sortedDates = dateSet.toArray().sort(func(a : Text, b : Text) : { #less; #equal; #greater } {
      Text.compare(a, b)
    });

    if (sortedDates.size() == 0) {
      return { currentStreak = 0; longestStreak = 0; lastWorkoutDate = null };
    };

    // Compute today's date string from current time
    // We compute it as an approximate offset — since we can't call Time here (stateless module),
    // we derive "today" from the latest workout's timestamp to keep it pure
    // Actually we'll use the sorted dates directly: count consecutive days from the end
    let n = sortedDates.size();
    let lastDate = sortedDates[n - 1];

    // Walk backwards counting consecutive days
    // Helper: compute day difference between two YYYY-MM-DD strings
    func dateToDayNumber(dateStr : Text) : Int {
      let parts = dateStr.split(#char '-');
      let partsArr = parts.toArray();
      if (partsArr.size() < 3) return 0;
      let yr = switch (partsArr[0].toInt()) { case (?v) v; case null 0 };
      let mo = switch (partsArr[1].toInt()) { case (?v) v; case null 0 };
      let dy = switch (partsArr[2].toInt()) { case (?v) v; case null 0 };
      // Rata Die algorithm
      let y = yr - (if (mo <= 2) 1 else 0);
      let m = mo + (if (mo <= 2) 12 else 0);
      365 * y + y / 4 - y / 100 + y / 400 + (153 * m + 8) / 5 + dy
    };

    // Compute current streak (consecutive days ending at lastDate)
    var currentStreak = 1;
    var i : Int = (n : Int) - 1;
    label countCurrent while (i > 0) {
      let iNat = i.toNat();
      let diff = dateToDayNumber(sortedDates[iNat]) - dateToDayNumber(sortedDates[iNat - 1]);
      if (diff == 1) {
        currentStreak += 1;
        i -= 1;
      } else {
        break countCurrent;
      };
    };

    // Compute longest streak over all dates
    var longestStreak = 1;
    var runLen = 1;
    var j = 1;
    while (j < n) {
      let diff = dateToDayNumber(sortedDates[j]) - dateToDayNumber(sortedDates[j - 1]);
      if (diff == 1) {
        runLen += 1;
        if (runLen > longestStreak) longestStreak := runLen;
      } else {
        runLen := 1;
      };
      j += 1;
    };

    {
      currentStreak;
      longestStreak;
      lastWorkoutDate = ?lastDate;
    };
  };
};
