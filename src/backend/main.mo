import List "mo:core/List";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Principal "mo:core/Principal";
import TaskTypes "types/tasks";
import WorkoutTypes "types/workouts";
import MealTypes "types/meals";
import SocialTypes "types/social";
import ScheduleTypes "types/schedule";
import TasksApi "mixins/tasks-api";
import WorkoutsApi "mixins/workouts-api";
import MealsApi "mixins/meals-api";
import WaterApi "mixins/water-api";
import SummaryApi "mixins/summary-api";
import SocialApi "mixins/social-api";
import ScheduleApi "mixins/schedule-api";
import FoodPresetsApi "mixins/foodpresets-api";
import GoalsApi "mixins/goals-api";
import GoalTypes "types/goals";
import ExportApi "mixins/export-api";
import MessagingApi "mixins/messaging-api";
import MessagingTypes "types/messaging";
import StreakApi "mixins/streak-api";
import MealsSuggestApi "mixins/meals-suggest-api";
import Migration "migration";

(with migration = Migration.run)
actor {
  // Per-user task store: Principal → List<Task>
  let tasks = Map.empty<Principal, List.List<TaskTypes.Task>>();
  // Per-user workout store: Principal → List<Workout>
  let workouts = Map.empty<Principal, List.List<WorkoutTypes.Workout>>();
  // Per-user meal store: Principal → List<Meal>
  let meals = Map.empty<Principal, List.List<MealTypes.Meal>>();
  // Per-user water store: Principal → (Date → ml)
  let waterStore = Map.empty<Principal, Map.Map<Text, Nat>>();

  let nextId = { var value : Nat = 0 };

  // Social state
  let profiles = Map.empty<Text, SocialTypes.UserProfileInternal>();
  let follows = Map.empty<Text, Set.Set<Text>>();
  let followers = Map.empty<Text, Set.Set<Text>>();
  let socialPosts = List.empty<SocialTypes.PostInternal>();
  let socialComments = List.empty<SocialTypes.CommentInternal>();
  let socialStories = List.empty<SocialTypes.StoryInternal>();
  let socialLikes = Map.empty<Nat, Set.Set<Text>>();
  let nextSocialId = { var value : Nat = 0 };

  // Weekly schedule state: per-user map keyed by Principal
  let weeklySchedules = Map.empty<Principal, [ScheduleTypes.WeeklyScheduleEntry]>();

  // Per-user goals store
  let goalsStore = Map.empty<Principal, GoalTypes.UserGoals>();

  // Messaging state
  let messages = List.empty<MessagingTypes.Message>();
  let messageRequests = List.empty<MessagingTypes.MessageRequest>();
  let blockedSenders = List.empty<MessagingTypes.BlockEntry>();
  let messageCounter = { var value : Nat = 0 };
  let requestCounter = { var value : Nat = 0 };

  include TasksApi(tasks, nextId);
  include WorkoutsApi(workouts, nextId);
  include MealsApi(meals, nextId);
  include WaterApi(waterStore);
  include SummaryApi(tasks, workouts, meals, waterStore);
  include SocialApi(profiles, follows, followers, socialPosts, socialComments, socialStories, socialLikes, nextSocialId);
  include ScheduleApi(weeklySchedules);
  include FoodPresetsApi();
  include GoalsApi(goalsStore);
  include ExportApi(meals, workouts);
  include MessagingApi(messages, messageRequests, blockedSenders, messageCounter, requestCounter, follows, profiles);
  include StreakApi(workouts);
  include MealsSuggestApi();
};
