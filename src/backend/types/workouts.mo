module {
  public type Workout = {
    id : Nat;
    exerciseName : Text;
    sets : Nat;
    reps : Nat;
    weight : ?Float;
    date : Text; // YYYY-MM-DD
    timestamp : Int;
  };
};
