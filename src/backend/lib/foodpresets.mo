import FoodTypes "../types/foodpresets";
import Text "mo:core/Text";

module {
  public type FoodPreset = FoodTypes.FoodPreset;

  // Returns the full built-in food preset list
  public func listPresets() : [FoodPreset] {
    FoodTypes.builtinFoodPresets;
  };

  // Returns a single preset by id
  public func getPreset(id : Nat) : ?FoodPreset {
    FoodTypes.builtinFoodPresets.find(func(p : FoodPreset) : Bool { p.id == id });
  };

  // Returns presets whose names contain the query string (case-insensitive)
  public func searchPresets(nameQuery : Text) : [FoodPreset] {
    let lower = nameQuery.toLower();
    FoodTypes.builtinFoodPresets.filter(func(p : FoodPreset) : Bool {
      p.name.toLower().contains(#text lower);
    });
  };
};
