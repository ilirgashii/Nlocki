import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface WorkoutInput {
    weight?: number;
    date: string;
    reps: bigint;
    sets: bigint;
    exerciseName: string;
}
export interface PersonalRecord {
    maxWeight?: number;
    achievedAt: Timestamp;
    exerciseName: string;
    maxReps: bigint;
    maxSets: bigint;
}
export type Timestamp = bigint;
export interface Meal {
    id: bigint;
    fat: bigint;
    carbs: bigint;
    date: string;
    calories: bigint;
    timestamp: bigint;
    mealName: string;
    protein: bigint;
}
export interface Comment {
    id: bigint;
    authorUsername: string;
    authorId: string;
    text: string;
    timestamp: Timestamp;
    postId: bigint;
}
export interface Story {
    id: bigint;
    authorUsername: string;
    authorId: string;
    text?: string;
    photoUrl: string;
    timestamp: Timestamp;
}
export interface Task {
    id: bigint;
    title: string;
    date: string;
    completed: boolean;
}
export interface FoodPreset {
    id: bigint;
    proteinPer100g: number;
    name: string;
    carbsPer100g: number;
    fatPer100g: number;
    caloriesPer100g: bigint;
    category: string;
}
export interface MessageRequest {
    id: string;
    status: RequestStatus;
    timestamp: bigint;
    previewText: string;
    recipientId: string;
    senderId: string;
}
export interface WaterLog {
    date: string;
    amount: bigint;
}
export interface MessageReaction {
    userId: Principal;
    emoji: string;
    timestamp: bigint;
}
export interface WeeklyScheduleEntry {
    lastEditedTimestamp?: Timestamp;
    lastEditedWeight?: number;
    dayOfWeek: DayOfWeek;
    reps: bigint;
    sets: bigint;
    weightKg?: number;
    exerciseName: string;
}
export type MessageId = string;
export interface UserGoals {
    weeklyMinWorkouts: bigint;
    dailyCalorieTarget: bigint;
}
export interface Post {
    id: bigint;
    authorUsername: string;
    likeCount: bigint;
    authorId: string;
    text: string;
    photoUrl?: string;
    timestamp: Timestamp;
    commentCount: bigint;
}
export interface Message {
    id: MessageId;
    text: string;
    isRead: boolean;
    timestamp: bigint;
    recipientId: string;
    reactions: Array<MessageReaction>;
    senderId: string;
}
export interface WorkoutStreak {
    lastWorkoutDate?: string;
    longestStreak: bigint;
    currentStreak: bigint;
}
export interface MealSuggestion {
    fat: number;
    carbs: number;
    calories: number;
    name: string;
    protein: number;
}
export interface Workout {
    id: bigint;
    weight?: number;
    date: string;
    reps: bigint;
    sets: bigint;
    timestamp: bigint;
    exerciseName: string;
}
export interface MealInput {
    fat: bigint;
    carbs: bigint;
    date: string;
    calories: bigint;
    mealName: string;
    protein: bigint;
}
export type DayOfWeek = bigint;
export interface UserProfile {
    bio: string;
    username: string;
    displayName?: string;
    userId: string;
    followersCount: bigint;
    email?: string;
    avatarUrl?: string;
    followingCount: bigint;
    isPublic: boolean;
    phone?: string;
}
export interface ConversationSummary {
    lastMessageTime: bigint;
    otherUsername: string;
    otherUserId: string;
    lastMessage: string;
    unreadCount: bigint;
}
export enum RequestStatus {
    pending = "pending",
    accepted = "accepted",
    declined = "declined"
}
export interface backendInterface {
    acceptMessageRequest(requestId: string): Promise<void>;
    addMeal(entry: MealInput): Promise<Meal>;
    addReaction(messageId: string, emoji: string): Promise<void>;
    addTask(date: string, title: string): Promise<Task>;
    addWorkout(entry: WorkoutInput): Promise<Workout>;
    canMessageUser(targetUserId: string): Promise<boolean>;
    clearScheduleDay(dayOfWeek: bigint): Promise<void>;
    createComment(postId: bigint, text: string): Promise<Comment>;
    createOrGetProfile(): Promise<UserProfile>;
    createPost(text: string, photoUrl: string | null): Promise<Post>;
    createStory(photoUrl: string, text: string | null): Promise<Story>;
    declineMessageRequest(requestId: string): Promise<void>;
    deleteComment(commentId: bigint): Promise<void>;
    deleteConversation(otherUserId: string): Promise<void>;
    deleteMeal(id: bigint): Promise<boolean>;
    deletePost(postId: bigint): Promise<void>;
    deleteStory(storyId: bigint): Promise<void>;
    deleteTask(taskId: bigint): Promise<boolean>;
    deleteWorkout(id: bigint): Promise<boolean>;
    exportFitnessCSV(startDate: string, endDate: string): Promise<string>;
    exportNutritionCSV(startDate: string, endDate: string): Promise<string>;
    followUser(targetId: string): Promise<void>;
    getComments(postId: bigint): Promise<Array<Comment>>;
    getConversations(): Promise<Array<ConversationSummary>>;
    getDailySummary(date: string): Promise<{
        waterMl: bigint;
        totalCarbs: bigint;
        workoutCount: bigint;
        taskCompletionPct: number;
        totalFat: bigint;
        totalCalories: bigint;
        totalProtein: bigint;
    }>;
    getFeed(): Promise<Array<Post>>;
    getFollowers(userId: string): Promise<Array<UserProfile>>;
    getFollowing(userId: string): Promise<Array<UserProfile>>;
    getFoodPreset(id: bigint): Promise<FoodPreset | null>;
    getGoals(): Promise<UserGoals>;
    getMealsForDate(date: string): Promise<Array<Meal>>;
    getMealsInRange(startDate: string, endDate: string): Promise<Array<Meal>>;
    getMessageRequests(): Promise<Array<MessageRequest>>;
    getMessages(otherUserId: string): Promise<Array<Message>>;
    getMyProfile(): Promise<UserProfile | null>;
    getPersonalRecord(exerciseName: string): Promise<PersonalRecord | null>;
    getPersonalRecords(): Promise<Array<PersonalRecord>>;
    getProfile(userId: string): Promise<UserProfile | null>;
    getStories(): Promise<Array<Story>>;
    getTasksForDate(date: string): Promise<Array<Task>>;
    getUserByUsername(username: string): Promise<UserProfile | null>;
    getUserPosts(userId: string): Promise<Array<Post>>;
    getUserStories(userId: string): Promise<Array<Story>>;
    getWaterForDate(date: string): Promise<WaterLog>;
    getWeeklySchedule(): Promise<Array<WeeklyScheduleEntry>>;
    getWeeklySummary(startDate: string, endDate: string): Promise<{
        avgWaterPerDay: number;
        avgCaloriesPerDay: number;
        workoutsThisWeek: bigint;
    }>;
    getWorkoutStreak(): Promise<WorkoutStreak>;
    getWorkoutsForDate(date: string): Promise<Array<Workout>>;
    getWorkoutsInRange(startDate: string, endDate: string): Promise<Array<Workout>>;
    hasLiked(postId: bigint): Promise<boolean>;
    isFollowing(targetId: string): Promise<boolean>;
    likePost(postId: bigint): Promise<void>;
    listFoodPresets(): Promise<Array<FoodPreset>>;
    logWater(date: string, amount: bigint): Promise<WaterLog>;
    markMessageRead(messageId: string): Promise<void>;
    removeReaction(messageId: string, emoji: string): Promise<void>;
    saveGoals(dailyCalorieTarget: bigint, weeklyMinWorkouts: bigint): Promise<void>;
    saveWeeklySchedule(entries: Array<WeeklyScheduleEntry>): Promise<void>;
    searchFoodPresets(nameQuery: string): Promise<Array<FoodPreset>>;
    searchUsers(searchTerm: string): Promise<Array<UserProfile>>;
    sendMessage(recipientId: string, text: string): Promise<Message>;
    sendMessageRequest(recipientId: string, previewText: string): Promise<MessageRequest>;
    suggestMeals(remainingCalories: number, remainingProtein: number, remainingCarbs: number, remainingFat: number): Promise<Array<MealSuggestion>>;
    toggleTask(taskId: bigint): Promise<boolean>;
    unfollowUser(targetId: string): Promise<void>;
    unlikePost(postId: bigint): Promise<void>;
    updateProfile(username: string | null, email: string | null, phone: string | null, bio: string | null, displayName: string | null, isPublic: boolean | null): Promise<UserProfile>;
    updateProfilePhoto(url: string): Promise<void>;
    updateScheduleEntry(entry: WeeklyScheduleEntry): Promise<boolean>;
}
