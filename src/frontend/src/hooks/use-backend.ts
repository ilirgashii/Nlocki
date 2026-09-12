import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Comment,
  DailySummary,
  DayOfWeek,
  FoodPreset,
  Meal,
  MealSuggestion,
  PersonalRecord,
  Post,
  SocialProfile,
  Story,
  Task,
  UserGoals,
  WaterLog,
  WeeklyScheduleEntry,
  Workout,
  WorkoutStreak,
} from "../types";

// Helpers for generating IDs and today's date
function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}
function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// --- Local storage mock layer ---
function storageGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function storageSet<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ---- Tasks ----
function getTasksForDate(date: string): Task[] {
  return storageGet<Task[]>(`tasks:${date}`, []);
}
function saveTasksForDate(date: string, tasks: Task[]): void {
  storageSet(`tasks:${date}`, tasks);
}

export function useTasksForDate(date: string) {
  return useQuery<Task[]>({
    queryKey: ["tasks", date],
    queryFn: () => getTasksForDate(date),
  });
}

export function useAddTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, title }: { date: string; title: string }) => {
      const tasks = getTasksForDate(date);
      const task: Task = {
        id: uid(),
        date,
        title,
        completed: false,
        createdAt: Date.now(),
      };
      saveTasksForDate(date, [...tasks, task]);
      return task;
    },
    onSuccess: (_data, { date }) =>
      qc.invalidateQueries({ queryKey: ["tasks", date] }),
  });
}

export function useToggleTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, id }: { date: string; id: string }) => {
      const tasks = getTasksForDate(date).map((t) =>
        t.id === id ? { ...t, completed: !t.completed } : t,
      );
      saveTasksForDate(date, tasks);
    },
    onSuccess: (_data, { date }) =>
      qc.invalidateQueries({ queryKey: ["tasks", date] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, id }: { date: string; id: string }) => {
      const tasks = getTasksForDate(date).filter((t) => t.id !== id);
      saveTasksForDate(date, tasks);
    },
    onSuccess: (_data, { date }) =>
      qc.invalidateQueries({ queryKey: ["tasks", date] }),
  });
}

// ---- Workouts ----
function getWorkoutsForDate(date: string): Workout[] {
  return storageGet<Workout[]>(`workouts:${date}`, []);
}

export function useWorkoutsForDate(date: string) {
  return useQuery<Workout[]>({
    queryKey: ["workouts", date],
    queryFn: () => getWorkoutsForDate(date),
  });
}

export function useAddWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (w: Omit<Workout, "id">) => {
      const workouts = getWorkoutsForDate(w.date);
      const workout: Workout = { ...w, id: uid() };
      storageSet(`workouts:${w.date}`, [...workouts, workout]);
      updatePersonalRecord(workout);
      return workout;
    },
    onSuccess: (_data, w) => {
      qc.invalidateQueries({ queryKey: ["workouts", w.date] });
      qc.invalidateQueries({ queryKey: ["personalRecords"] });
      qc.invalidateQueries({ queryKey: ["personalRecord", w.name] });
      qc.invalidateQueries({ queryKey: ["workoutStreak"] });
    },
  });
}

export function useDeleteWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, id }: { date: string; id: string }) => {
      const updated = getWorkoutsForDate(date).filter((w) => w.id !== id);
      storageSet(`workouts:${date}`, updated);
    },
    onSuccess: (_data, { date }) =>
      qc.invalidateQueries({ queryKey: ["workouts", date] }),
  });
}

export function useUpdateWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      oldId,
      date,
      updates,
    }: {
      oldId: string;
      date: string;
      updates: Partial<Omit<Workout, "id" | "date">>;
    }) => {
      const workouts = getWorkoutsForDate(date);
      const old = workouts.find((w) => w.id === oldId);
      if (!old) throw new Error("Workout not found");
      const withoutOld = workouts.filter((w) => w.id !== oldId);
      const updated: Workout = { ...old, ...updates };
      storageSet(`workouts:${date}`, [...withoutOld, updated]);
      updatePersonalRecord(updated);
      return updated;
    },
    onSuccess: (_data, { date }) => {
      qc.invalidateQueries({ queryKey: ["workouts", date] });
      qc.invalidateQueries({ queryKey: ["personalRecords"] });
      qc.invalidateQueries({ queryKey: ["workoutStreak"] });
    },
  });
}

export function useWorkoutsInRange(start: string, end: string) {
  return useQuery<Workout[]>({
    queryKey: ["workouts-range", start, end],
    queryFn: () => {
      const results: Workout[] = [];
      let cur = new Date(start);
      const endDate = new Date(end);
      while (cur <= endDate) {
        const d = cur.toISOString().split("T")[0];
        results.push(...getWorkoutsForDate(d));
        cur.setDate(cur.getDate() + 1);
      }
      return results;
    },
  });
}

// ---- Meals ----
function getMealsForDate(date: string): Meal[] {
  return storageGet<Meal[]>(`meals:${date}`, []);
}

export function useMealsForDate(date: string) {
  return useQuery<Meal[]>({
    queryKey: ["meals", date],
    queryFn: () => getMealsForDate(date),
  });
}

export function useAddMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: Omit<Meal, "id">) => {
      const meals = getMealsForDate(m.date);
      const meal: Meal = { ...m, id: uid() };
      storageSet(`meals:${m.date}`, [...meals, meal]);
      return meal;
    },
    onSuccess: (_data, m) =>
      qc.invalidateQueries({ queryKey: ["meals", m.date] }),
  });
}

export function useDeleteMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, id }: { date: string; id: string }) => {
      const updated = getMealsForDate(date).filter((m) => m.id !== id);
      storageSet(`meals:${date}`, updated);
    },
    onSuccess: (_data, { date }) =>
      qc.invalidateQueries({ queryKey: ["meals", date] }),
  });
}

export function useMealsInRange(start: string, end: string) {
  return useQuery<Meal[]>({
    queryKey: ["meals-range", start, end],
    queryFn: () => {
      const results: Meal[] = [];
      let cur = new Date(start);
      const endDate = new Date(end);
      while (cur <= endDate) {
        const d = cur.toISOString().split("T")[0];
        results.push(...getMealsForDate(d));
        cur.setDate(cur.getDate() + 1);
      }
      return results;
    },
  });
}

// ---- Water ----
export function useWaterForDate(date: string) {
  return useQuery<WaterLog>({
    queryKey: ["water", date],
    queryFn: () => storageGet<WaterLog>(`water:${date}`, { date, totalMl: 0 }),
  });
}

export function useLogWater() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, addMl }: { date: string; addMl: number }) => {
      const current = storageGet<WaterLog>(`water:${date}`, {
        date,
        totalMl: 0,
      });
      const updated = { ...current, totalMl: current.totalMl + addMl };
      storageSet(`water:${date}`, updated);
      return updated;
    },
    onSuccess: (_data, { date }) =>
      qc.invalidateQueries({ queryKey: ["water", date] }),
  });
}

// ---- Daily Summary ----
export function useDailySummary(date: string) {
  return useQuery<DailySummary>({
    queryKey: ["summary", date],
    queryFn: () => {
      const tasks = getTasksForDate(date);
      const workouts = getWorkoutsForDate(date);
      const meals = getMealsForDate(date);
      const water = storageGet<WaterLog>(`water:${date}`, { date, totalMl: 0 });
      const tasksTotal = tasks.length;
      const tasksCompleted = tasks.filter((t) => t.completed).length;
      const totalCaloriesConsumed = meals.reduce((s, m) => s + m.calories, 0);
      const totalWaterMl = water.totalMl;
      const workoutsCount = workouts.length;
      return {
        date,
        tasksTotal,
        tasksCompleted,
        taskCompletionPct: tasksTotal > 0 ? tasksCompleted / tasksTotal : 0,
        totalCaloriesBurned: workouts.reduce((s, w) => s + w.caloriesBurned, 0),
        totalCaloriesConsumed,
        totalCalories: totalCaloriesConsumed,
        totalProteinG: meals.reduce((s, m) => s + m.proteinG, 0),
        totalCarbsG: meals.reduce((s, m) => s + m.carbsG, 0),
        totalFatG: meals.reduce((s, m) => s + m.fatG, 0),
        totalWaterMl,
        waterMl: totalWaterMl,
        workoutsCount,
        workoutCount: workoutsCount,
      };
    },
  });
}

export { todayISO };

// ============================================================
// USER GOALS
// ============================================================
const GOALS_KEY = "user:goals";
const DEFAULT_GOALS: UserGoals = {
  dailyCalorieTarget: 2000,
  weeklyMinWorkouts: 3,
};

export function useGoals() {
  return useQuery<UserGoals>({
    queryKey: ["goals"],
    queryFn: () => storageGet<UserGoals>(GOALS_KEY, DEFAULT_GOALS),
    staleTime: 1000 * 60 * 5,
  });
}

export function useSaveGoals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dailyCalorieTarget,
      weeklyMinWorkouts,
    }: {
      dailyCalorieTarget: number;
      weeklyMinWorkouts: number;
    }) => {
      const goals: UserGoals = { dailyCalorieTarget, weeklyMinWorkouts };
      storageSet(GOALS_KEY, goals);
      return goals;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}

// ============================================================
// FOOD PRESETS
// ============================================================
const FOOD_PRESETS: FoodPreset[] = [
  // Grains
  {
    id: 1,
    name: "White Rice (cooked)",
    caloriesPer100g: 130,
    proteinPer100g: 2.7,
    carbsPer100g: 28,
    fatPer100g: 0.3,
    category: "Grains",
  },
  {
    id: 2,
    name: "Brown Rice (cooked)",
    caloriesPer100g: 112,
    proteinPer100g: 2.6,
    carbsPer100g: 23.5,
    fatPer100g: 0.9,
    category: "Grains",
  },
  {
    id: 3,
    name: "Oats (cooked)",
    caloriesPer100g: 71,
    proteinPer100g: 2.5,
    carbsPer100g: 12,
    fatPer100g: 1.5,
    category: "Grains",
  },
  {
    id: 4,
    name: "Pasta (cooked)",
    caloriesPer100g: 158,
    proteinPer100g: 5.8,
    carbsPer100g: 31,
    fatPer100g: 0.9,
    category: "Grains",
  },
  {
    id: 5,
    name: "Bread (whole wheat)",
    caloriesPer100g: 247,
    proteinPer100g: 13,
    carbsPer100g: 41,
    fatPer100g: 3.4,
    category: "Grains",
  },
  {
    id: 6,
    name: "Quinoa (cooked)",
    caloriesPer100g: 120,
    proteinPer100g: 4.4,
    carbsPer100g: 21.3,
    fatPer100g: 1.9,
    category: "Grains",
  },
  {
    id: 7,
    name: "Tortilla (corn)",
    caloriesPer100g: 218,
    proteinPer100g: 5.7,
    carbsPer100g: 45,
    fatPer100g: 3,
    category: "Grains",
  },
  // Protein
  {
    id: 8,
    name: "Chicken Breast (grilled)",
    caloriesPer100g: 165,
    proteinPer100g: 31,
    carbsPer100g: 0,
    fatPer100g: 3.6,
    category: "Protein",
  },
  {
    id: 9,
    name: "Chicken Thigh (grilled)",
    caloriesPer100g: 209,
    proteinPer100g: 26,
    carbsPer100g: 0,
    fatPer100g: 11,
    category: "Protein",
  },
  {
    id: 10,
    name: "Salmon (baked)",
    caloriesPer100g: 208,
    proteinPer100g: 20,
    carbsPer100g: 0,
    fatPer100g: 13,
    category: "Protein",
  },
  {
    id: 11,
    name: "Tuna (canned, water)",
    caloriesPer100g: 116,
    proteinPer100g: 25.5,
    carbsPer100g: 0,
    fatPer100g: 1,
    category: "Protein",
  },
  {
    id: 12,
    name: "Ground Beef (lean)",
    caloriesPer100g: 215,
    proteinPer100g: 26,
    carbsPer100g: 0,
    fatPer100g: 12,
    category: "Protein",
  },
  {
    id: 13,
    name: "Eggs (whole)",
    caloriesPer100g: 155,
    proteinPer100g: 13,
    carbsPer100g: 1.1,
    fatPer100g: 11,
    category: "Protein",
  },
  {
    id: 14,
    name: "Egg Whites",
    caloriesPer100g: 52,
    proteinPer100g: 11,
    carbsPer100g: 0.7,
    fatPer100g: 0.2,
    category: "Protein",
  },
  {
    id: 15,
    name: "Turkey Breast (sliced)",
    caloriesPer100g: 135,
    proteinPer100g: 30,
    carbsPer100g: 0,
    fatPer100g: 1,
    category: "Protein",
  },
  {
    id: 16,
    name: "Shrimp (boiled)",
    caloriesPer100g: 99,
    proteinPer100g: 24,
    carbsPer100g: 0,
    fatPer100g: 0.3,
    category: "Protein",
  },
  {
    id: 17,
    name: "Beef Steak (grilled)",
    caloriesPer100g: 271,
    proteinPer100g: 26,
    carbsPer100g: 0,
    fatPer100g: 18,
    category: "Protein",
  },
  // Dairy
  {
    id: 18,
    name: "Greek Yogurt (plain)",
    caloriesPer100g: 59,
    proteinPer100g: 10,
    carbsPer100g: 3.6,
    fatPer100g: 0.4,
    category: "Dairy",
  },
  {
    id: 19,
    name: "Cottage Cheese (low-fat)",
    caloriesPer100g: 72,
    proteinPer100g: 12.4,
    carbsPer100g: 2.7,
    fatPer100g: 1,
    category: "Dairy",
  },
  {
    id: 20,
    name: "Milk (whole)",
    caloriesPer100g: 61,
    proteinPer100g: 3.2,
    carbsPer100g: 4.8,
    fatPer100g: 3.3,
    category: "Dairy",
  },
  {
    id: 21,
    name: "Cheddar Cheese",
    caloriesPer100g: 402,
    proteinPer100g: 25,
    carbsPer100g: 1.3,
    fatPer100g: 33,
    category: "Dairy",
  },
  {
    id: 22,
    name: "Whey Protein Shake",
    caloriesPer100g: 370,
    proteinPer100g: 75,
    carbsPer100g: 8,
    fatPer100g: 3,
    category: "Dairy",
  },
  // Vegetables
  {
    id: 23,
    name: "Broccoli (cooked)",
    caloriesPer100g: 35,
    proteinPer100g: 2.4,
    carbsPer100g: 7.2,
    fatPer100g: 0.4,
    category: "Vegetables",
  },
  {
    id: 24,
    name: "Spinach (raw)",
    caloriesPer100g: 23,
    proteinPer100g: 2.9,
    carbsPer100g: 3.6,
    fatPer100g: 0.4,
    category: "Vegetables",
  },
  {
    id: 25,
    name: "Sweet Potato (baked)",
    caloriesPer100g: 90,
    proteinPer100g: 2,
    carbsPer100g: 21,
    fatPer100g: 0.1,
    category: "Vegetables",
  },
  {
    id: 26,
    name: "Potato (boiled)",
    caloriesPer100g: 87,
    proteinPer100g: 1.9,
    carbsPer100g: 20,
    fatPer100g: 0.1,
    category: "Vegetables",
  },
  {
    id: 27,
    name: "Carrot (raw)",
    caloriesPer100g: 41,
    proteinPer100g: 0.9,
    carbsPer100g: 10,
    fatPer100g: 0.2,
    category: "Vegetables",
  },
  {
    id: 28,
    name: "Avocado",
    caloriesPer100g: 160,
    proteinPer100g: 2,
    carbsPer100g: 9,
    fatPer100g: 15,
    category: "Vegetables",
  },
  {
    id: 29,
    name: "Bell Pepper (red)",
    caloriesPer100g: 31,
    proteinPer100g: 1,
    carbsPer100g: 6,
    fatPer100g: 0.3,
    category: "Vegetables",
  },
  {
    id: 30,
    name: "Tomato (raw)",
    caloriesPer100g: 18,
    proteinPer100g: 0.9,
    carbsPer100g: 3.9,
    fatPer100g: 0.2,
    category: "Vegetables",
  },
  // Fruits
  {
    id: 31,
    name: "Banana",
    caloriesPer100g: 89,
    proteinPer100g: 1.1,
    carbsPer100g: 23,
    fatPer100g: 0.3,
    category: "Fruits",
  },
  {
    id: 32,
    name: "Apple",
    caloriesPer100g: 52,
    proteinPer100g: 0.3,
    carbsPer100g: 14,
    fatPer100g: 0.2,
    category: "Fruits",
  },
  {
    id: 33,
    name: "Blueberries",
    caloriesPer100g: 57,
    proteinPer100g: 0.7,
    carbsPer100g: 14.5,
    fatPer100g: 0.3,
    category: "Fruits",
  },
  {
    id: 34,
    name: "Orange",
    caloriesPer100g: 47,
    proteinPer100g: 0.9,
    carbsPer100g: 12,
    fatPer100g: 0.1,
    category: "Fruits",
  },
  {
    id: 35,
    name: "Strawberries",
    caloriesPer100g: 32,
    proteinPer100g: 0.7,
    carbsPer100g: 7.7,
    fatPer100g: 0.3,
    category: "Fruits",
  },
  // Legumes
  {
    id: 36,
    name: "Lentils (cooked)",
    caloriesPer100g: 116,
    proteinPer100g: 9,
    carbsPer100g: 20,
    fatPer100g: 0.4,
    category: "Legumes",
  },
  {
    id: 37,
    name: "Chickpeas (cooked)",
    caloriesPer100g: 164,
    proteinPer100g: 8.9,
    carbsPer100g: 27,
    fatPer100g: 2.6,
    category: "Legumes",
  },
  {
    id: 38,
    name: "Black Beans (cooked)",
    caloriesPer100g: 132,
    proteinPer100g: 8.9,
    carbsPer100g: 24,
    fatPer100g: 0.5,
    category: "Legumes",
  },
  {
    id: 39,
    name: "Edamame (cooked)",
    caloriesPer100g: 122,
    proteinPer100g: 11,
    carbsPer100g: 10,
    fatPer100g: 5,
    category: "Legumes",
  },
  // Nuts & Fats
  {
    id: 40,
    name: "Almonds",
    caloriesPer100g: 579,
    proteinPer100g: 21,
    carbsPer100g: 22,
    fatPer100g: 50,
    category: "Nuts & Fats",
  },
  {
    id: 41,
    name: "Peanut Butter",
    caloriesPer100g: 588,
    proteinPer100g: 25,
    carbsPer100g: 20,
    fatPer100g: 50,
    category: "Nuts & Fats",
  },
  {
    id: 42,
    name: "Olive Oil",
    caloriesPer100g: 884,
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatPer100g: 100,
    category: "Nuts & Fats",
  },
  {
    id: 43,
    name: "Walnuts",
    caloriesPer100g: 654,
    proteinPer100g: 15,
    carbsPer100g: 14,
    fatPer100g: 65,
    category: "Nuts & Fats",
  },
  // Ready Meals
  {
    id: 44,
    name: "Chicken & Rice Bowl",
    caloriesPer100g: 148,
    proteinPer100g: 14,
    carbsPer100g: 15,
    fatPer100g: 3,
    category: "Ready Meals",
  },
  {
    id: 45,
    name: "Tuna Salad Sandwich",
    caloriesPer100g: 185,
    proteinPer100g: 12,
    carbsPer100g: 22,
    fatPer100g: 5,
    category: "Ready Meals",
  },
  {
    id: 46,
    name: "Protein Bar (generic)",
    caloriesPer100g: 380,
    proteinPer100g: 30,
    carbsPer100g: 42,
    fatPer100g: 9,
    category: "Ready Meals",
  },
  {
    id: 47,
    name: "Oatmeal with Berries",
    caloriesPer100g: 85,
    proteinPer100g: 3,
    carbsPer100g: 16,
    fatPer100g: 1.5,
    category: "Ready Meals",
  },
  {
    id: 48,
    name: "Scrambled Eggs & Toast",
    caloriesPer100g: 172,
    proteinPer100g: 10,
    carbsPer100g: 14,
    fatPer100g: 7,
    category: "Ready Meals",
  },
];

export function useFoodPresets() {
  return useQuery<FoodPreset[]>({
    queryKey: ["food-presets"],
    queryFn: () => FOOD_PRESETS,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useSearchFoodPresets(query: string) {
  return useQuery<FoodPreset[]>({
    queryKey: ["food-presets-search", query],
    queryFn: () => {
      if (!query.trim()) return FOOD_PRESETS;
      const q = query.toLowerCase();
      return FOOD_PRESETS.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      );
    },
    staleTime: Number.POSITIVE_INFINITY,
  });
}

// ============================================================
// WEEKLY SCHEDULE
// ============================================================
const SCHEDULE_KEY = "fitness:weeklySchedule";

function getWeeklySchedule(): WeeklyScheduleEntry[] {
  return storageGet<WeeklyScheduleEntry[]>(SCHEDULE_KEY, []);
}

function saveWeeklyScheduleRaw(entries: WeeklyScheduleEntry[]): void {
  storageSet(SCHEDULE_KEY, entries);
}

export function useWeeklySchedule() {
  return useQuery<WeeklyScheduleEntry[]>({
    queryKey: ["weeklySchedule"],
    queryFn: getWeeklySchedule,
  });
}

export function useSaveWeeklySchedule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entries: WeeklyScheduleEntry[]) => {
      saveWeeklyScheduleRaw(entries);
      return entries;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weeklySchedule"] }),
  });
}

export function useUpdateScheduleEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: WeeklyScheduleEntry) => {
      const all = getWeeklySchedule();
      const exists = all.findIndex((e) => e.id === entry.id);
      if (exists >= 0) {
        all[exists] = entry;
      } else {
        all.push(entry);
      }
      saveWeeklyScheduleRaw(all);
      return entry;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weeklySchedule"] }),
  });
}

export function useClearScheduleDay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dayOfWeek: DayOfWeek) => {
      const remaining = getWeeklySchedule().filter(
        (e) => e.dayOfWeek !== dayOfWeek,
      );
      saveWeeklyScheduleRaw(remaining);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["weeklySchedule"] }),
  });
}

// ============================================================
// SOCIAL LAYER
// ============================================================

// --- My User ID (persistent, randomly generated once) ---
function getMyUserId(): string {
  let id = localStorage.getItem("social:myUserId");
  if (!id) {
    id = `user-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("social:myUserId", id);
  }
  return id;
}

// --- Seed mock data on first run ---
function seedSocialDataIfNeeded(): void {
  if (localStorage.getItem("social:seeded")) return;

  const mockUsers: SocialProfile[] = [
    {
      userId: "mock-u1",
      username: "alex_fit",
      bio: "Marathon runner & coffee enthusiast ☕",
      avatarUrl: "https://i.pravatar.cc/150?img=3",
      isPublic: true,
      followersCount: 142,
      followingCount: 89,
    },
    {
      userId: "mock-u2",
      username: "sara_lifts",
      bio: "Powerlifter. 3x nationals. Strength coach 💪",
      avatarUrl: "https://i.pravatar.cc/150?img=5",
      isPublic: true,
      followersCount: 534,
      followingCount: 210,
    },
    {
      userId: "mock-u3",
      username: "jord_runs",
      bio: "10K PB: 42:11. Chasing 38 mins 🏃",
      avatarUrl: "https://i.pravatar.cc/150?img=12",
      isPublic: true,
      followersCount: 77,
      followingCount: 103,
    },
    {
      userId: "mock-u4",
      username: "mia_wellness",
      bio: "Yoga & meditation. Life is balance 🧘",
      avatarUrl: "https://i.pravatar.cc/150?img=9",
      isPublic: false,
      followersCount: 210,
      followingCount: 55,
    },
  ];

  for (const u of mockUsers) {
    storageSet(`social:profile:${u.userId}`, u);
  }

  // Store full user index for search
  const existingIndex = storageGet<string[]>("social:userIndex", []);
  const allIds = [
    ...new Set([...existingIndex, ...mockUsers.map((u) => u.userId)]),
  ];
  storageSet("social:userIndex", allIds);

  // Mock following — I follow mock-u1 and mock-u2
  const myId = getMyUserId();
  storageSet(`social:following:${myId}`, ["mock-u1", "mock-u2"]);
  storageSet("social:followers:mock-u1", [myId]);
  storageSet("social:followers:mock-u2", [myId]);

  // Mock posts
  const now = Date.now();
  const posts: Post[] = [
    {
      id: "post-1",
      authorId: "mock-u1",
      authorUsername: "alex_fit",
      authorAvatarUrl: "https://i.pravatar.cc/150?img=3",
      text: "Just crushed a 5K PR this morning! Feeling unstoppable 🔥 The early morning cold made it perfect running weather.",
      photoUrl:
        "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=600&q=80",
      timestamp: now - 1000 * 60 * 25,
      likeCount: 24,
      commentCount: 3,
      isLikedByMe: false,
    },
    {
      id: "post-2",
      authorId: "mock-u2",
      authorUsername: "sara_lifts",
      authorAvatarUrl: "https://i.pravatar.cc/150?img=5",
      text: "New deadlift PR today — 140kg! 💪 Consistency is everything. Two years ago I could barely lift 60kg.",
      photoUrl:
        "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80",
      timestamp: now - 1000 * 60 * 90,
      likeCount: 61,
      commentCount: 7,
      isLikedByMe: true,
    },
    {
      id: "post-3",
      authorId: "mock-u1",
      authorUsername: "alex_fit",
      authorAvatarUrl: "https://i.pravatar.cc/150?img=3",
      text: "Rest day vibes. Foam rolling, stretching, and meal prep. Recovery is training too 🥗",
      timestamp: now - 1000 * 60 * 60 * 18,
      likeCount: 15,
      commentCount: 1,
      isLikedByMe: false,
    },
  ];
  storageSet("social:posts", posts);

  // Mock comments
  const comments: Comment[] = [
    {
      id: "cmt-1",
      postId: "post-1",
      authorId: "mock-u2",
      authorUsername: "sara_lifts",
      text: "Incredible! What's your training plan?",
      timestamp: now - 1000 * 60 * 20,
    },
    {
      id: "cmt-2",
      postId: "post-1",
      authorId: "mock-u3",
      authorUsername: "jord_runs",
      text: "Let's race next weekend! 🏃",
      timestamp: now - 1000 * 60 * 15,
    },
    {
      id: "cmt-3",
      postId: "post-2",
      authorId: "mock-u1",
      authorUsername: "alex_fit",
      text: "Absolute beast mode! Inspiring 🙌",
      timestamp: now - 1000 * 60 * 80,
    },
  ];
  storageSet("social:comments", comments);

  // Mock stories
  const stories: Story[] = [
    {
      id: "story-1",
      authorId: "mock-u1",
      authorUsername: "alex_fit",
      photoUrl:
        "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=600&q=80",
      text: "Morning run — golden hour magic ✨",
      timestamp: now - 1000 * 60 * 30,
    },
    {
      id: "story-2",
      authorId: "mock-u2",
      authorUsername: "sara_lifts",
      photoUrl:
        "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600&q=80",
      text: "PR day 💪 No days off.",
      timestamp: now - 1000 * 60 * 120,
    },
  ];
  storageSet("social:stories", stories);

  localStorage.setItem("social:seeded", "1");
}

// Run seed when module loads
seedSocialDataIfNeeded();

// ---- Profile helpers ----
function getAllProfiles(): SocialProfile[] {
  const index = storageGet<string[]>("social:userIndex", []);
  return index
    .map((id) => storageGet<SocialProfile | null>(`social:profile:${id}`, null))
    .filter((p): p is SocialProfile => p !== null);
}

function getAllPosts(): Post[] {
  return storageGet<Post[]>("social:posts", []);
}

function getAllComments(): Comment[] {
  return storageGet<Comment[]>("social:comments", []);
}

function getAllStories(): Story[] {
  return storageGet<Story[]>("social:stories", []);
}

// ---- Profile hooks ----
export function useMyUserId(): string {
  return getMyUserId();
}

export function useMyProfile() {
  const myId = getMyUserId();
  return useQuery<SocialProfile>({
    queryKey: ["social:profile", myId],
    queryFn: () => {
      const existing = storageGet<SocialProfile | null>(
        `social:profile:${myId}`,
        null,
      );
      if (existing) return existing;
      const profile: SocialProfile = {
        userId: myId,
        username: "you",
        bio: "My Nlock'i journey 🏋️",
        isPublic: false,
        followersCount: 0,
        followingCount: 0,
      };
      storageSet(`social:profile:${myId}`, profile);
      // Register in user index
      const index = storageGet<string[]>("social:userIndex", []);
      if (!index.includes(myId)) {
        storageSet("social:userIndex", [...index, myId]);
      }
      return profile;
    },
  });
}

export function useProfile(userId: string) {
  return useQuery<SocialProfile | null>({
    queryKey: ["social:profile", userId],
    queryFn: () =>
      storageGet<SocialProfile | null>(`social:profile:${userId}`, null),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const myId = getMyUserId();
  return useMutation({
    mutationFn: async (updates: Partial<SocialProfile>) => {
      const existing = storageGet<SocialProfile | null>(
        `social:profile:${myId}`,
        null,
      );
      // UPSERT: create a new profile if none exists yet (first-time registration)
      const base: SocialProfile = existing ?? {
        userId: myId,
        username: "",
        bio: "",
        avatarUrl: "",
        email: "",
        phone: "",
        isPublic: false,
        followersCount: 0,
        followingCount: 0,
      };
      const updated = { ...base, ...updates };
      storageSet(`social:profile:${myId}`, updated);
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social:profile", myId] });
      qc.invalidateQueries({ queryKey: ["social:feed"] });
    },
  });
}

export function useSearchUsers(query: string) {
  return useQuery<SocialProfile[]>({
    queryKey: ["social:search", query],
    queryFn: () => {
      if (!query.trim()) return [];
      const q = query.toLowerCase();
      const myId = getMyUserId();
      return getAllProfiles().filter(
        (p) =>
          p.userId !== myId &&
          (p.username.toLowerCase().includes(q) ||
            p.bio.toLowerCase().includes(q)),
      );
    },
    enabled: query.trim().length > 0,
  });
}

// ---- Follow hooks ----
function getFollowingIds(userId: string): string[] {
  return storageGet<string[]>(`social:following:${userId}`, []);
}

function getFollowerIds(userId: string): string[] {
  return storageGet<string[]>(`social:followers:${userId}`, []);
}

export function useFollowing() {
  const myId = getMyUserId();
  return useQuery<SocialProfile[]>({
    queryKey: ["social:following", myId],
    queryFn: () => {
      const ids = getFollowingIds(myId);
      return ids
        .map((id) =>
          storageGet<SocialProfile | null>(`social:profile:${id}`, null),
        )
        .filter((p): p is SocialProfile => p !== null);
    },
  });
}

export function useFollowers() {
  const myId = getMyUserId();
  return useQuery<SocialProfile[]>({
    queryKey: ["social:followers", myId],
    queryFn: () => {
      const ids = getFollowerIds(myId);
      return ids
        .map((id) =>
          storageGet<SocialProfile | null>(`social:profile:${id}`, null),
        )
        .filter((p): p is SocialProfile => p !== null);
    },
  });
}

export function useIsFollowing(targetId: string) {
  const myId = getMyUserId();
  return useQuery<boolean>({
    queryKey: ["social:isFollowing", myId, targetId],
    queryFn: () => getFollowingIds(myId).includes(targetId),
  });
}

export function useFollowUser() {
  const qc = useQueryClient();
  const myId = getMyUserId();
  return useMutation({
    mutationFn: async (targetId: string) => {
      const following = getFollowingIds(myId);
      if (!following.includes(targetId)) {
        storageSet(`social:following:${myId}`, [...following, targetId]);
        // Update follower count
        const profile = storageGet<SocialProfile | null>(
          `social:profile:${targetId}`,
          null,
        );
        if (profile) {
          storageSet(`social:profile:${targetId}`, {
            ...profile,
            followersCount: profile.followersCount + 1,
          });
        }
        // Update my following count
        const myProfile = storageGet<SocialProfile | null>(
          `social:profile:${myId}`,
          null,
        );
        if (myProfile) {
          storageSet(`social:profile:${myId}`, {
            ...myProfile,
            followingCount: myProfile.followingCount + 1,
          });
        }
        // Add me to their followers
        const followers = getFollowerIds(targetId);
        if (!followers.includes(myId)) {
          storageSet(`social:followers:${targetId}`, [...followers, myId]);
        }
      }
    },
    onSuccess: (_data, targetId) => {
      qc.invalidateQueries({ queryKey: ["social:following", myId] });
      qc.invalidateQueries({
        queryKey: ["social:isFollowing", myId, targetId],
      });
      qc.invalidateQueries({ queryKey: ["social:profile", targetId] });
      qc.invalidateQueries({ queryKey: ["social:profile", myId] });
      qc.invalidateQueries({ queryKey: ["social:feed"] });
    },
  });
}

export function useUnfollowUser() {
  const qc = useQueryClient();
  const myId = getMyUserId();
  return useMutation({
    mutationFn: async (targetId: string) => {
      const following = getFollowingIds(myId).filter((id) => id !== targetId);
      storageSet(`social:following:${myId}`, following);
      // Update follower count
      const profile = storageGet<SocialProfile | null>(
        `social:profile:${targetId}`,
        null,
      );
      if (profile) {
        storageSet(`social:profile:${targetId}`, {
          ...profile,
          followersCount: Math.max(0, profile.followersCount - 1),
        });
      }
      // Update my following count
      const myProfile = storageGet<SocialProfile | null>(
        `social:profile:${myId}`,
        null,
      );
      if (myProfile) {
        storageSet(`social:profile:${myId}`, {
          ...myProfile,
          followingCount: Math.max(0, myProfile.followingCount - 1),
        });
      }
      // Remove me from their followers
      const followers = getFollowerIds(targetId).filter((id) => id !== myId);
      storageSet(`social:followers:${targetId}`, followers);
    },
    onSuccess: (_data, targetId) => {
      qc.invalidateQueries({ queryKey: ["social:following", myId] });
      qc.invalidateQueries({
        queryKey: ["social:isFollowing", myId, targetId],
      });
      qc.invalidateQueries({ queryKey: ["social:profile", targetId] });
      qc.invalidateQueries({ queryKey: ["social:profile", myId] });
      qc.invalidateQueries({ queryKey: ["social:feed"] });
    },
  });
}

// ---- Feed / Posts hooks ----
export function useFeed() {
  const myId = getMyUserId();
  return useQuery<Post[]>({
    queryKey: ["social:feed"],
    queryFn: () => {
      const following = getFollowingIds(myId);
      const myLikes = storageGet<string[]>(`social:likes:${myId}`, []);
      const posts = getAllPosts()
        .filter((p) => following.includes(p.authorId) || p.authorId === myId)
        .sort((a, b) => b.timestamp - a.timestamp)
        .map((p) => ({ ...p, isLikedByMe: myLikes.includes(p.id) }));
      return posts;
    },
  });
}

export function useUserPosts(userId: string) {
  const myId = getMyUserId();
  return useQuery<Post[]>({
    queryKey: ["social:userPosts", userId],
    queryFn: () => {
      const myLikes = storageGet<string[]>(`social:likes:${myId}`, []);
      return getAllPosts()
        .filter((p) => p.authorId === userId)
        .sort((a, b) => b.timestamp - a.timestamp)
        .map((p) => ({ ...p, isLikedByMe: myLikes.includes(p.id) }));
    },
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  const myId = getMyUserId();
  return useMutation({
    mutationFn: async ({
      text,
      photoUrl,
    }: {
      text: string;
      photoUrl?: string;
    }) => {
      const profile = storageGet<SocialProfile | null>(
        `social:profile:${myId}`,
        null,
      );
      const post: Post = {
        id: `post-${uid()}`,
        authorId: myId,
        authorUsername: profile?.username ?? "you",
        authorAvatarUrl: profile?.avatarUrl,
        text,
        photoUrl,
        timestamp: Date.now(),
        likeCount: 0,
        commentCount: 0,
        isLikedByMe: false,
      };
      const posts = getAllPosts();
      storageSet("social:posts", [post, ...posts]);
      return post;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social:feed"] });
      qc.invalidateQueries({ queryKey: ["social:userPosts", myId] });
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  const myId = getMyUserId();
  return useMutation({
    mutationFn: async (postId: string) => {
      const posts = getAllPosts().filter((p) => p.id !== postId);
      storageSet("social:posts", posts);
      // Also delete comments for that post
      const comments = getAllComments().filter((c) => c.postId !== postId);
      storageSet("social:comments", comments);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social:feed"] });
      qc.invalidateQueries({ queryKey: ["social:userPosts", myId] });
      qc.invalidateQueries({ queryKey: ["social:comments"] });
    },
  });
}

export function useLikePost() {
  const qc = useQueryClient();
  const myId = getMyUserId();
  return useMutation({
    mutationFn: async (postId: string) => {
      const likes = storageGet<string[]>(`social:likes:${myId}`, []);
      if (!likes.includes(postId)) {
        storageSet(`social:likes:${myId}`, [...likes, postId]);
        const posts = getAllPosts().map((p) =>
          p.id === postId ? { ...p, likeCount: p.likeCount + 1 } : p,
        );
        storageSet("social:posts", posts);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social:feed"] });
    },
  });
}

export function useUnlikePost() {
  const qc = useQueryClient();
  const myId = getMyUserId();
  return useMutation({
    mutationFn: async (postId: string) => {
      const likes = storageGet<string[]>(`social:likes:${myId}`, []).filter(
        (id) => id !== postId,
      );
      storageSet(`social:likes:${myId}`, likes);
      const posts = getAllPosts().map((p) =>
        p.id === postId ? { ...p, likeCount: Math.max(0, p.likeCount - 1) } : p,
      );
      storageSet("social:posts", posts);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social:feed"] });
    },
  });
}

// ---- Comments hooks ----
export function useComments(postId: string) {
  return useQuery<Comment[]>({
    queryKey: ["social:comments", postId],
    queryFn: () =>
      getAllComments()
        .filter((c) => c.postId === postId)
        .sort((a, b) => a.timestamp - b.timestamp),
  });
}

export function useAddComment() {
  const qc = useQueryClient();
  const myId = getMyUserId();
  return useMutation({
    mutationFn: async ({ postId, text }: { postId: string; text: string }) => {
      const profile = storageGet<SocialProfile | null>(
        `social:profile:${myId}`,
        null,
      );
      const comment: Comment = {
        id: `cmt-${uid()}`,
        postId,
        authorId: myId,
        authorUsername: profile?.username ?? "you",
        text,
        timestamp: Date.now(),
      };
      storageSet("social:comments", [...getAllComments(), comment]);
      // Increment comment count on post
      const posts = getAllPosts().map((p) =>
        p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p,
      );
      storageSet("social:posts", posts);
      return comment;
    },
    onSuccess: (_data, { postId }) => {
      qc.invalidateQueries({ queryKey: ["social:comments", postId] });
      qc.invalidateQueries({ queryKey: ["social:feed"] });
    },
  });
}

export function useDeleteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      commentId,
      postId,
    }: {
      commentId: string;
      postId: string;
    }) => {
      const comments = getAllComments().filter((c) => c.id !== commentId);
      storageSet("social:comments", comments);
      const posts = getAllPosts().map((p) =>
        p.id === postId
          ? { ...p, commentCount: Math.max(0, p.commentCount - 1) }
          : p,
      );
      storageSet("social:posts", posts);
    },
    onSuccess: (_data, { postId }) => {
      qc.invalidateQueries({ queryKey: ["social:comments", postId] });
      qc.invalidateQueries({ queryKey: ["social:feed"] });
    },
  });
}

// ---- Stories hooks ----
export function useStories() {
  const myId = getMyUserId();
  return useQuery<Story[]>({
    queryKey: ["social:stories"],
    queryFn: () => {
      const following = getFollowingIds(myId);
      return getAllStories()
        .filter((s) => following.includes(s.authorId) || s.authorId === myId)
        .sort((a, b) => b.timestamp - a.timestamp);
    },
  });
}

export function useCreateStory() {
  const qc = useQueryClient();
  const myId = getMyUserId();
  return useMutation({
    mutationFn: async ({
      photoUrl,
      text,
    }: {
      photoUrl: string;
      text?: string;
    }) => {
      const profile = storageGet<SocialProfile | null>(
        `social:profile:${myId}`,
        null,
      );
      const story: Story = {
        id: `story-${uid()}`,
        authorId: myId,
        authorUsername: profile?.username ?? "you",
        photoUrl,
        text,
        timestamp: Date.now(),
      };
      storageSet("social:stories", [story, ...getAllStories()]);
      return story;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social:stories"] });
    },
  });
}

export function useDeleteStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (storyId: string) => {
      storageSet(
        "social:stories",
        getAllStories().filter((s) => s.id !== storyId),
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social:stories"] });
    },
  });
}

// ============================================================
// WORKOUT STREAK
// ============================================================

/**
 * Computes the current & longest workout streaks from all stored workout dates.
 * A "streak day" counts if at least one workout was logged that day.
 */
function computeWorkoutStreak(): WorkoutStreak {
  // Gather all dates that have at least one workout
  const allKeys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith("workouts:")) allKeys.push(k);
  }

  const workoutDates = new Set<string>();
  for (const key of allKeys) {
    const date = key.replace("workouts:", "");
    const workouts = storageGet<Workout[]>(key, []);
    if (workouts.length > 0) workoutDates.add(date);
  }

  if (workoutDates.size === 0) {
    return { currentStreak: 0, longestStreak: 0, lastWorkoutDate: null };
  }

  const sorted = Array.from(workoutDates).sort();
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  // Build streaks
  let longest = 1;
  let current = 1;
  let maxStreak = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) {
      current += 1;
      if (current > longest) longest = current;
    } else {
      current = 1;
    }
  }
  maxStreak = longest;

  // Current streak: count backward from today
  let currentStreak = 0;
  let checkDate = today;
  while (workoutDates.has(checkDate)) {
    currentStreak += 1;
    const d = new Date(checkDate);
    d.setDate(d.getDate() - 1);
    checkDate = d.toISOString().split("T")[0];
  }
  // If today has no workout, check from yesterday
  if (currentStreak === 0) {
    checkDate = yesterday;
    while (workoutDates.has(checkDate)) {
      currentStreak += 1;
      const d = new Date(checkDate);
      d.setDate(d.getDate() - 1);
      checkDate = d.toISOString().split("T")[0];
    }
  }

  const lastWorkoutDate = sorted[sorted.length - 1];
  return {
    currentStreak,
    longestStreak: maxStreak,
    lastWorkoutDate,
  };
}

export function useWorkoutStreak() {
  return useQuery<WorkoutStreak>({
    queryKey: ["workoutStreak"],
    queryFn: computeWorkoutStreak,
    staleTime: 1000 * 60,
  });
}

// ============================================================
// PERSONAL RECORDS
// ============================================================

const PR_KEY = "fitness:personalRecords";

function getAllPRs(): PersonalRecord[] {
  return storageGet<PersonalRecord[]>(PR_KEY, []);
}

function savePRs(records: PersonalRecord[]): void {
  storageSet(PR_KEY, records);
}

/** Called after every workout save to potentially update the PR. */
export function updatePersonalRecord(workout: Workout): void {
  const records = getAllPRs();
  const existing = records.find((r) => r.exerciseName === workout.name);
  const newWeight = workout.weightKg > 0 ? workout.weightKg : null;
  const now = Date.now();

  if (!existing) {
    records.push({
      exerciseName: workout.name,
      maxWeight: newWeight,
      maxReps: workout.reps,
      maxSets: workout.sets,
      achievedAt: now,
    });
    savePRs(records);
    return;
  }

  let updated = false;
  let updatedRecord = { ...existing };

  if (
    newWeight !== null &&
    (existing.maxWeight === null || newWeight > existing.maxWeight)
  ) {
    updatedRecord = { ...updatedRecord, maxWeight: newWeight, achievedAt: now };
    updated = true;
  }
  if (workout.reps > existing.maxReps) {
    updatedRecord = {
      ...updatedRecord,
      maxReps: workout.reps,
      achievedAt: now,
    };
    updated = true;
  }
  if (workout.sets > existing.maxSets) {
    updatedRecord = {
      ...updatedRecord,
      maxSets: workout.sets,
      achievedAt: now,
    };
    updated = true;
  }

  if (updated) {
    savePRs(
      records.map((r) => (r.exerciseName === workout.name ? updatedRecord : r)),
    );
  }
}

export function usePersonalRecords() {
  return useQuery<PersonalRecord[]>({
    queryKey: ["personalRecords"],
    queryFn: getAllPRs,
  });
}

export function usePersonalRecord(exerciseName: string) {
  return useQuery<PersonalRecord | null>({
    queryKey: ["personalRecord", exerciseName],
    queryFn: () =>
      getAllPRs().find((r) => r.exerciseName === exerciseName) ?? null,
    enabled: exerciseName.trim().length > 0,
  });
}

// ============================================================
// CSV EXPORT
// ============================================================

function dateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let cur = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  while (cur <= end) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

function escapeCsv(v: string | number): string {
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function useExportNutritionCSV() {
  return useMutation({
    mutationFn: async ({
      startDate,
      endDate,
    }: {
      startDate: string;
      endDate: string;
    }) => {
      const rows: string[] = [
        [
          "Date",
          "Meal Type",
          "Food Name",
          "Calories (kcal)",
          "Protein (g)",
          "Carbs (g)",
          "Fat (g)",
        ].join(","),
      ];
      for (const date of dateRange(startDate, endDate)) {
        const meals = getMealsForDate(date);
        for (const m of meals) {
          rows.push(
            [
              date,
              m.mealType,
              escapeCsv(m.name),
              m.calories,
              m.proteinG,
              m.carbsG,
              m.fatG,
            ].join(","),
          );
        }
      }
      return rows.join("\n");
    },
  });
}

export function useExportFitnessCSV() {
  return useMutation({
    mutationFn: async ({
      startDate,
      endDate,
    }: {
      startDate: string;
      endDate: string;
    }) => {
      const rows: string[] = [
        [
          "Date",
          "Exercise",
          "Sets",
          "Reps",
          "Weight (kg)",
          "Calories Burned",
        ].join(","),
      ];
      for (const date of dateRange(startDate, endDate)) {
        const workouts = getWorkoutsForDate(date);
        for (const w of workouts) {
          rows.push(
            [
              date,
              escapeCsv(w.name),
              w.sets,
              w.reps,
              w.weightKg,
              w.caloriesBurned,
            ].join(","),
          );
        }
      }
      return rows.join("\n");
    },
  });
}

// ============================================================
// PROFILE PHOTO UPLOAD
// ============================================================

/**
 * Reads a File as a data URL, stores it as avatarUrl on the user's profile.
 * Returns the resulting data URL so callers can display it immediately.
 */
export function useUpdateProfilePhoto() {
  const qc = useQueryClient();
  const myId = getMyUserId();
  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      // Convert file to data URL in browser
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      // Persist as avatarUrl on profile
      const existing = storageGet<SocialProfile | null>(
        `social:profile:${myId}`,
        null,
      );
      const base: SocialProfile = existing ?? {
        userId: myId,
        username: "you",
        bio: "",
        avatarUrl: undefined,
        isPublic: false,
        followersCount: 0,
        followingCount: 0,
      };
      storageSet(`social:profile:${myId}`, { ...base, avatarUrl: dataUrl });
      return dataUrl;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social:profile", myId] });
      qc.invalidateQueries({ queryKey: ["social:feed"] });
    },
  });
}

// ============================================================
// MEAL SUGGESTIONS (smart static, based on remaining macros)
// ============================================================

/**
 * Compute best-fit meal suggestions from static food presets
 * based on remaining macro targets.
 */
function computeMealSuggestions(
  remainingCalories: number,
  remainingProtein: number,
  remainingCarbs: number,
  remainingFat: number,
): MealSuggestion[] {
  const needsProtein = remainingProtein > 15;
  const needsCarbs = remainingCarbs > 20;
  const needsFat = remainingFat > 8;

  const CANDIDATES: { id: number; grams: number; label?: string }[] = [
    { id: 8, grams: 150 },
    { id: 11, grams: 100 },
    { id: 13, grams: 120 },
    { id: 14, grams: 150 },
    { id: 10, grams: 120 },
    { id: 15, grams: 100 },
    { id: 18, grams: 150 },
    { id: 22, grams: 30, label: "Whey Protein Shake (30g)" },
    { id: 1, grams: 150 },
    { id: 3, grams: 80 },
    { id: 25, grams: 150 },
    { id: 4, grams: 120 },
    { id: 31, grams: 120 },
    { id: 44, grams: 200 },
    { id: 47, grams: 150 },
    { id: 48, grams: 180 },
    { id: 46, grams: 60 },
    { id: 19, grams: 120 },
    { id: 28, grams: 80 },
    { id: 40, grams: 30 },
    { id: 41, grams: 30 },
  ];

  const suggestions: (MealSuggestion & { score: number })[] = CANDIDATES.map(
    ({ id, grams, label }) => {
      const p = FOOD_PRESETS.find((fp) => fp.id === id);
      if (!p) return null;
      const factor = grams / 100;
      const cal = Math.round(p.caloriesPer100g * factor);
      const prot = Math.round(p.proteinPer100g * factor * 10) / 10;
      const carb = Math.round(p.carbsPer100g * factor * 10) / 10;
      const fat = Math.round(p.fatPer100g * factor * 10) / 10;

      let score = 0;
      if (cal <= remainingCalories + 50) score += 30;
      if (needsProtein && prot >= 15) score += 40;
      if (needsCarbs && carb >= 20) score += 20;
      if (needsFat && fat >= 5) score += 10;
      if (cal > remainingCalories + 200) score -= 40;

      const name = label ?? `${p.name} (${grams}g)`;
      return { name, calories: cal, protein: prot, carbs: carb, fat, score };
    },
  ).filter((s): s is MealSuggestion & { score: number } => s !== null);

  suggestions.sort((a, b) => b.score - a.score);

  const picked: MealSuggestion[] = [];
  const calorieBuckets = new Set<number>();
  for (const s of suggestions) {
    const bucket = Math.round(s.calories / 20);
    if (!calorieBuckets.has(bucket)) {
      calorieBuckets.add(bucket);
      const { score: _score, ...rest } = s;
      picked.push(rest);
      if (picked.length >= 5) break;
    }
  }
  return picked;
}

export function useSuggestMeals(
  remainingCalories: number,
  remainingProtein: number,
  remainingCarbs: number,
  remainingFat: number,
) {
  return useQuery<MealSuggestion[]>({
    queryKey: [
      "meal-suggestions",
      Math.round(remainingCalories),
      Math.round(remainingProtein),
      Math.round(remainingCarbs),
      Math.round(remainingFat),
    ],
    queryFn: () =>
      computeMealSuggestions(
        remainingCalories,
        remainingProtein,
        remainingCarbs,
        remainingFat,
      ),
    staleTime: 1000 * 60 * 2,
    enabled: false,
  });
}
