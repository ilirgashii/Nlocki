import Validation "../lib/validation";
import Runtime "mo:core/Runtime";
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
  authorize : Principal -> Principal,
) {

  // ── Profile ────────────────────────────────────────────────────────────────

  /// Create profile on first call, or return existing profile for the caller
  public shared ({ caller = signer }) func createOrGetProfile() : async Types.UserProfile {
    let caller = authorize(signer);
    SocialLib.getOrCreateProfile(caller, profiles);
  };

  /// Get the caller's own profile — returns null if no profile exists yet
  public query ({ caller = signer }) func getMyProfile() : async ?Types.UserProfile {
    let caller = authorize(signer);
    SocialLib.getProfileOpt(caller, profiles);
  };

  /// Update the caller's profile photo URL (from object-storage upload)
  public shared ({ caller = signer }) func updateProfilePhoto(url : Text) : async () {
    let caller = authorize(signer);
    if (url.size() > 700_000) Runtime.trap("Profile photo exceeds 512 KB");
    if (not url.startsWith(#text "data:image/jpeg;base64,") and not url.startsWith(#text "https://")) Runtime.trap("Use a JPEG upload or HTTPS image URL");
    SocialLib.updateProfilePhoto(caller, profiles, url);
  };

  /// Update caller's profile fields — all fields are optional
  public shared ({ caller = signer }) func updateProfile(
    username : ?Text,
    email : ?Text,
    phone : ?Text,
    bio : ?Text,
    displayName : ?Text,
    isPublic : ?Bool,
  ) : async Types.UserProfile {
    let caller = authorize(signer);
    switch (bio) { case (?v) Validation.text(v, 0, 500, "Bio"); case null {} };
    switch (displayName) { case (?v) Validation.text(v, 0, 80, "Display name"); case null {} };
    switch (email) { case (?v) Validation.text(v, 0, 254, "Email"); case null {} };
    switch (phone) { case (?v) Validation.text(v, 0, 32, "Phone"); case null {} };
    SocialLib.updateProfile(caller, profiles, username, displayName, email, phone, bio, isPublic);
  };

  /// Get a profile by userId — returns full profile for public accounts,
  /// minimal info only for private accounts (unless requester follows them).
  /// Returns null if the user has no profile.
  /// Never exposes fitness/nutrition/weight data.
  public query ({ caller = signer }) func getProfile(userId : Text) : async ?Types.UserProfile {
    let caller = authorize(signer);
    SocialLib.getProfile(caller.toText(), userId, profiles, follows);
  };

  /// Search users by username prefix/substring
  public query ({ caller = signer }) func searchUsers(searchTerm : Text) : async [Types.UserProfile] {
    ignore authorize(signer);
    Validation.text(searchTerm, 1, 80, "Search");
    SocialLib.searchUsers(searchTerm, profiles);
  };

  /// Get a profile by exact username (case-insensitive)
  public query ({ caller = signer }) func getUserByUsername(username : Text) : async ?Types.UserProfile {
    ignore authorize(signer);
    SocialLib.getUserByUsername(username, profiles);
  };

  // ── Follow ─────────────────────────────────────────────────────────────────

  public shared ({ caller = signer }) func followUser(targetId : Text) : async () {
    let caller = authorize(signer);
    SocialLib.followUser(caller.toText(), targetId, follows, followers, profiles);
  };

  public shared ({ caller = signer }) func unfollowUser(targetId : Text) : async () {
    let caller = authorize(signer);
    SocialLib.unfollowUser(caller.toText(), targetId, follows, followers, profiles);
  };

  public query ({ caller = signer }) func getFollowers(userId : Text) : async [Types.UserProfile] {
    ignore authorize(signer);
    SocialLib.getFollowers(userId, followers, profiles);
  };

  public query ({ caller = signer }) func getFollowing(userId : Text) : async [Types.UserProfile] {
    ignore authorize(signer);
    SocialLib.getFollowing(userId, follows, profiles);
  };

  public query ({ caller = signer }) func isFollowing(targetId : Text) : async Bool {
    let caller = authorize(signer);
    SocialLib.isFollowing(caller.toText(), targetId, follows);
  };

  // ── Posts ──────────────────────────────────────────────────────────────────

  public shared ({ caller = signer }) func createPost(text : Text, photoUrl : ?Text) : async Types.Post {
    let caller = authorize(signer);
    if (text.size() == 0 or text.size() > 5000) Runtime.trap("Post must have 1–5000 characters");
    switch (photoUrl) { case (?url) { if (not SocialLib.validPhoto(url)) Runtime.trap("Upload a JPEG or use an HTTPS photo URL") }; case null {} };
    SocialLib.createPost(caller, profiles, posts, nextSocialId, text, photoUrl);
  };

  public shared ({ caller = signer }) func deletePost(postId : Nat) : async () {
    let caller = authorize(signer);
    SocialLib.deletePost(caller, posts, postId);
  };

  /// Returns posts from users the caller follows, sorted chronologically (newest first)
  public query ({ caller = signer }) func getFeed() : async [Types.Post] {
    let caller = authorize(signer);
    SocialLib.getFeed(caller.toText(), follows, posts).filter(func(p) { SocialLib.canView(caller.toText(), p.authorId, profiles) });
  };

  public query ({ caller = signer }) func getUserPosts(userId : Text) : async [Types.Post] {
    let caller = authorize(signer);
    if (not SocialLib.canView(caller.toText(), userId, profiles)) return [];
    SocialLib.getUserPosts(userId, posts);
  };

  // ── Likes ──────────────────────────────────────────────────────────────────

  public shared ({ caller = signer }) func likePost(postId : Nat) : async () {
    let caller = authorize(signer);
    switch (posts.find(func(p) { p.id == postId })) {
      case (?p) { if (not SocialLib.canView(caller.toText(), p.authorId, profiles)) Runtime.trap("Post is private") };
      case null Runtime.trap("Post not found");
    };
    SocialLib.likePost(caller.toText(), postId, posts, likes);
  };

  public shared ({ caller = signer }) func unlikePost(postId : Nat) : async () {
    let caller = authorize(signer);
    switch (posts.find(func(p) { p.id == postId })) {
      case (?p) { if (not SocialLib.canView(caller.toText(), p.authorId, profiles)) Runtime.trap("Post is private") };
      case null Runtime.trap("Post not found");
    };
    SocialLib.unlikePost(caller.toText(), postId, posts, likes);
  };

  public query ({ caller = signer }) func hasLiked(postId : Nat) : async Bool {
    let caller = authorize(signer);
    SocialLib.hasLiked(caller.toText(), postId, likes);
  };

  // ── Comments ───────────────────────────────────────────────────────────────

  public shared ({ caller = signer }) func createComment(postId : Nat, text : Text) : async Types.Comment {
    let caller = authorize(signer);
    switch (posts.find(func(p) { p.id == postId })) {
      case (?p) { if (not SocialLib.canView(caller.toText(), p.authorId, profiles)) Runtime.trap("Post is private") };
      case null Runtime.trap("Post not found");
    };
    Validation.text(text, 1, 2000, "Comment");
    SocialLib.addComment(caller, profiles, comments, posts, nextSocialId, postId, text);
  };

  public shared ({ caller = signer }) func deleteComment(commentId : Nat) : async () {
    let caller = authorize(signer);
    SocialLib.deleteComment(caller, comments, posts, commentId);
  };

  public query ({ caller = signer }) func getComments(postId : Nat) : async [Types.Comment] {
    let caller = authorize(signer);
    switch (posts.find(func(p) { p.id == postId })) {
      case (?p) { if (not SocialLib.canView(caller.toText(), p.authorId, profiles)) return [] };
      case null return [];
    };
    SocialLib.getComments(postId, comments);
  };

  // ── Stories ────────────────────────────────────────────────────────────────

  public shared ({ caller = signer }) func createStory(photoUrl : Text, text : ?Text) : async Types.Story {
    let caller = authorize(signer);
    switch (text) { case (?v) Validation.text(v, 0, 500, "Caption"); case null {} };
    if (not SocialLib.validPhoto(photoUrl)) Runtime.trap("Upload a JPEG or use an HTTPS photo URL");
    SocialLib.createStory(caller, profiles, stories, nextSocialId, photoUrl, text);
  };

  public shared ({ caller = signer }) func deleteStory(storyId : Nat) : async () {
    let caller = authorize(signer);
    SocialLib.deleteStory(caller, stories, storyId);
  };

  /// Returns stories from followed users created within the last 24 hours
  public query ({ caller = signer }) func getStories() : async [Types.Story] {
    let caller = authorize(signer);
    SocialLib.getStories(caller.toText(), follows, stories, Time.now()).filter(func(s) { SocialLib.canView(caller.toText(), s.authorId, profiles) });
  };

  public query ({ caller = signer }) func getUserStories(userId : Text) : async [Types.Story] {
    let caller = authorize(signer);
    if (not SocialLib.canView(caller.toText(), userId, profiles)) return [];
    SocialLib.getUserStories(userId, stories);
  };

};
