export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  muscleGroup: string;
}

export const EXERCISE_CATEGORIES = [
  "All",
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Forearms",
  "Legs",
  "Calves",
  "Glutes",
  "Abs",
  "Cardio",
  "Full Body",
] as const;

export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export const EXERCISES: Exercise[] = [
  // ── Chest ─────────────────────────────────────────────────────────────────
  {
    id: "chest-01",
    name: "Bench Press",
    category: "Chest",
    muscleGroup: "Pectorals",
  },
  {
    id: "chest-02",
    name: "Incline Bench Press",
    category: "Chest",
    muscleGroup: "Upper Pectorals",
  },
  {
    id: "chest-03",
    name: "Decline Bench Press",
    category: "Chest",
    muscleGroup: "Lower Pectorals",
  },
  {
    id: "chest-04",
    name: "Dumbbell Flyes",
    category: "Chest",
    muscleGroup: "Pectorals",
  },
  {
    id: "chest-05",
    name: "Cable Crossovers",
    category: "Chest",
    muscleGroup: "Pectorals",
  },
  {
    id: "chest-06",
    name: "Push-ups",
    category: "Chest",
    muscleGroup: "Pectorals",
  },
  {
    id: "chest-07",
    name: "Chest Dips",
    category: "Chest",
    muscleGroup: "Pectorals, Triceps",
  },
  {
    id: "chest-08",
    name: "Pec Deck",
    category: "Chest",
    muscleGroup: "Pectorals",
  },
  {
    id: "chest-09",
    name: "Dumbbell Bench Press",
    category: "Chest",
    muscleGroup: "Pectorals",
  },
  {
    id: "chest-10",
    name: "Incline Dumbbell Flyes",
    category: "Chest",
    muscleGroup: "Upper Pectorals",
  },

  // ── Back ──────────────────────────────────────────────────────────────────
  {
    id: "back-01",
    name: "Pull-ups",
    category: "Back",
    muscleGroup: "Lats, Biceps",
  },
  {
    id: "back-02",
    name: "Lat Pulldown",
    category: "Back",
    muscleGroup: "Lats",
  },
  {
    id: "back-03",
    name: "Seated Cable Row",
    category: "Back",
    muscleGroup: "Rhomboids, Lats",
  },
  {
    id: "back-04",
    name: "Bent-over Row",
    category: "Back",
    muscleGroup: "Lats, Rhomboids",
  },
  {
    id: "back-05",
    name: "T-bar Row",
    category: "Back",
    muscleGroup: "Lats, Rhomboids",
  },
  {
    id: "back-06",
    name: "Deadlift",
    category: "Back",
    muscleGroup: "Lower Back, Glutes, Hamstrings",
  },
  {
    id: "back-07",
    name: "Face Pull",
    category: "Back",
    muscleGroup: "Rear Delts, Rotator Cuff",
  },
  {
    id: "back-08",
    name: "Inverted Row",
    category: "Back",
    muscleGroup: "Lats, Rhomboids",
  },
  {
    id: "back-09",
    name: "Single Arm Row",
    category: "Back",
    muscleGroup: "Lats",
  },
  {
    id: "back-10",
    name: "Chin-ups",
    category: "Back",
    muscleGroup: "Lats, Biceps",
  },
  {
    id: "back-11",
    name: "Cable Pullover",
    category: "Back",
    muscleGroup: "Lats",
  },
  {
    id: "back-12",
    name: "Hyperextension",
    category: "Back",
    muscleGroup: "Lower Back, Glutes",
  },

  // ── Shoulders ─────────────────────────────────────────────────────────────
  {
    id: "sho-01",
    name: "Overhead Press",
    category: "Shoulders",
    muscleGroup: "Deltoids",
  },
  {
    id: "sho-02",
    name: "Dumbbell Shoulder Press",
    category: "Shoulders",
    muscleGroup: "Deltoids",
  },
  {
    id: "sho-03",
    name: "Lateral Raises",
    category: "Shoulders",
    muscleGroup: "Medial Deltoid",
  },
  {
    id: "sho-04",
    name: "Front Raises",
    category: "Shoulders",
    muscleGroup: "Anterior Deltoid",
  },
  {
    id: "sho-05",
    name: "Rear Delt Flyes",
    category: "Shoulders",
    muscleGroup: "Posterior Deltoid",
  },
  {
    id: "sho-06",
    name: "Arnold Press",
    category: "Shoulders",
    muscleGroup: "Deltoids",
  },
  {
    id: "sho-07",
    name: "Shrugs",
    category: "Shoulders",
    muscleGroup: "Trapezius",
  },
  {
    id: "sho-08",
    name: "Upright Row",
    category: "Shoulders",
    muscleGroup: "Deltoids, Traps",
  },
  {
    id: "sho-09",
    name: "Cable Lateral Raise",
    category: "Shoulders",
    muscleGroup: "Medial Deltoid",
  },
  {
    id: "sho-10",
    name: "Machine Shoulder Press",
    category: "Shoulders",
    muscleGroup: "Deltoids",
  },

  // ── Biceps ────────────────────────────────────────────────────────────────
  {
    id: "bi-01",
    name: "Barbell Curl",
    category: "Biceps",
    muscleGroup: "Biceps Brachii",
  },
  {
    id: "bi-02",
    name: "Dumbbell Curl",
    category: "Biceps",
    muscleGroup: "Biceps Brachii",
  },
  {
    id: "bi-03",
    name: "Hammer Curl",
    category: "Biceps",
    muscleGroup: "Brachialis, Brachioradialis",
  },
  {
    id: "bi-04",
    name: "Concentration Curl",
    category: "Biceps",
    muscleGroup: "Biceps Brachii",
  },
  {
    id: "bi-05",
    name: "Preacher Curl",
    category: "Biceps",
    muscleGroup: "Biceps Brachii",
  },
  {
    id: "bi-06",
    name: "Cable Curl",
    category: "Biceps",
    muscleGroup: "Biceps Brachii",
  },
  {
    id: "bi-07",
    name: "Incline Dumbbell Curl",
    category: "Biceps",
    muscleGroup: "Long Head Biceps",
  },
  {
    id: "bi-08",
    name: "Spider Curl",
    category: "Biceps",
    muscleGroup: "Biceps Brachii",
  },

  // ── Triceps ───────────────────────────────────────────────────────────────
  {
    id: "tri-01",
    name: "Tricep Pushdown",
    category: "Triceps",
    muscleGroup: "Triceps Brachii",
  },
  {
    id: "tri-02",
    name: "Overhead Tricep Extension",
    category: "Triceps",
    muscleGroup: "Long Head Triceps",
  },
  {
    id: "tri-03",
    name: "Skull Crushers",
    category: "Triceps",
    muscleGroup: "Triceps Brachii",
  },
  {
    id: "tri-04",
    name: "Tricep Dips",
    category: "Triceps",
    muscleGroup: "Triceps Brachii",
  },
  {
    id: "tri-05",
    name: "Close-grip Bench Press",
    category: "Triceps",
    muscleGroup: "Triceps Brachii",
  },
  {
    id: "tri-06",
    name: "Diamond Push-ups",
    category: "Triceps",
    muscleGroup: "Triceps Brachii",
  },
  {
    id: "tri-07",
    name: "Rope Pushdown",
    category: "Triceps",
    muscleGroup: "Triceps Brachii",
  },
  {
    id: "tri-08",
    name: "Kickback",
    category: "Triceps",
    muscleGroup: "Triceps Brachii",
  },

  // ── Forearms ──────────────────────────────────────────────────────────────
  {
    id: "fore-01",
    name: "Wrist Curl",
    category: "Forearms",
    muscleGroup: "Wrist Flexors",
  },
  {
    id: "fore-02",
    name: "Reverse Wrist Curl",
    category: "Forearms",
    muscleGroup: "Wrist Extensors",
  },
  {
    id: "fore-03",
    name: "Farmer Walk",
    category: "Forearms",
    muscleGroup: "Forearms, Grip",
  },
  {
    id: "fore-04",
    name: "Reverse Curl",
    category: "Forearms",
    muscleGroup: "Brachioradialis, Forearms",
  },
  {
    id: "fore-05",
    name: "Barbell Wrist Roller",
    category: "Forearms",
    muscleGroup: "Forearms",
  },
  {
    id: "fore-06",
    name: "Plate Pinch",
    category: "Forearms",
    muscleGroup: "Grip Strength",
  },

  // ── Legs ──────────────────────────────────────────────────────────────────
  {
    id: "leg-01",
    name: "Squat",
    category: "Legs",
    muscleGroup: "Quads, Glutes, Hamstrings",
  },
  {
    id: "leg-02",
    name: "Leg Press",
    category: "Legs",
    muscleGroup: "Quads, Glutes",
  },
  {
    id: "leg-03",
    name: "Romanian Deadlift",
    category: "Legs",
    muscleGroup: "Hamstrings, Glutes",
  },
  {
    id: "leg-04",
    name: "Leg Curl",
    category: "Legs",
    muscleGroup: "Hamstrings",
  },
  {
    id: "leg-05",
    name: "Leg Extension",
    category: "Legs",
    muscleGroup: "Quadriceps",
  },
  {
    id: "leg-06",
    name: "Lunges",
    category: "Legs",
    muscleGroup: "Quads, Glutes, Hamstrings",
  },
  {
    id: "leg-07",
    name: "Hack Squat",
    category: "Legs",
    muscleGroup: "Quads, Glutes",
  },
  {
    id: "leg-08",
    name: "Bulgarian Split Squat",
    category: "Legs",
    muscleGroup: "Quads, Glutes",
  },
  {
    id: "leg-09",
    name: "Sumo Deadlift",
    category: "Legs",
    muscleGroup: "Hamstrings, Glutes, Inner Thighs",
  },
  {
    id: "leg-10",
    name: "Front Squat",
    category: "Legs",
    muscleGroup: "Quads, Core",
  },
  {
    id: "leg-11",
    name: "Goblet Squat",
    category: "Legs",
    muscleGroup: "Quads, Glutes",
  },
  {
    id: "leg-12",
    name: "Walking Lunge",
    category: "Legs",
    muscleGroup: "Quads, Glutes, Hamstrings",
  },

  // ── Calves ────────────────────────────────────────────────────────────────
  {
    id: "calf-01",
    name: "Standing Calf Raise",
    category: "Calves",
    muscleGroup: "Gastrocnemius",
  },
  {
    id: "calf-02",
    name: "Seated Calf Raise",
    category: "Calves",
    muscleGroup: "Soleus",
  },
  {
    id: "calf-03",
    name: "Donkey Calf Raise",
    category: "Calves",
    muscleGroup: "Gastrocnemius",
  },
  {
    id: "calf-04",
    name: "Calf Press",
    category: "Calves",
    muscleGroup: "Gastrocnemius, Soleus",
  },
  {
    id: "calf-05",
    name: "Single Leg Calf Raise",
    category: "Calves",
    muscleGroup: "Gastrocnemius",
  },

  // ── Glutes ────────────────────────────────────────────────────────────────
  {
    id: "glu-01",
    name: "Hip Thrust",
    category: "Glutes",
    muscleGroup: "Gluteus Maximus",
  },
  {
    id: "glu-02",
    name: "Cable Kickback",
    category: "Glutes",
    muscleGroup: "Gluteus Maximus",
  },
  {
    id: "glu-03",
    name: "Glute Bridge",
    category: "Glutes",
    muscleGroup: "Gluteus Maximus",
  },
  {
    id: "glu-04",
    name: "Step-ups",
    category: "Glutes",
    muscleGroup: "Glutes, Quads",
  },
  {
    id: "glu-05",
    name: "Sumo Squat",
    category: "Glutes",
    muscleGroup: "Glutes, Inner Thighs",
  },
  {
    id: "glu-06",
    name: "Donkey Kick",
    category: "Glutes",
    muscleGroup: "Gluteus Maximus",
  },
  {
    id: "glu-07",
    name: "Lateral Band Walk",
    category: "Glutes",
    muscleGroup: "Gluteus Medius",
  },

  // ── Abs ───────────────────────────────────────────────────────────────────
  {
    id: "abs-01",
    name: "Crunches",
    category: "Abs",
    muscleGroup: "Rectus Abdominis",
  },
  {
    id: "abs-02",
    name: "Bicycle Crunches",
    category: "Abs",
    muscleGroup: "Obliques, Abs",
  },
  {
    id: "abs-03",
    name: "Leg Raises",
    category: "Abs",
    muscleGroup: "Lower Abs",
  },
  {
    id: "abs-04",
    name: "Russian Twists",
    category: "Abs",
    muscleGroup: "Obliques",
  },
  { id: "abs-05", name: "Plank", category: "Abs", muscleGroup: "Core" },
  {
    id: "abs-06",
    name: "Side Plank",
    category: "Abs",
    muscleGroup: "Obliques",
  },
  {
    id: "abs-07",
    name: "Cable Crunch",
    category: "Abs",
    muscleGroup: "Rectus Abdominis",
  },
  {
    id: "abs-08",
    name: "Ab Wheel Rollout",
    category: "Abs",
    muscleGroup: "Core",
  },
  {
    id: "abs-09",
    name: "Sit Ups",
    category: "Abs",
    muscleGroup: "Rectus Abdominis",
  },
  {
    id: "abs-10",
    name: "Mountain Climber",
    category: "Abs",
    muscleGroup: "Core, Hip Flexors",
  },
  {
    id: "abs-11",
    name: "Hanging Knee Raise",
    category: "Abs",
    muscleGroup: "Lower Abs",
  },
  {
    id: "abs-12",
    name: "Dragon Flag",
    category: "Abs",
    muscleGroup: "Full Core",
  },

  // ── Cardio ────────────────────────────────────────────────────────────────
  {
    id: "car-01",
    name: "Running",
    category: "Cardio",
    muscleGroup: "Full Body",
  },
  {
    id: "car-02",
    name: "Treadmill",
    category: "Cardio",
    muscleGroup: "Legs, Core",
  },
  {
    id: "car-03",
    name: "Cycling",
    category: "Cardio",
    muscleGroup: "Quads, Calves",
  },
  {
    id: "car-04",
    name: "Rowing Machine",
    category: "Cardio",
    muscleGroup: "Back, Legs, Arms",
  },
  {
    id: "car-05",
    name: "Jump Rope",
    category: "Cardio",
    muscleGroup: "Calves, Shoulders",
  },
  {
    id: "car-06",
    name: "Stair Climber",
    category: "Cardio",
    muscleGroup: "Glutes, Quads, Calves",
  },
  {
    id: "car-07",
    name: "Elliptical",
    category: "Cardio",
    muscleGroup: "Full Body",
  },
  {
    id: "car-08",
    name: "Swimming",
    category: "Cardio",
    muscleGroup: "Full Body",
  },
  { id: "car-09", name: "HIIT", category: "Cardio", muscleGroup: "Full Body" },
  {
    id: "car-10",
    name: "Sprint Intervals",
    category: "Cardio",
    muscleGroup: "Full Body",
  },
  {
    id: "car-11",
    name: "Boxing",
    category: "Cardio",
    muscleGroup: "Shoulders, Arms, Core",
  },

  // ── Full Body ─────────────────────────────────────────────────────────────
  {
    id: "fb-01",
    name: "Burpees",
    category: "Full Body",
    muscleGroup: "Full Body",
  },
  {
    id: "fb-02",
    name: "Kettlebell Swing",
    category: "Full Body",
    muscleGroup: "Glutes, Hamstrings, Back",
  },
  {
    id: "fb-03",
    name: "Clean and Press",
    category: "Full Body",
    muscleGroup: "Full Body",
  },
  {
    id: "fb-04",
    name: "Turkish Get-up",
    category: "Full Body",
    muscleGroup: "Full Body, Core",
  },
  {
    id: "fb-05",
    name: "Battle Ropes",
    category: "Full Body",
    muscleGroup: "Shoulders, Arms, Core",
  },
  {
    id: "fb-06",
    name: "Box Jumps",
    category: "Full Body",
    muscleGroup: "Quads, Glutes, Calves",
  },
  {
    id: "fb-07",
    name: "Thruster",
    category: "Full Body",
    muscleGroup: "Quads, Shoulders, Core",
  },
  {
    id: "fb-08",
    name: "Sled Push",
    category: "Full Body",
    muscleGroup: "Quads, Glutes, Core",
  },
  {
    id: "fb-09",
    name: "Power Clean",
    category: "Full Body",
    muscleGroup: "Full Body",
  },
  {
    id: "fb-10",
    name: "Snatch",
    category: "Full Body",
    muscleGroup: "Full Body",
  },
];
