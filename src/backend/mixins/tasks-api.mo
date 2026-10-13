import Validation "../lib/validation";
import Runtime "mo:core/Runtime";
import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import TaskLib "../lib/tasks";
import TaskTypes "../types/tasks";

mixin (
  tasks : Map.Map<Principal, List.List<TaskTypes.Task>>,
  nextId : { var value : Nat },
  authorize : Principal -> Principal,
) {
  public shared ({ caller = signer }) func addTask(date : Text, title : Text) : async TaskTypes.Task {
    let caller = authorize(signer);
    Validation.date(date); Validation.text(title, 1, 200, "Task");
    let id = nextId.value;
    nextId.value += 1;
    TaskLib.add(tasks, caller, id, date, title);
  };

  public shared ({ caller = signer }) func toggleTask(taskId : Nat) : async Bool {
    let caller = authorize(signer);
    TaskLib.toggle(tasks, caller, taskId);
  };

  public shared ({ caller = signer }) func deleteTask(taskId : Nat) : async Bool {
    let caller = authorize(signer);
    TaskLib.delete(tasks, caller, taskId);
  };

  public shared query ({ caller = signer }) func getTasksForDate(date : Text) : async [TaskTypes.Task] {
    let caller = authorize(signer);
    TaskLib.forDate(tasks, caller, date);
  };
};
