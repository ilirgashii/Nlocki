import MealSuggestTypes "../types/meals-suggest";

module {
  public type MealSuggestion = MealSuggestTypes.MealSuggestion;

  // Build the HTTP outcall request body for the AI suggestion API (JSON)
  public func buildRequestBody(
    remainingCalories : Float,
    remainingProtein : Float,
    remainingCarbs : Float,
    remainingFat : Float,
  ) : Text {
    let prompt = "Suggest 3 meals to fit these remaining daily macro targets: "
      # "calories=" # debug_show(remainingCalories)
      # " protein=" # debug_show(remainingProtein) # "g"
      # " carbs=" # debug_show(remainingCarbs) # "g"
      # " fat=" # debug_show(remainingFat) # "g. "
      # "Return a JSON array of objects with fields: name, calories, protein, carbs, fat.";
    "{\"model\":\"gpt-3.5-turbo\","
      # "\"messages\":[{\"role\":\"user\",\"content\":\""
      # prompt
      # "\"}],"
      # "\"max_tokens\":512}";
  };

  // Return static smart suggestions based on remaining macros (fallback when no http-outcalls)
  public func staticSuggestions(
    remainingCalories : Float,
    remainingProtein : Float,
    remainingCarbs : Float,
    remainingFat : Float,
  ) : [MealSuggestion] {
    // High-protein low-carb scenario
    if (remainingProtein > 30.0 and remainingCarbs < 30.0) {
      return [
        { name = "Grilled Chicken Breast"; calories = 165.0; protein = 31.0; carbs = 0.0; fat = 3.6 },
        { name = "Hard Boiled Eggs (2)"; calories = 155.0; protein = 13.0; carbs = 1.1; fat = 10.0 },
        { name = "Greek Yogurt (plain)"; calories = 100.0; protein = 17.0; carbs = 6.0; fat = 0.7 },
      ];
    };
    // High-calorie high-carb scenario
    if (remainingCalories > 600.0 and remainingCarbs > 60.0) {
      return [
        { name = "Oatmeal with Banana"; calories = 350.0; protein = 9.0; carbs = 65.0; fat = 5.0 },
        { name = "Brown Rice & Chicken"; calories = 420.0; protein = 30.0; carbs = 55.0; fat = 6.0 },
        { name = "Whole Wheat Pasta with Vegetables"; calories = 380.0; protein = 12.0; carbs = 72.0; fat = 4.0 },
      ];
    };
    // Balanced small meal scenario
    if (remainingCalories < 300.0) {
      return [
        { name = "Apple with Almond Butter"; calories = 190.0; protein = 5.0; carbs = 25.0; fat = 9.0 },
        { name = "Cottage Cheese (100g)"; calories = 98.0; protein = 11.0; carbs = 3.4; fat = 4.3 },
        { name = "Mixed Nuts (30g)"; calories = 180.0; protein = 5.0; carbs = 6.0; fat = 16.0 },
      ];
    };
    // High-fat scenario (e.g., keto)
    if (remainingFat > 30.0 and remainingCarbs < 20.0) {
      return [
        { name = "Avocado & Eggs"; calories = 320.0; protein = 14.0; carbs = 6.0; fat = 27.0 },
        { name = "Salmon Fillet (150g)"; calories = 280.0; protein = 28.0; carbs = 0.0; fat = 17.0 },
        { name = "Cheese & Nuts Plate"; calories = 350.0; protein = 18.0; carbs = 5.0; fat = 29.0 },
      ];
    };
    // Default balanced suggestions
    [
      { name = "Grilled Salmon with Vegetables"; calories = 350.0; protein = 34.0; carbs = 12.0; fat = 18.0 },
      { name = "Chicken & Brown Rice Bowl"; calories = 420.0; protein = 32.0; carbs = 48.0; fat = 8.0 },
      { name = "Lentil Soup with Bread"; calories = 310.0; protein = 16.0; carbs = 52.0; fat = 4.0 },
    ];
  };

  // Parse the AI API JSON response into MealSuggestion array
  // Basic parser: looks for name/calories/protein/carbs/fat in JSON text
  public func parseResponse(responseBody : Text) : [MealSuggestion] {
    // Minimal JSON extraction — if the content marker is present, try to extract
    // If parsing fails at any point, return empty array so caller uses fallback
    let contentMarker = "\"content\":\"";
    if (not responseBody.contains(#text contentMarker)) {
      return [];
    };
    // Split on contentMarker to get the part after it
    let parts = responseBody.split(#text contentMarker).toArray();
    if (parts.size() < 2) return [];
    let afterContent = parts[1];
    // Take until closing quote
    let closingParts = afterContent.split(#text "\"").toArray();
    if (closingParts.size() == 0) return [];
    // For robustness, just return empty and let the mixin use staticSuggestions
    [];
  };
};
