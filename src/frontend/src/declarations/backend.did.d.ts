import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';
import type { IDL } from '@dfinity/candid';

export interface Comment {
  'id' : bigint,
  'authorUsername' : string,
  'authorId' : string,
  'text' : string,
  'timestamp' : Timestamp,
  'postId' : bigint,
}
export interface ConversationSummary {
  'lastMessageTime' : bigint,
  'otherUsername' : string,
  'otherUserId' : string,
  'lastMessage' : string,
  'unreadCount' : bigint,
}
export type DayOfWeek = bigint;
export interface EntryView {
  'id' : [] | [string],
  'lastEditedTimestamp' : [] | [Timestamp],
  'lastEditedWeight' : [] | [number],
  'dayOfWeek' : DayOfWeek,
  'reps' : bigint,
  'sets' : bigint,
  'weightKg' : [] | [number],
  'exerciseName' : string,
}
export interface FoodPreset {
  'id' : bigint,
  'proteinPer100g' : number,
  'name' : string,
  'carbsPer100g' : number,
  'fatPer100g' : number,
  'caloriesPer100g' : bigint,
  'category' : string,
}
export interface MealInput {
  'fat' : bigint,
  'carbs' : bigint,
  'date' : string,
  'calories' : bigint,
  'details' : [] | [string],
  'mealName' : string,
  'protein' : bigint,
}
export interface MealSuggestion {
  'fat' : number,
  'carbs' : number,
  'calories' : number,
  'name' : string,
  'protein' : number,
}
export interface MealView {
  'id' : bigint,
  'fat' : bigint,
  'carbs' : bigint,
  'date' : string,
  'calories' : bigint,
  'timestamp' : bigint,
  'details' : [] | [string],
  'mealName' : string,
  'protein' : bigint,
}
export interface Message {
  'id' : MessageId,
  'text' : string,
  'isRead' : boolean,
  'timestamp' : bigint,
  'recipientId' : string,
  'reactions' : Array<MessageReaction>,
  'senderId' : string,
}
export type MessageId = string;
export interface MessageReaction {
  'userId' : Principal,
  'emoji' : string,
  'timestamp' : bigint,
}
export interface MessageRequest {
  'id' : string,
  'status' : RequestStatus,
  'timestamp' : bigint,
  'previewText' : string,
  'recipientId' : string,
  'senderId' : string,
}
export interface PersonalRecord {
  'maxWeight' : [] | [number],
  'achievedAt' : Timestamp,
  'exerciseName' : string,
  'maxReps' : bigint,
  'maxSets' : bigint,
}
export interface Post {
  'id' : bigint,
  'authorUsername' : string,
  'likeCount' : bigint,
  'authorId' : string,
  'text' : string,
  'photoUrl' : [] | [string],
  'timestamp' : Timestamp,
  'commentCount' : bigint,
}
export type RequestStatus = { 'pending' : null } |
  { 'accepted' : null } |
  { 'declined' : null };
export interface Story {
  'id' : bigint,
  'authorUsername' : string,
  'authorId' : string,
  'text' : [] | [string],
  'photoUrl' : string,
  'timestamp' : Timestamp,
}
export interface Task {
  'id' : bigint,
  'title' : string,
  'date' : string,
  'completed' : boolean,
}
export type Timestamp = bigint;
export interface UserGoals {
  'weeklyMinWorkouts' : bigint,
  'dailyCalorieTarget' : bigint,
}
export interface UserProfile {
  'bio' : string,
  'username' : string,
  'displayName' : [] | [string],
  'userId' : string,
  'followersCount' : bigint,
  'email' : [] | [string],
  'avatarUrl' : [] | [string],
  'followingCount' : bigint,
  'isPublic' : boolean,
  'phone' : [] | [string],
}
export interface WaterLog { 'date' : string, 'amount' : bigint }
export interface WorkoutInput {
  'weight' : [] | [number],
  'date' : string,
  'reps' : bigint,
  'sets' : bigint,
  'exerciseName' : string,
  'details' : [] | [string],
}
export interface WorkoutStreak {
  'lastWorkoutDate' : [] | [string],
  'longestStreak' : bigint,
  'currentStreak' : bigint,
}
export interface WorkoutView {
  'id' : bigint,
  'weight' : [] | [number],
  'date' : string,
  'reps' : bigint,
  'sets' : bigint,
  'timestamp' : bigint,
  'exerciseName' : string,
  'details' : [] | [string],
}
export interface _SERVICE {
  'acceptMessageRequest' : ActorMethod<[string], undefined>,
  'addMeal' : ActorMethod<[MealInput], MealView>,
  'addReaction' : ActorMethod<[string, string], undefined>,
  'addTask' : ActorMethod<[string, string], Task>,
  'addWorkout' : ActorMethod<[WorkoutInput], WorkoutView>,
  'beginSecondFactorSetup' : ActorMethod<[], { 'secret' : string }>,
  'canMessageUser' : ActorMethod<[string], boolean>,
  'clearScheduleDay' : ActorMethod<[bigint], undefined>,
  'confirmSecondFactorSetup' : ActorMethod<
    [string, Principal],
    { 'ok' : Array<string> } |
      { 'error' : string }
  >,
  'createComment' : ActorMethod<[bigint, string], Comment>,
  'createOrGetProfile' : ActorMethod<[], UserProfile>,
  'createPost' : ActorMethod<[string, [] | [string]], Post>,
  'createStory' : ActorMethod<[string, [] | [string]], Story>,
  'declineMessageRequest' : ActorMethod<[string], undefined>,
  'deleteComment' : ActorMethod<[bigint], undefined>,
  'deleteConversation' : ActorMethod<[string], undefined>,
  'deleteMeal' : ActorMethod<[bigint], boolean>,
  'deletePost' : ActorMethod<[bigint], undefined>,
  'deleteStory' : ActorMethod<[bigint], undefined>,
  'deleteTask' : ActorMethod<[bigint], boolean>,
  'deleteWorkout' : ActorMethod<[bigint], boolean>,
  'disableSecondFactor' : ActorMethod<
    [string],
    { 'ok' : null } |
      { 'error' : string }
  >,
  'exportFitnessCSV' : ActorMethod<[string, string], string>,
  'exportNutritionCSV' : ActorMethod<[string, string], string>,
  'followUser' : ActorMethod<[string], undefined>,
  'getArchivedConversations' : ActorMethod<[], Array<string>>,
  'getComments' : ActorMethod<[bigint], Array<Comment>>,
  'getConversations' : ActorMethod<[], Array<ConversationSummary>>,
  'getDailySummary' : ActorMethod<
    [string],
    {
      'waterMl' : bigint,
      'totalCarbs' : bigint,
      'workoutCount' : bigint,
      'taskCompletionPct' : number,
      'totalFat' : bigint,
      'totalCalories' : bigint,
      'totalProtein' : bigint,
    }
  >,
  'getFeed' : ActorMethod<[], Array<Post>>,
  'getFollowers' : ActorMethod<[string], Array<UserProfile>>,
  'getFollowing' : ActorMethod<[string], Array<UserProfile>>,
  'getFoodPreset' : ActorMethod<[bigint], [] | [FoodPreset]>,
  'getGoals' : ActorMethod<[], UserGoals>,
  'getMealsForDate' : ActorMethod<[string], Array<MealView>>,
  'getMealsInRange' : ActorMethod<[string, string], Array<MealView>>,
  'getMessageRequests' : ActorMethod<[], Array<MessageRequest>>,
  'getMessages' : ActorMethod<[string], Array<Message>>,
  'getMyProfile' : ActorMethod<[], [] | [UserProfile]>,
  'getPersonalRecord' : ActorMethod<[string], [] | [PersonalRecord]>,
  'getPersonalRecords' : ActorMethod<[], Array<PersonalRecord>>,
  'getProfile' : ActorMethod<[string], [] | [UserProfile]>,
  'getSecondFactorStatus' : ActorMethod<[], { 'enabled' : boolean }>,
  'getStories' : ActorMethod<[], Array<Story>>,
  'getTasksForDate' : ActorMethod<[string], Array<Task>>,
  'getUserByUsername' : ActorMethod<[string], [] | [UserProfile]>,
  'getUserPosts' : ActorMethod<[string], Array<Post>>,
  'getUserStories' : ActorMethod<[string], Array<Story>>,
  'getWaterForDate' : ActorMethod<[string], WaterLog>,
  'getWeeklySchedule' : ActorMethod<[], Array<EntryView>>,
  'getWeeklySummary' : ActorMethod<
    [string, string],
    {
      'avgWaterPerDay' : number,
      'avgCaloriesPerDay' : number,
      'workoutsThisWeek' : bigint,
    }
  >,
  'getWorkoutStreak' : ActorMethod<[], WorkoutStreak>,
  'getWorkoutsForDate' : ActorMethod<[string], Array<WorkoutView>>,
  'getWorkoutsInRange' : ActorMethod<[string, string], Array<WorkoutView>>,
  'hasLiked' : ActorMethod<[bigint], boolean>,
  'isFollowing' : ActorMethod<[string], boolean>,
  'likePost' : ActorMethod<[bigint], undefined>,
  'listFoodPresets' : ActorMethod<[], Array<FoodPreset>>,
  'logWater' : ActorMethod<[string, bigint], WaterLog>,
  'markMessageRead' : ActorMethod<[string], undefined>,
  'prepareSecondFactorSession' : ActorMethod<[], undefined>,
  'removeReaction' : ActorMethod<[string, string], undefined>,
  'revokeSecondFactorSessions' : ActorMethod<[], undefined>,
  'saveGoals' : ActorMethod<[bigint, bigint], undefined>,
  'saveWeeklySchedule' : ActorMethod<[Array<EntryView>], undefined>,
  'searchFoodPresets' : ActorMethod<[string], Array<FoodPreset>>,
  'searchUsers' : ActorMethod<[string], Array<UserProfile>>,
  'sendMessage' : ActorMethod<[string, string], Message>,
  'sendMessageRequest' : ActorMethod<[string, string], MessageRequest>,
  'suggestMeals' : ActorMethod<
    [number, number, number, number],
    Array<MealSuggestion>
  >,
  'toggleArchivedConversation' : ActorMethod<[string], undefined>,
  'toggleTask' : ActorMethod<[bigint], boolean>,
  'unfollowUser' : ActorMethod<[string], undefined>,
  'unlikePost' : ActorMethod<[bigint], undefined>,
  'updateProfile' : ActorMethod<
    [
      [] | [string],
      [] | [string],
      [] | [string],
      [] | [string],
      [] | [string],
      [] | [boolean],
    ],
    UserProfile
  >,
  'updateProfilePhoto' : ActorMethod<[string], undefined>,
  'updateScheduleEntry' : ActorMethod<[EntryView], boolean>,
  'updateWorkout' : ActorMethod<[bigint, WorkoutInput], [] | [WorkoutView]>,
  'verifySecondFactor' : ActorMethod<
    [string, Principal],
    { 'ok' : null } |
      { 'error' : string }
  >,
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
