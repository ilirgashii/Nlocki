import List "mo:core/List";
import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Types "../types/meals";

module {
  public type Meal = Types.Meal;

  public type MealInput = {
    mealName : Text;
    calories : Nat;
    protein : Nat;
    carbs : Nat;
    fat : Nat;
    date : Text;
  };

  // Returns the per-user meal list, creating it if absent
  func getUserList(
    store : Map.Map<Principal, List.List<Meal>>,
    user : Principal,
  ) : List.List<Meal> {
    switch (store.get(user)) {
      case (?list) list;
      case null {
        let list = List.empty<Meal>();
        store.add(user, list);
        list;
      };
    };
  };

  public func add(
    store : Map.Map<Principal, List.List<Meal>>,
    user : Principal,
    nextId : Nat,
    entry : MealInput,
  ) : Meal {
    let list = getUserList(store, user);
    let m : Meal = {
      id = nextId;
      mealName = entry.mealName;
      calories = entry.calories;
      protein = entry.protein;
      carbs = entry.carbs;
      fat = entry.fat;
      date = entry.date;
      timestamp = Time.now();
    };
    list.add(m);
    m;
  };

  public func delete(
    store : Map.Map<Principal, List.List<Meal>>,
    user : Principal,
    id : Nat,
  ) : Bool {
    let list = getUserList(store, user);
    let before = list.size();
    let filtered = list.filter(func(m : Meal) : Bool { m.id != id });
    list.clear();
    list.append(filtered);
    list.size() < before;
  };

  public func forDate(
    store : Map.Map<Principal, List.List<Meal>>,
    user : Principal,
    date : Text,
  ) : [Meal] {
    let list = getUserList(store, user);
    list.filter(func(m : Meal) : Bool { m.date == date }).toArray();
  };

  public func inRange(
    store : Map.Map<Principal, List.List<Meal>>,
    user : Principal,
    startDate : Text,
    endDate : Text,
  ) : [Meal] {
    let list = getUserList(store, user);
    list.filter(func(m : Meal) : Bool {
      m.date >= startDate and m.date <= endDate;
    }).toArray();
  };
};
