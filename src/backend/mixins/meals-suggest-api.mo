import MealSuggestTypes "../types/meals-suggest";
import MealsSuggestLib "../lib/meals-suggest";

mixin () {
  // Suggest meals based on remaining daily macro targets.
  // Falls back to smart static suggestions (http-outcalls extension not available in this environment).
  public shared func suggestMeals(
    remainingCalories : Float,
    remainingProtein : Float,
    remainingCarbs : Float,
    remainingFat : Float,
  ) : async [MealSuggestTypes.MealSuggestion] {
    MealsSuggestLib.staticSuggestions(remainingCalories, remainingProtein, remainingCarbs, remainingFat);
  };
};
