import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Types "../types/workouts";

module {
  public type Workout = Types.Workout;

  public type WorkoutInput = {
    exerciseName : Text;
    sets : Nat;
    reps : Nat;
    weight : ?Float;
    date : Text;
  };

  // Returns the per-user workout list, creating it if absent
  func getUserList(
    store : Map.Map<Principal, List.List<Workout>>,
    user : Principal,
  ) : List.List<Workout> {
    switch (store.get(user)) {
      case (?list) list;
      case null {
        let list = List.empty<Workout>();
        store.add(user, list);
        list;
      };
    };
  };

  public func add(
    store : Map.Map<Principal, List.List<Workout>>,
    user : Principal,
    nextId : Nat,
    entry : WorkoutInput,
  ) : Workout {
    let list = getUserList(store, user);
    let w : Workout = {
      id = nextId;
      exerciseName = entry.exerciseName;
      sets = entry.sets;
      reps = entry.reps;
      weight = entry.weight;
      date = entry.date;
      timestamp = Time.now();
    };
    list.add(w);
    w;
  };

  public func delete(
    store : Map.Map<Principal, List.List<Workout>>,
    user : Principal,
    id : Nat,
  ) : Bool {
    let list = getUserList(store, user);
    let before = list.size();
    let filtered = list.filter(func(w : Workout) : Bool { w.id != id });
    list.clear();
    list.append(filtered);
    list.size() < before;
  };

  public func forDate(
    store : Map.Map<Principal, List.List<Workout>>,
    user : Principal,
    date : Text,
  ) : [Workout] {
    let list = getUserList(store, user);
    list.filter(func(w : Workout) : Bool { w.date == date }).toArray();
  };

  public func inRange(
    store : Map.Map<Principal, List.List<Workout>>,
    user : Principal,
    startDate : Text,
    endDate : Text,
  ) : [Workout] {
    let list = getUserList(store, user);
    list.filter(func(w : Workout) : Bool {
      w.date >= startDate and w.date <= endDate;
    }).toArray();
  };
};
