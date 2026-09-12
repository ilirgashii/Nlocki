import FoodLib "../lib/foodpresets";
import FoodTypes "../types/foodpresets";

mixin () {

  // Returns all built-in food presets
  public query func listFoodPresets() : async [FoodTypes.FoodPreset] {
    FoodLib.listPresets();
  };

  // Returns a single preset by id
  public query func getFoodPreset(id : Nat) : async ?FoodTypes.FoodPreset {
    FoodLib.getPreset(id);
  };

  // Returns presets whose names contain the query string (case-insensitive)
  public query func searchFoodPresets(nameQuery : Text) : async [FoodTypes.FoodPreset] {
    FoodLib.searchPresets(nameQuery);
  };
};
