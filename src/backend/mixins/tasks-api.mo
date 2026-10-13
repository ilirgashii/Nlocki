import Runtime "mo:core/Runtime";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import TaskLib "../lib/tasks";
import TaskTypes "../types/tasks";

mixin (
  tasks : Map.Map<Principal, List.List<TaskTypes.Task>>,
  nextId : { var value : Nat },
) {
  public shared ({ caller }) func addTask(date : Text, title : Text) : async TaskTypes.Task {
    if (caller.isAnonymous()) Runtime.trap("Sign in required");
    let id = nextId.value;
    nextId.value += 1;
    TaskLib.add(tasks, caller, id, date, title);
  };

  public shared ({ caller }) func toggleTask(taskId : Nat) : async Bool {
    if (caller.isAnonymous()) Runtime.trap("Sign in required");
    TaskLib.toggle(tasks, caller, taskId);
  };

  public shared ({ caller }) func deleteTask(taskId : Nat) : async Bool {
    if (caller.isAnonymous()) Runtime.trap("Sign in required");
    TaskLib.delete(tasks, caller, taskId);
  };

  public shared query ({ caller }) func getTasksForDate(date : Text) : async [TaskTypes.Task] {
    if (caller.isAnonymous()) Runtime.trap("Sign in required");
    TaskLib.forDate(tasks, caller, date);
  };
};
