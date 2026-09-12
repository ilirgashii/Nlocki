import CommonTypes "common";

module {
  public type Timestamp = CommonTypes.Timestamp;

  // User profile — public-facing shape (no fitness/nutrition/weight data ever)
  public type UserProfile = {
    userId : Text; // Principal as Text
    username : Text;
    displayName : ?Text;
    email : ?Text;
    phone : ?Text; // display only — never used for verification or SMS
    bio : Text;
    avatarUrl : ?Text;
    isPublic : Bool;
    followersCount : Nat;
    followingCount : Nat;
  };

  // Minimal profile for private accounts visible to non-followers
  public type MinimalProfile = {
    userId : Text;
    username : Text;
    avatarUrl : ?Text;
  };

  // Internal profile with mutable fields
  public type UserProfileInternal = {
    userId : Text;
    var username : Text;
    var displayName : ?Text;
    var email : ?Text;
    var phone : ?Text; // display only
    var bio : Text;
    var avatarUrl : ?Text;
    var isPublic : Bool;
    var followersCount : Nat;
    var followingCount : Nat;
  };

  // Post
  public type Post = {
    id : Nat;
    authorId : Text;
    authorUsername : Text;
    text : Text;
    photoUrl : ?Text;
    timestamp : Timestamp;
    likeCount : Nat;
    commentCount : Nat;
  };

  public type PostInternal = {
    id : Nat;
    authorId : Text;
    var authorUsername : Text;
    text : Text;
    photoUrl : ?Text;
    timestamp : Timestamp;
    var likeCount : Nat;
    var commentCount : Nat;
  };

  // Comment
  public type Comment = {
    id : Nat;
    postId : Nat;
    authorId : Text;
    authorUsername : Text;
    text : Text;
    timestamp : Timestamp;
  };

  public type CommentInternal = {
    id : Nat;
    postId : Nat;
    authorId : Text;
    var authorUsername : Text;
    text : Text;
    timestamp : Timestamp;
  };

  // Story — persistent, no expiry
  public type Story = {
    id : Nat;
    authorId : Text;
    authorUsername : Text;
    photoUrl : Text;
    text : ?Text;
    timestamp : Timestamp;
  };

  public type StoryInternal = {
    id : Nat;
    authorId : Text;
    var authorUsername : Text;
    photoUrl : Text;
    text : ?Text;
    timestamp : Timestamp;
  };
};
