import type { backendInterface } from "../backend";

const today = new Date().toISOString().split("T")[0];

const sampleTasks = [
  { id: BigInt(1), title: "Morning Workout", date: today, completed: true },
  { id: BigInt(2), title: "Log Breakfast", date: today, completed: true },
  { id: BigInt(3), title: "Drink 8 Glasses of Water", date: today, completed: false },
  { id: BigInt(4), title: "Evening Stretch", date: today, completed: false },
];

const sampleWorkouts = [
  {
    id: BigInt(1),
    exerciseName: "Push-ups",
    sets: BigInt(3),
    reps: BigInt(15),
    weight: 0,
    date: today,
    timestamp: BigInt(Date.now()),
  },
  {
    id: BigInt(2),
    exerciseName: "Squats",
    sets: BigInt(4),
    reps: BigInt(12),
    weight: 60,
    date: today,
    timestamp: BigInt(Date.now()),
  },
];

const sampleMeals = [
  {
    id: BigInt(1),
    mealName: "Breakfast",
    calories: BigInt(420),
    protein: BigInt(30),
    carbs: BigInt(50),
    fat: BigInt(12),
    date: today,
    timestamp: BigInt(Date.now()),
  },
  {
    id: BigInt(2),
    mealName: "Lunch",
    calories: BigInt(650),
    protein: BigInt(45),
    carbs: BigInt(70),
    fat: BigInt(18),
    date: today,
    timestamp: BigInt(Date.now()),
  },
  {
    id: BigInt(3),
    mealName: "Dinner",
    calories: BigInt(580),
    protein: BigInt(38),
    carbs: BigInt(60),
    fat: BigInt(15),
    date: today,
    timestamp: BigInt(Date.now()),
  },
];

const sampleProfile = {
  userId: "mock-user-1",
  username: "fituser",
  displayName: undefined as string | undefined,
  email: undefined as string | undefined,
  phone: undefined as string | undefined,
  bio: "Fitness enthusiast",
  avatarUrl: undefined as string | undefined,
  isPublic: true,
  followersCount: BigInt(12),
  followingCount: BigInt(8),
};

const samplePosts = [
  {
    id: BigInt(1),
    authorId: "mock-user-1",
    authorUsername: "fituser",
    text: "Just crushed a 5km run! 💪",
    photoUrl: undefined as string | undefined,
    timestamp: BigInt(Date.now() - 3600000),
    likeCount: BigInt(5),
    commentCount: BigInt(2),
  },
];

const sampleStories = [
  {
    id: BigInt(1),
    authorId: "mock-user-1",
    authorUsername: "fituser",
    photoUrl: "/assets/generated/hero-fitness.jpg",
    text: "Morning workout done!" as string | undefined,
    timestamp: BigInt(Date.now() - 7200000),
  },
];

const sampleComments = [
  {
    id: BigInt(1),
    postId: BigInt(1),
    authorId: "mock-user-2",
    authorUsername: "gymbuddy",
    text: "Amazing! Keep it up!",
    timestamp: BigInt(Date.now() - 1800000),
  },
];

export const mockBackend: backendInterface = {
  // ── Meals ──────────────────────────────────────────────────────────────────
  addMeal: async (entry) => ({
    id: BigInt(99),
    ...entry,
    timestamp: BigInt(Date.now()),
  }),
  deleteMeal: async () => true,
  getMealsForDate: async () => sampleMeals,
  getMealsInRange: async () => sampleMeals,

  // ── Tasks ──────────────────────────────────────────────────────────────────
  addTask: async (date, title) => ({
    id: BigInt(99),
    title,
    date,
    completed: false,
  }),
  deleteTask: async () => true,
  getTasksForDate: async () => sampleTasks,
  toggleTask: async () => true,

  // ── Workouts ───────────────────────────────────────────────────────────────
  addWorkout: async (entry) => ({
    id: BigInt(99),
    ...entry,
    timestamp: BigInt(Date.now()),
  }),
  deleteWorkout: async () => true,
  getWorkoutsForDate: async () => sampleWorkouts,
  getWorkoutsInRange: async () => sampleWorkouts,

  // ── Water ──────────────────────────────────────────────────────────────────
  getWaterForDate: async () => ({ date: today, amount: BigInt(1500) }),
  logWater: async (date, amount) => ({ date, amount }),

  // ── Summary ────────────────────────────────────────────────────────────────
  getDailySummary: async () => ({
    workoutCount: BigInt(2),
    waterMl: BigInt(1500),
    totalCalories: BigInt(1650),
    totalProtein: BigInt(113),
    totalCarbs: BigInt(180),
    totalFat: BigInt(45),
    taskCompletionPct: 0.5,
  }),

  // ── Social: Profile ────────────────────────────────────────────────────────
  createOrGetProfile: async () => sampleProfile,
  updateProfile: async (username, email, phone, bio, displayName, isPublic) => ({
    ...sampleProfile,
    username: username ?? sampleProfile.username,
    displayName: displayName ?? undefined,
    email: email ?? undefined,
    phone: phone ?? undefined,
    bio: bio ?? sampleProfile.bio,
    isPublic: isPublic ?? sampleProfile.isPublic,
  }),
  getProfile: async () => sampleProfile,
  searchUsers: async () => [sampleProfile],
  getUserByUsername: async () => sampleProfile,

  // ── Social: Follow ─────────────────────────────────────────────────────────
  followUser: async () => {},
  unfollowUser: async () => {},
  getFollowers: async () => [],
  getFollowing: async () => [],
  isFollowing: async () => false,

  // ── Social: Posts ──────────────────────────────────────────────────────────
  createPost: async (text, photoUrl) => ({
    id: BigInt(99),
    authorId: "mock-user-1",
    authorUsername: "fituser",
    text,
    photoUrl: photoUrl ?? undefined,
    timestamp: BigInt(Date.now()),
    likeCount: BigInt(0),
    commentCount: BigInt(0),
  }),
  deletePost: async () => {},
  getFeed: async () => samplePosts,
  getUserPosts: async () => samplePosts,

  // ── Social: Likes ──────────────────────────────────────────────────────────
  likePost: async () => {},
  unlikePost: async () => {},
  hasLiked: async () => false,

  // ── Social: Comments ───────────────────────────────────────────────────────
  createComment: async (postId, text) => ({
    id: BigInt(99),
    postId,
    authorId: "mock-user-1",
    authorUsername: "fituser",
    text,
    timestamp: BigInt(Date.now()),
  }),
  deleteComment: async () => {},
  getComments: async () => sampleComments,

  // ── Social: Stories ────────────────────────────────────────────────────────
  createStory: async (photoUrl, text) => ({
    id: BigInt(99),
    authorId: "mock-user-1",
    authorUsername: "fituser",
    photoUrl,
    text: text ?? undefined,
    timestamp: BigInt(Date.now()),
  }),
  deleteStory: async () => {},
  getStories: async () => sampleStories,
  getUserStories: async () => sampleStories,

  // ── Weekly Schedule ────────────────────────────────────────────────────────
  getWeeklySchedule: async () => [],
  saveWeeklySchedule: async () => {},
  updateScheduleEntry: async () => true,
  clearScheduleDay: async () => {},

  // ── Food Presets ───────────────────────────────────────────────────────────
  getFoodPreset: async () => null,
  listFoodPresets: async () => [],
  searchFoodPresets: async () => [],

  // ── Export ─────────────────────────────────────────────────────────────────
  exportNutritionCSV: async () => "Date,Meal Type,Food Name,Calories (kcal),Protein (g),Carbs (g),Fat (g)\n",
  exportFitnessCSV: async () => "Date,Exercise,Sets,Reps,Weight (kg),Calories Burned\n",

  // ── Goals ──────────────────────────────────────────────────────────────────
  getGoals: async () => ({ dailyCalorieTarget: BigInt(2000), weeklyMinWorkouts: BigInt(3) }),
  saveGoals: async () => {},

  // ── Profile Photo ──────────────────────────────────────────────────────────
  updateProfilePhoto: async () => {},

  // ── Messaging ──────────────────────────────────────────────────────────────
  sendMessage: async (recipientId, text) => ({
    id: `msg-mock-${Date.now()}`,
    senderId: "mock-user-1",
    recipientId,
    text,
    timestamp: BigInt(Date.now()),
    isRead: false,
  }),
  sendMessageRequest: async (recipientId, previewText) => ({
    id: `req-mock-${Date.now()}`,
    senderId: "mock-user-1",
    recipientId,
    previewText,
    timestamp: BigInt(Date.now()),
    status: { pending: null } as never,
  }),
  acceptMessageRequest: async () => {},
  declineMessageRequest: async () => {},
  getConversations: async () => [],
  getMessages: async () => [],
  getMessageRequests: async () => [],
  markMessageRead: async () => {},
  deleteConversation: async () => {},
  canMessageUser: async () => true,

  // ── Profile (my own) ───────────────────────────────────────────────────────
  getMyProfile: async () => sampleProfile,

  // ── Weekly Summary ─────────────────────────────────────────────────────────
  getWeeklySummary: async () => ({
    avgCaloriesPerDay: 1650,
    avgWaterPerDay: 1500,
    workoutsThisWeek: BigInt(5),
  }),
};
