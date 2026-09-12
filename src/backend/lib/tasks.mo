import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Types "../types/tasks";

module {
  public type Task = Types.Task;

  // Returns the per-user task list, creating it if absent
  func getUserList(
    store : Map.Map<Principal, List.List<Task>>,
    user : Principal,
  ) : List.List<Task> {
    switch (store.get(user)) {
      case (?list) list;
      case null {
        let list = List.empty<Task>();
        store.add(user, list);
        list;
      };
    };
  };

  public func add(
    store : Map.Map<Principal, List.List<Task>>,
    user : Principal,
    nextId : Nat,
    date : Text,
    title : Text,
  ) : Task {
    let list = getUserList(store, user);
    let task : Task = { id = nextId; title; completed = false; date };
    list.add(task);
    task;
  };

  public func toggle(
    store : Map.Map<Principal, List.List<Task>>,
    user : Principal,
    taskId : Nat,
  ) : Bool {
    let list = getUserList(store, user);
    var found = false;
    list.mapInPlace(func(t : Task) : Task {
      if (t.id == taskId) {
        found := true;
        { t with completed = not t.completed };
      } else { t };
    });
    found;
  };

  public func delete(
    store : Map.Map<Principal, List.List<Task>>,
    user : Principal,
    taskId : Nat,
  ) : Bool {
    let list = getUserList(store, user);
    let before = list.size();
    let filtered = list.filter(func(t : Task) : Bool { t.id != taskId });
    list.clear();
    list.append(filtered);
    list.size() < before;
  };

  public func forDate(
    store : Map.Map<Principal, List.List<Task>>,
    user : Principal,
    date : Text,
  ) : [Task] {
    let list = getUserList(store, user);
    list.filter(func(t : Task) : Bool { t.date == date }).toArray();
  };
};
