import List "mo:core/List";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import SocialLib "../lib/social";
import Types "../types/social";

// Social domain API mixin
// Injects: profiles, follows, followers, posts, comments, stories, likes, nextSocialId
mixin (
  profiles : Map.Map<Text, Types.UserProfileInternal>,
  follows : Map.Map<Text, Set.Set<Text>>,
  followers : Map.Map<Text, Set.Set<Text>>,
  posts : List.List<Types.PostInternal>,
  comments : List.List<Types.CommentInternal>,
  stories : List.List<Types.StoryInternal>,
  likes : Map.Map<Nat, Set.Set<Text>>,
  nextSocialId : { var value : Nat },
) {

  // ── Profile ────────────────────────────────────────────────────────────────

  /// Create profile on first call, or return existing profile for the caller
  public shared ({ caller }) func createOrGetProfile() : async Types.UserProfile {
    SocialLib.getOrCreateProfile(caller, profiles);
  };

  /// Get the caller's own profile — returns null if no profile exists yet
  public query ({ caller }) func getMyProfile() : async ?Types.UserProfile {
    SocialLib.getProfileOpt(caller, profiles);
  };

  /// Update the caller's profile photo URL (from object-storage upload)
  public shared ({ caller }) func updateProfilePhoto(url : Text) : async () {
    SocialLib.updateProfilePhoto(caller, profiles, url);
  };

  /// Update caller's profile fields — all fields are optional
  public shared ({ caller }) func updateProfile(
    username : ?Text,
    email : ?Text,
    phone : ?Text,
    bio : ?Text,
    displayName : ?Text,
    isPublic : ?Bool,
  ) : async Types.UserProfile {
    SocialLib.updateProfile(caller, profiles, username, displayName, email, phone, bio, isPublic);
  };

  /// Get a profile by userId — returns full profile for public accounts,
  /// minimal info only for private accounts (unless requester follows them).
  /// Returns null if the user has no profile.
  /// Never exposes fitness/nutrition/weight data.
  public query ({ caller }) func getProfile(userId : Text) : async ?Types.UserProfile {
    SocialLib.getProfile(caller.toText(), userId, profiles, follows);
  };

  /// Search users by username prefix/substring
  public query func searchUsers(searchTerm : Text) : async [Types.UserProfile] {
    SocialLib.searchUsers(searchTerm, profiles);
  };

  /// Get a profile by exact username (case-insensitive)
  public query func getUserByUsername(username : Text) : async ?Types.UserProfile {
    SocialLib.getUserByUsername(username, profiles);
  };

  // ── Follow ─────────────────────────────────────────────────────────────────

  public shared ({ caller }) func followUser(targetId : Text) : async () {
    SocialLib.followUser(caller.toText(), targetId, follows, followers, profiles);
  };

  public shared ({ caller }) func unfollowUser(targetId : Text) : async () {
    SocialLib.unfollowUser(caller.toText(), targetId, follows, followers, profiles);
  };

  public query func getFollowers(userId : Text) : async [Types.UserProfile] {
    SocialLib.getFollowers(userId, followers, profiles);
  };

  public query func getFollowing(userId : Text) : async [Types.UserProfile] {
    SocialLib.getFollowing(userId, follows, profiles);
  };

  public query ({ caller }) func isFollowing(targetId : Text) : async Bool {
    SocialLib.isFollowing(caller.toText(), targetId, follows);
  };

  // ── Posts ──────────────────────────────────────────────────────────────────

  public shared ({ caller }) func createPost(text : Text, photoUrl : ?Text) : async Types.Post {
    SocialLib.createPost(caller, profiles, posts, nextSocialId, text, photoUrl);
  };

  public shared ({ caller }) func deletePost(postId : Nat) : async () {
    SocialLib.deletePost(caller, posts, postId);
  };

  /// Returns posts from users the caller follows, sorted chronologically (newest first)
  public query ({ caller }) func getFeed() : async [Types.Post] {
    SocialLib.getFeed(caller.toText(), follows, posts);
  };

  public query func getUserPosts(userId : Text) : async [Types.Post] {
    SocialLib.getUserPosts(userId, posts);
  };

  // ── Likes ──────────────────────────────────────────────────────────────────

  public shared ({ caller }) func likePost(postId : Nat) : async () {
    SocialLib.likePost(caller.toText(), postId, posts, likes);
  };

  public shared ({ caller }) func unlikePost(postId : Nat) : async () {
    SocialLib.unlikePost(caller.toText(), postId, posts, likes);
  };

  public query ({ caller }) func hasLiked(postId : Nat) : async Bool {
    SocialLib.hasLiked(caller.toText(), postId, likes);
  };

  // ── Comments ───────────────────────────────────────────────────────────────

  public shared ({ caller }) func createComment(postId : Nat, text : Text) : async Types.Comment {
    SocialLib.addComment(caller, profiles, comments, posts, nextSocialId, postId, text);
  };

  public shared ({ caller }) func deleteComment(commentId : Nat) : async () {
    SocialLib.deleteComment(caller, comments, posts, commentId);
  };

  public query func getComments(postId : Nat) : async [Types.Comment] {
    SocialLib.getComments(postId, comments);
  };

  // ── Stories ────────────────────────────────────────────────────────────────

  public shared ({ caller }) func createStory(photoUrl : Text, text : ?Text) : async Types.Story {
    SocialLib.createStory(caller, profiles, stories, nextSocialId, photoUrl, text);
  };

  public shared ({ caller }) func deleteStory(storyId : Nat) : async () {
    SocialLib.deleteStory(caller, stories, storyId);
  };

  /// Returns stories from followed users created within the last 24 hours
  public query ({ caller }) func getStories() : async [Types.Story] {
    SocialLib.getStories(caller.toText(), follows, stories, Time.now());
  };

  public query func getUserStories(userId : Text) : async [Types.Story] {
    SocialLib.getUserStories(userId, stories);
  };

};
