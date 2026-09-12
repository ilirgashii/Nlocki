module {
  public type FoodPreset = {
    id : Nat;
    name : Text;
    caloriesPer100g : Nat;
    proteinPer100g : Float;
    carbsPer100g : Float;
    fatPer100g : Float;
    category : Text;
  };

  // Built-in read-only list of ~30 common foods
  public let builtinFoodPresets : [FoodPreset] = [
    { id = 1;  name = "Rice (white, cooked)";    caloriesPer100g = 130; proteinPer100g = 2.7;  carbsPer100g = 28.2; fatPer100g = 0.3;   category = "Carbs"      },
    { id = 2;  name = "Chicken Breast (cooked)"; caloriesPer100g = 165; proteinPer100g = 31.0; carbsPer100g = 0.0;  fatPer100g = 3.6;   category = "Protein"    },
    { id = 3;  name = "Salmon (cooked)";         caloriesPer100g = 208; proteinPer100g = 20.4; carbsPer100g = 0.0;  fatPer100g = 13.4;  category = "Protein"    },
    { id = 4;  name = "Beef (lean, cooked)";     caloriesPer100g = 215; proteinPer100g = 26.1; carbsPer100g = 0.0;  fatPer100g = 11.8;  category = "Protein"    },
    { id = 5;  name = "Eggs (whole)";            caloriesPer100g = 155; proteinPer100g = 13.0; carbsPer100g = 1.1;  fatPer100g = 11.0;  category = "Protein"    },
    { id = 6;  name = "Pasta (cooked)";          caloriesPer100g = 131; proteinPer100g = 5.0;  carbsPer100g = 25.0; fatPer100g = 1.1;   category = "Carbs"      },
    { id = 7;  name = "Bread (whole wheat)";     caloriesPer100g = 247; proteinPer100g = 13.0; carbsPer100g = 41.0; fatPer100g = 3.4;   category = "Carbs"      },
    { id = 8;  name = "Broccoli (cooked)";       caloriesPer100g = 35;  proteinPer100g = 2.4;  carbsPer100g = 7.2;  fatPer100g = 0.4;   category = "Vegetables" },
    { id = 9;  name = "Carrot (raw)";            caloriesPer100g = 41;  proteinPer100g = 0.9;  carbsPer100g = 9.6;  fatPer100g = 0.2;   category = "Vegetables" },
    { id = 10; name = "Apple (raw)";             caloriesPer100g = 52;  proteinPer100g = 0.3;  carbsPer100g = 13.8; fatPer100g = 0.2;   category = "Fruits"     },
    { id = 11; name = "Banana (raw)";            caloriesPer100g = 89;  proteinPer100g = 1.1;  carbsPer100g = 23.0; fatPer100g = 0.3;   category = "Fruits"     },
    { id = 12; name = "Milk (whole)";            caloriesPer100g = 61;  proteinPer100g = 3.2;  carbsPer100g = 4.8;  fatPer100g = 3.3;   category = "Dairy"      },
    { id = 13; name = "Yogurt (plain)";          caloriesPer100g = 59;  proteinPer100g = 3.5;  carbsPer100g = 4.7;  fatPer100g = 3.3;   category = "Dairy"      },
    { id = 14; name = "Cheese (cheddar)";        caloriesPer100g = 402; proteinPer100g = 25.0; carbsPer100g = 1.3;  fatPer100g = 33.1;  category = "Dairy"      },
    { id = 15; name = "Tuna (canned in water)";  caloriesPer100g = 116; proteinPer100g = 25.5; carbsPer100g = 0.0;  fatPer100g = 1.0;   category = "Protein"    },
    { id = 16; name = "Oats (dry)";              caloriesPer100g = 389; proteinPer100g = 16.9; carbsPer100g = 66.3; fatPer100g = 6.9;   category = "Carbs"      },
    { id = 17; name = "Sweet Potato (cooked)";   caloriesPer100g = 86;  proteinPer100g = 1.6;  carbsPer100g = 20.1; fatPer100g = 0.1;   category = "Vegetables" },
    { id = 18; name = "Olive Oil";               caloriesPer100g = 884; proteinPer100g = 0.0;  carbsPer100g = 0.0;  fatPer100g = 100.0; category = "Fats"       },
    { id = 19; name = "Butter";                  caloriesPer100g = 717; proteinPer100g = 0.9;  carbsPer100g = 0.1;  fatPer100g = 81.1;  category = "Fats"       },
    { id = 20; name = "Tomato (raw)";            caloriesPer100g = 18;  proteinPer100g = 0.9;  carbsPer100g = 3.9;  fatPer100g = 0.2;   category = "Vegetables" },
    { id = 21; name = "Cucumber (raw)";          caloriesPer100g = 15;  proteinPer100g = 0.7;  carbsPer100g = 3.6;  fatPer100g = 0.1;   category = "Vegetables" },
    { id = 22; name = "Spinach (raw)";           caloriesPer100g = 23;  proteinPer100g = 2.9;  carbsPer100g = 3.6;  fatPer100g = 0.4;   category = "Vegetables" },
    { id = 23; name = "Almonds (raw)";           caloriesPer100g = 579; proteinPer100g = 21.2; carbsPer100g = 21.6; fatPer100g = 49.9;  category = "Fats"       },
    { id = 24; name = "Lentils (cooked)";        caloriesPer100g = 116; proteinPer100g = 9.0;  carbsPer100g = 20.1; fatPer100g = 0.4;   category = "Protein"    },
    { id = 25; name = "Black Beans (cooked)";    caloriesPer100g = 132; proteinPer100g = 8.9;  carbsPer100g = 23.7; fatPer100g = 0.5;   category = "Protein"    },
    { id = 26; name = "Tofu (firm)";             caloriesPer100g = 76;  proteinPer100g = 8.1;  carbsPer100g = 1.9;  fatPer100g = 4.8;   category = "Protein"    },
    { id = 27; name = "Turkey Breast (cooked)";  caloriesPer100g = 189; proteinPer100g = 29.0; carbsPer100g = 0.0;  fatPer100g = 7.4;   category = "Protein"    },
    { id = 28; name = "Shrimp (cooked)";         caloriesPer100g = 99;  proteinPer100g = 24.0; carbsPer100g = 0.2;  fatPer100g = 0.3;   category = "Protein"    },
    { id = 29; name = "Avocado (raw)";           caloriesPer100g = 160; proteinPer100g = 2.0;  carbsPer100g = 9.0;  fatPer100g = 15.0;  category = "Fats"       },
    { id = 30; name = "Fish (white, cooked)";    caloriesPer100g = 105; proteinPer100g = 22.0; carbsPer100g = 0.0;  fatPer100g = 1.4;   category = "Protein"    },
  ];
};
