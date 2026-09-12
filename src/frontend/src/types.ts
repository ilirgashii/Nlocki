export interface Task {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  title: string;
  completed: boolean;
  createdAt: number;
}

export interface Workout {
  id: string;
  date: string;
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
  durationMin: number;
  caloriesBurned: number;
  notes: string;
  lastEditedSets?: string;
  lastEditedReps?: string;
  lastEditedWeight?: string;
}

export interface Meal {
  id: string;
  date: string;
  name: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  notes: string;
}

export interface WaterLog {
  date: string;
  totalMl: number;
}

export interface DailySummary {
  date: string;
  tasksTotal: number;
  tasksCompleted: number;
  /** Computed: tasksCompleted / tasksTotal (0–1), or 0 if no tasks */
  taskCompletionPct: number;
  totalCaloriesBurned: number;
  /** Alias kept for backwards compat with pages using totalCaloriesConsumed */
  totalCaloriesConsumed: number;
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  totalWaterMl: number;
  waterMl: number;
  workoutsCount: number;
  workoutCount: number;
}

export interface WeeklySummary {
  weekStartDate: string; // ISO YYYY-MM-DD of Monday
  days: DailySummary[];
  totalCaloriesConsumed: number;
  totalCaloriesBurned: number;
  totalWaterMl: number;
  workoutsCount: number;
  avgTaskCompletionPct: number;
}

export interface FoodPreset {
  id: number;
  name: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  category: string;
}

export type ThemeMode = "light" | "dark";

export interface UserGoals {
  dailyCalorieTarget: number;
  weeklyMinWorkouts: number;
}

// ---- Weekly Schedule Types ----
/** 0=Monday … 6=Sunday */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface WeeklyScheduleEntry {
  id: string;
  dayOfWeek: DayOfWeek;
  exerciseName: string;
  sets: number;
  reps: number;
  weightKg: number;
  lastEditedTimestamp?: string;
}

export interface NavItem {
  label: string;
  path: string;
  icon: string;
}

// ---- Social Types ----

export interface SocialProfile {
  userId: string;
  username: string;
  bio: string;
  avatarUrl?: string;
  isPublic: boolean;
  followersCount: number;
  followingCount: number;
  /** Display-only; no SMS verification performed */
  phone?: string;
  email?: string;
  displayName?: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorUsername: string;
  authorAvatarUrl?: string;
  text: string;
  photoUrl?: string;
  timestamp: number;
  likeCount: number;
  commentCount: number;
  isLikedByMe: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorUsername: string;
  text: string;
  timestamp: number;
}

export interface Story {
  id: string;
  authorId: string;
  authorUsername: string;
  photoUrl: string;
  text?: string;
  timestamp: number;
}

// ---- Fitness Stats Types ----

export interface WorkoutStreak {
  currentStreak: number;
  longestStreak: number;
  lastWorkoutDate: string | null;
}

export interface PersonalRecord {
  exerciseName: string;
  maxWeight: number | null;
  maxReps: number;
  maxSets: number;
  achievedAt: number; // Unix ms
}

// ---- Meal Suggestion Type ----

export interface MealSuggestion {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// ---- Messaging Types ----

export interface MessageReaction {
  emoji: string;
  userId: string;
  timestamp: number;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  text: string;
  timestamp: number;
  isRead: boolean;
  reactions?: MessageReaction[];
}

export interface ConversationSummary {
  otherUserId: string;
  otherUsername: string;
  otherAvatarUrl?: string;
  lastMessagePreview: string;
  lastTimestamp: number;
  unreadCount: number;
  isArchived: boolean;
}

export type MessageRequestStatus = "pending" | "accepted" | "declined";

export interface MessageRequest {
  id: string;
  senderId: string;
  senderUsername: string;
  senderAvatarUrl?: string;
  recipientId: string;
  previewText: string;
  timestamp: number;
  status: MessageRequestStatus;
}
