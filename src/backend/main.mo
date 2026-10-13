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
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import SecurityApi "mixins/security-api";

actor {
  let secondFactors = Map.empty<Principal, { secret : Blob; used : ?Nat; recovery : [Blob] }>();
  let secondFactorPending = Map.empty<Principal, { secret : Blob; expires : Int }>();
  let secondFactorSessions = Map.empty<Principal, { owner : Principal; expires : Int }>();
  let secondFactorAttempts = Map.empty<Principal, { count : Nat; lockedUntil : Int }>();
  func authorizeCaller(caller : Principal) : Principal {
    if (caller.isAnonymous()) Runtime.trap("Sign in required");
    switch (secondFactorSessions.get(caller)) {
      case (?session) { if (session.expires <= Time.now()) Runtime.trap("Second-factor session expired"); return session.owner };
      case null {};
    };
    switch (secondFactors.get(caller)) { case (?_) Runtime.trap("Second factor required"); case null caller };
  };
  let secondFactorRegisteredKeys = Map.empty<Principal, Int>();

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
  let deletedMessages = Map.empty<Principal, Set.Set<Text>>();
  let messages = List.empty<MessagingTypes.Message>();
  let messageRequests = List.empty<MessagingTypes.MessageRequest>();
  let blockedSenders = List.empty<MessagingTypes.BlockEntry>();
  let messageCounter = { var value : Nat = 0 };
  let requestCounter = { var value : Nat = 0 };

  let archivedConversations = Map.empty<Principal, Set.Set<Text>>();
  public shared query ({ caller = signer }) func getArchivedConversations() : async [Text] {
    let caller = authorizeCaller(signer);
    switch (archivedConversations.get(caller)) { case (?entries) entries.toArray(); case null [] };
  };
  public shared ({ caller = signer }) func toggleArchivedConversation(otherUserId : Text) : async () {
    let caller = authorizeCaller(signer);
    let entries = switch (archivedConversations.get(caller)) {
      case (?entries) entries;
      case null { let entries = Set.empty<Text>(); archivedConversations.add(caller, entries); entries };
    };
    if (entries.contains(otherUserId)) { entries.remove(otherUserId) } else { entries.add(otherUserId) };
  };

  let workoutDetails = Map.empty<Nat, Text>();
  let mealDetails = Map.empty<Nat, Text>();
  let scheduleEntryIds = Map.empty<Principal, Map.Map<Text, Text>>();

  include SecurityApi(secondFactors, secondFactorPending, secondFactorSessions, secondFactorAttempts, secondFactorRegisteredKeys, func(key : Principal) : Bool { switch (profiles.get(key.toText())) { case (?_) true; case null false } });

  include TasksApi(tasks, nextId, authorizeCaller);
  include WorkoutsApi(workouts, nextId, workoutDetails, authorizeCaller);
  include MealsApi(meals, nextId, mealDetails, authorizeCaller);
  include WaterApi(waterStore, authorizeCaller);
  include SummaryApi(tasks, workouts, meals, waterStore, authorizeCaller);
  include SocialApi(profiles, follows, followers, socialPosts, socialComments, socialStories, socialLikes, nextSocialId, authorizeCaller);
  include ScheduleApi(weeklySchedules, scheduleEntryIds, authorizeCaller);
  include FoodPresetsApi();
  include GoalsApi(goalsStore, authorizeCaller);
  include ExportApi(meals, workouts, authorizeCaller);
  include MessagingApi(messages, deletedMessages, messageRequests, blockedSenders, messageCounter, requestCounter, follows, profiles, authorizeCaller);
  include StreakApi(workouts, authorizeCaller);
  include MealsSuggestApi();
};
