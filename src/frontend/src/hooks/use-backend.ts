import {
  comment,
  meal,
  mealInput,
  ms,
  nat,
  opt,
  post,
  profile,
  schedule,
  scheduleInput,
  story,
  workout,
  workoutInput,
} from "../lib/backend-client";
import type { BackendActor } from "../lib/backend-client";
import { preparePhoto } from "../lib/photo";
import type {
  DayOfWeek,
  Meal,
  SocialProfile,
  WeeklyScheduleEntry,
  Workout,
} from "../types";
import {
  useBackendMutation as mutation,
  useBackendQuery as query,
  useActor,
} from "./use-actor";

export const todayISO = () => new Date().toLocaleDateString("en-CA");
export function useMyUserId() {
  return useActor().userId;
}
const task = (t: {
  id: bigint;
  title: string;
  date: string;
  completed: boolean;
}) => ({ ...t, id: String(t.id), createdAt: 0 });
export function useTasksForDate(date: string) {
  return query(["tasks", date], async (a) =>
    (await a.getTasksForDate(date)).map(task),
  );
}
export function useAddTask() {
  return mutation(async (a, v: { date: string; title: string }) =>
    task(await a.addTask(v.date, v.title.trim())),
  );
}
export function useToggleTask() {
  return mutation((a, v: { date: string; id: string }) =>
    a.toggleTask(BigInt(v.id)),
  );
}
export function useDeleteTask() {
  return mutation((a, v: { date: string; id: string }) =>
    a.deleteTask(BigInt(v.id)),
  );
}
export function useWorkoutsForDate(date: string) {
  return query(["workouts", date], async (a) =>
    (await a.getWorkoutsForDate(date)).map(workout),
  );
}
export function useAddWorkout() {
  return mutation(async (a, v: Omit<Workout, "id">) =>
    workout(await a.addWorkout(workoutInput(v))),
  );
}
export function useDeleteWorkout() {
  return mutation((a, v: { date: string; id: string }) =>
    a.deleteWorkout(BigInt(v.id)),
  );
}
export function useUpdateWorkout() {
  return mutation(
    async (
      a,
      v: {
        oldId: string;
        date: string;
        updates: Partial<Omit<Workout, "id" | "date">>;
      },
    ) => {
      const old = (await a.getWorkoutsForDate(v.date)).find(
        (w) => String(w.id) === v.oldId,
      );
      if (!old) throw new Error("Workout not found");
      const saved = await a.updateWorkout(
        BigInt(v.oldId),
        workoutInput({ ...workout(old), ...v.updates }),
      );
      if (!saved.length) throw new Error("Workout not found");
      return workout(saved[0]);
    },
  );
}
export function useWorkoutsInRange(start: string, end: string) {
  return query(["workouts-range", start, end], async (a) =>
    (await a.getWorkoutsInRange(start, end)).map(workout),
  );
}
export function useMealsForDate(date: string) {
  return query(["meals", date], async (a) =>
    (await a.getMealsForDate(date)).map(meal),
  );
}
export function useAddMeal() {
  return mutation(async (a, v: Omit<Meal, "id">) =>
    meal(await a.addMeal(mealInput(v))),
  );
}
export function useDeleteMeal() {
  return mutation((a, v: { date: string; id: string }) =>
    a.deleteMeal(BigInt(v.id)),
  );
}
export function useMealsInRange(start: string, end: string) {
  return query(["meals-range", start, end], async (a) =>
    (await a.getMealsInRange(start, end)).map(meal),
  );
}
export function useWaterForDate(date: string) {
  return query(["water", date], async (a) => {
    const w = await a.getWaterForDate(date);
    return { date, totalMl: Number(w.amount) };
  });
}
export function useLogWater() {
  return mutation(async (a, v: { date: string; addMl: number }) => {
    const w = await a.logWater(v.date, nat(v.addMl));
    return { date: w.date, totalMl: Number(w.amount) };
  });
}
export function useDailySummary(date: string) {
  return query(["summary", date], async (a) => {
    const [tasks, rawWorkouts, rawMeals, water] = await Promise.all([
      a.getTasksForDate(date),
      a.getWorkoutsForDate(date),
      a.getMealsForDate(date),
      a.getWaterForDate(date),
    ]);
    const workouts = rawWorkouts.map(workout);
    const meals = rawMeals.map(meal);
    const tasksCompleted = tasks.filter((t) => t.completed).length;
    const consumed = meals.reduce((sum, m) => sum + m.calories, 0);
    return {
      date,
      tasksTotal: tasks.length,
      tasksCompleted,
      taskCompletionPct: tasks.length ? tasksCompleted / tasks.length : 0,
      unestimatedWorkouts: workouts.filter(
        (w) => w.durationMin <= 0 && w.caloriesBurned <= 0,
      ).length,
      totalCaloriesBurned: workouts.reduce(
        (sum, w) => sum + w.caloriesBurned,
        0,
      ),
      totalCaloriesConsumed: consumed,
      totalCalories: consumed,
      totalProteinG: meals.reduce((sum, m) => sum + m.proteinG, 0),
      totalCarbsG: meals.reduce((sum, m) => sum + m.carbsG, 0),
      totalFatG: meals.reduce((sum, m) => sum + m.fatG, 0),
      totalWaterMl: Number(water.amount),
      waterMl: Number(water.amount),
      workoutsCount: workouts.length,
      workoutCount: workouts.length,
    };
  });
}
export function useGoals() {
  return query(["goals"], async (a) => {
    const g = await a.getGoals();
    return {
      dailyCalorieTarget: Number(g.dailyCalorieTarget),
      weeklyMinWorkouts: Number(g.weeklyMinWorkouts),
    };
  });
}
export function useSaveGoals() {
  return mutation(
    (a, v: { dailyCalorieTarget: number; weeklyMinWorkouts: number }) =>
      a.saveGoals(nat(v.dailyCalorieTarget), nat(v.weeklyMinWorkouts)),
  );
}
const preset = (
  p: Awaited<ReturnType<BackendActor["listFoodPresets"]>>[number],
) => ({ ...p, id: Number(p.id), caloriesPer100g: Number(p.caloriesPer100g) });
export function useFoodPresets() {
  return query(["food-presets"], async (a) =>
    (await a.listFoodPresets()).map(preset),
  );
}
export function useSearchFoodPresets(term: string) {
  return query(["food-search", term], async (a) =>
    (await a.searchFoodPresets(term)).map(preset),
  );
}
export function useWeeklySchedule() {
  return query(["schedule"], async (a) =>
    (await a.getWeeklySchedule()).map(schedule),
  );
}
export function useSaveWeeklySchedule() {
  return mutation((a, v: WeeklyScheduleEntry[]) =>
    a.saveWeeklySchedule(v.map(scheduleInput)),
  );
}
export function useUpdateScheduleEntry() {
  return mutation((a, v: WeeklyScheduleEntry) =>
    a.updateScheduleEntry(scheduleInput(v)),
  );
}
export function useClearScheduleDay() {
  return mutation((a, v: DayOfWeek) => a.clearScheduleDay(nat(v)));
}
export function useMyProfile() {
  return query(["my-profile"], async (a) =>
    profile((await a.getMyProfile())[0] ?? (await a.createOrGetProfile())),
  );
}
export function useProfile(userId: string) {
  return query(
    ["profile", userId],
    async (a) => {
      const p = await a.getProfile(userId);
      return p.length ? profile(p[0]) : null;
    },
    !!userId,
  );
}
export function useUpdateProfile() {
  return mutation(async (a, v: Partial<SocialProfile>) =>
    profile(
      await a.updateProfile(
        opt(v.username),
        opt(v.email),
        opt(v.phone),
        opt(v.bio),
        opt(v.displayName),
        opt(v.isPublic),
      ),
    ),
  );
}
export function useSearchUsers(term: string) {
  const myId = useMyUserId();
  return query(
    ["search-users", term],
    async (a) =>
      (await a.searchUsers(term.trim()))
        .map(profile)
        .filter((p) => p.userId !== myId),
    !!term.trim(),
  );
}
export function useFollowing() {
  const id = useMyUserId();
  return query(["following"], async (a) =>
    (await a.getFollowing(id)).map(profile),
  );
}
export function useFollowers() {
  const id = useMyUserId();
  return query(["followers"], async (a) =>
    (await a.getFollowers(id)).map(profile),
  );
}
export function useIsFollowing(id: string) {
  return query(["is-following", id], (a) => a.isFollowing(id), !!id);
}
export function useFollowUser() {
  return mutation((a, id: string) => a.followUser(id));
}
export function useUnfollowUser() {
  return mutation((a, id: string) => a.unfollowUser(id));
}
export function useFeed() {
  return query(
    ["feed"],
    async (a) => Promise.all((await a.getFeed()).map((p) => post(p, a))),
    true,
    15000,
  );
}
export function useUserPosts(id: string) {
  return query(
    ["user-posts", id],
    async (a) => Promise.all((await a.getUserPosts(id)).map((p) => post(p, a))),
    !!id,
  );
}
export function useCreatePost() {
  return mutation(async (a, v: { text: string; photoUrl?: string }) =>
    post(await a.createPost(v.text.trim(), opt(v.photoUrl)), a),
  );
}
export function useDeletePost() {
  return mutation((a, id: string) => a.deletePost(BigInt(id)));
}
export function useLikePost() {
  return mutation((a, id: string) => a.likePost(BigInt(id)));
}
export function useUnlikePost() {
  return mutation((a, id: string) => a.unlikePost(BigInt(id)));
}
export function useComments(id: string) {
  return query(
    ["comments", id],
    async (a) => (await a.getComments(BigInt(id))).map(comment),
    !!id,
  );
}
export function useAddComment() {
  return mutation(async (a, v: { postId: string; text: string }) =>
    comment(await a.createComment(BigInt(v.postId), v.text.trim())),
  );
}
export function useDeleteComment() {
  return mutation((a, v: { commentId: string; postId: string }) =>
    a.deleteComment(BigInt(v.commentId)),
  );
}
export function useStories() {
  return query(
    ["stories"],
    async (a) => (await a.getStories()).map(story),
    true,
    30000,
  );
}
export function useCreateStory() {
  return mutation(async (a, v: { photoUrl: string; text?: string }) =>
    story(await a.createStory(v.photoUrl, opt(v.text))),
  );
}
export function useDeleteStory() {
  return mutation((a, id: string) => a.deleteStory(BigInt(id)));
}
export function useWorkoutStreak() {
  return query(["streak"], async (a) => {
    const s = await a.getWorkoutStreak();
    return {
      currentStreak: Number(s.currentStreak),
      longestStreak: Number(s.longestStreak),
      lastWorkoutDate: s.lastWorkoutDate[0] ?? null,
    };
  });
}
const record = (
  r: Awaited<ReturnType<BackendActor["getPersonalRecords"]>>[number],
) => ({
  exerciseName: r.exerciseName,
  maxWeight: r.maxWeight[0] ?? null,
  maxReps: Number(r.maxReps),
  maxSets: Number(r.maxSets),
  achievedAt: ms(r.achievedAt),
});
export function usePersonalRecords() {
  return query(["records"], async (a) =>
    (await a.getPersonalRecords()).map(record),
  );
}
export function usePersonalRecord(name: string) {
  return query(
    ["record", name],
    async (a) => {
      const r = await a.getPersonalRecord(name);
      return r.length ? record(r[0]) : null;
    },
    !!name.trim(),
  );
}
const csv = (value: string | number) => {
  const text = String(value);
  const s =
    typeof value === "string" && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export function useExportNutritionCSV() {
  return mutation(async (a, v: { startDate: string; endDate: string }) => {
    const meals = (await a.getMealsInRange(v.startDate, v.endDate)).map(meal);
    return [
      "Date,Meal Type,Food Name,Calories (kcal),Protein (g),Carbs (g),Fat (g)",
      ...meals.map((m) =>
        [m.date, m.mealType, m.name, m.calories, m.proteinG, m.carbsG, m.fatG]
          .map(csv)
          .join(","),
      ),
    ].join("\n");
  });
}
export function useExportFitnessCSV() {
  return mutation(async (a, v: { startDate: string; endDate: string }) => {
    const workouts = (await a.getWorkoutsInRange(v.startDate, v.endDate)).map(
      workout,
    );
    return [
      "Date,Exercise,Sets,Reps,Weight (kg),Calories Burned",
      ...workouts.map((w) =>
        [w.date, w.name, w.sets, w.reps, w.weightKg, w.caloriesBurned]
          .map(csv)
          .join(","),
      ),
    ].join("\n");
  });
}
export function useUpdateProfilePhoto() {
  return mutation(async (a, file: File) => {
    const url = await preparePhoto(file);
    await a.updateProfilePhoto(url);
    return url;
  });
}
export function useSuggestMeals(
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
) {
  return query(["suggestions", calories, protein, carbs, fat], (a) =>
    a.suggestMeals(calories, protein, carbs, fat),
  );
}

export function useRecentActivity(dates: string[]) {
  return query(["activity", ...dates], async (a) =>
    Promise.all(
      dates.map(async (date) => {
        const [tasks, water] = await Promise.all([
          a.getTasksForDate(date),
          a.getWaterForDate(date),
        ]);
        return {
          date,
          total: tasks.length,
          completed: tasks.filter((t) => t.completed).length,
          water: Number(water.amount),
        };
      }),
    ),
  );
}
