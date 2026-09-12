import List "mo:core/List";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Principal "mo:core/Principal";
import Text "mo:core/Text";
import Int "mo:core/Int";
import Time "mo:core/Time";
import Types "../types/social";

module {

  // ── Profile helpers ────────────────────────────────────────────────────────

  public func toPublicProfile(self : Types.UserProfileInternal) : Types.UserProfile {
    {
      userId = self.userId;
      username = self.username;
      displayName = self.displayName;
      email = self.email;
      phone = self.phone;
      bio = self.bio;
      avatarUrl = self.avatarUrl;
      isPublic = self.isPublic;
      followersCount = self.followersCount;
      followingCount = self.followingCount;
    };
  };

  public func toMinimalProfile(self : Types.UserProfileInternal) : Types.MinimalProfile {
    {
      userId = self.userId;
      username = self.username;
      avatarUrl = self.avatarUrl;
    };
  };

  public func createProfile(
    caller : Principal,
    profiles : Map.Map<Text, Types.UserProfileInternal>,
  ) : Types.UserProfile {
    let userId = caller.toText();
    let profile : Types.UserProfileInternal = {
      userId;
      var username = userId;
      var displayName = null : ?Text;
      var email = null : ?Text;
      var phone = null : ?Text;
      var bio = "";
      var avatarUrl = null;
      var isPublic = true;
      var followersCount = 0;
      var followingCount = 0;
    };
    profiles.add(userId, profile);
    toPublicProfile(profile);
  };

  public func getOrCreateProfile(
    caller : Principal,
    profiles : Map.Map<Text, Types.UserProfileInternal>,
  ) : Types.UserProfile {
    let userId = caller.toText();
    switch (profiles.get(userId)) {
      case (?p) toPublicProfile(p);
      case null createProfile(caller, profiles);
    };
  };

  public func getProfileOpt(
    caller : Principal,
    profiles : Map.Map<Text, Types.UserProfileInternal>,
  ) : ?Types.UserProfile {
    let userId = caller.toText();
    switch (profiles.get(userId)) {
      case (?p) ?toPublicProfile(p);
      case null null;
    };
  };

  public func updateProfilePhoto(
    caller : Principal,
    profiles : Map.Map<Text, Types.UserProfileInternal>,
    url : Text,
  ) : () {
    let userId = caller.toText();
    switch (profiles.get(userId)) {
      case (?p) { p.avatarUrl := ?url };
      case null {
        let profile : Types.UserProfileInternal = {
          userId;
          var username = userId;
          var displayName = null : ?Text;
          var email = null : ?Text;
          var phone = null : ?Text;
          var bio = "";
          var avatarUrl = ?url;
          var isPublic = true;
          var followersCount = 0;
          var followingCount = 0;
        };
        profiles.add(userId, profile);
      };
    };
  };

  public func updateProfile(
    caller : Principal,
    profiles : Map.Map<Text, Types.UserProfileInternal>,
    username : ?Text,
    displayName : ?Text,
    email : ?Text,
    phone : ?Text,
    bio : ?Text,
    isPublic : ?Bool,
  ) : Types.UserProfile {
    let userId = caller.toText();
    switch (profiles.get(userId)) {
      case (?p) {
        switch (username) { case (?u) p.username := u; case null {} };
        switch (displayName) { case (?d) p.displayName := ?d; case null {} };
        switch (email) { case (?e) p.email := ?e; case null {} };
        switch (phone) { case (?ph) p.phone := ?ph; case null {} };
        switch (bio) { case (?b) p.bio := b; case null {} };
        switch (isPublic) { case (?ip) p.isPublic := ip; case null {} };
        toPublicProfile(p);
      };
      case null {
        let profile : Types.UserProfileInternal = {
          userId;
          var username = switch (username) { case (?u) u; case null userId };
          var displayName;
          var email;
          var phone;
          var bio = switch (bio) { case (?b) b; case null "" };
          var avatarUrl = null;
          var isPublic = switch (isPublic) { case (?ip) ip; case null true };
          var followersCount = 0;
          var followingCount = 0;
        };
        profiles.add(userId, profile);
        toPublicProfile(profile);
      };
    };
  };

  public func getProfile(
    requesterId : Text,
    targetId : Text,
    profiles : Map.Map<Text, Types.UserProfileInternal>,
    follows : Map.Map<Text, Set.Set<Text>>,
  ) : ?Types.UserProfile {
    switch (profiles.get(targetId)) {
      case null null;
      case (?p) {
        if (p.isPublic or requesterId == targetId) {
          ?toPublicProfile(p);
        } else {
          // Check if requester follows the target
          let isFollower = switch (follows.get(requesterId)) {
            case (?set) set.contains(targetId);
            case null false;
          };
          if (isFollower) {
            ?toPublicProfile(p);
          } else {
            // Return minimal profile disguised as full profile — privacy-first
            ?{
              userId = p.userId;
              username = p.username;
              displayName = null;
              email = null;
              phone = null;
              bio = "";
              avatarUrl = p.avatarUrl;
              isPublic = false;
              followersCount = 0;
              followingCount = 0;
            };
          };
        };
      };
    };
  };

  public func searchUsers(
    searchTerm : Text,
    profiles : Map.Map<Text, Types.UserProfileInternal>,
  ) : [Types.UserProfile] {
    let lower = searchTerm.toLower();
    let results = List.empty<Types.UserProfile>();
    profiles.forEach(func(_, p) {
      if (p.username.toLower().contains(#text lower)) {
        results.add(toPublicProfile(p));
      };
    });
    results.toArray();
  };

  public func getUserByUsername(
    username : Text,
    profiles : Map.Map<Text, Types.UserProfileInternal>,
  ) : ?Types.UserProfile {
    let lower = username.toLower();
    var found : ?Types.UserProfile = null;
    profiles.forEach(func(_, p) {
      if (p.username.toLower() == lower) {
        found := ?toPublicProfile(p);
      };
    });
    found;
  };

  // ── Follow helpers ─────────────────────────────────────────────────────────

  public func followUser(
    callerId : Text,
    targetId : Text,
    follows : Map.Map<Text, Set.Set<Text>>,
    followers : Map.Map<Text, Set.Set<Text>>,
    profiles : Map.Map<Text, Types.UserProfileInternal>,
  ) : () {
    if (callerId == targetId) return;
    // Update follows set
    let followSet = switch (follows.get(callerId)) {
      case (?s) s;
      case null {
        let s = Set.empty<Text>();
        follows.add(callerId, s);
        s;
      };
    };
    if (followSet.contains(targetId)) return; // already following
    followSet.add(targetId);
    // Update followers set
    let followerSet = switch (followers.get(targetId)) {
      case (?s) s;
      case null {
        let s = Set.empty<Text>();
        followers.add(targetId, s);
        s;
      };
    };
    followerSet.add(callerId);
    // Update counts
    switch (profiles.get(callerId)) {
      case (?p) p.followingCount += 1;
      case null {};
    };
    switch (profiles.get(targetId)) {
      case (?p) p.followersCount += 1;
      case null {};
    };
  };

  public func unfollowUser(
    callerId : Text,
    targetId : Text,
    follows : Map.Map<Text, Set.Set<Text>>,
    followers : Map.Map<Text, Set.Set<Text>>,
    profiles : Map.Map<Text, Types.UserProfileInternal>,
  ) : () {
    switch (follows.get(callerId)) {
      case (?set) {
        if (not set.contains(targetId)) return;
        set.remove(targetId);
        switch (followers.get(targetId)) {
          case (?fset) fset.remove(callerId);
          case null {};
        };
        switch (profiles.get(callerId)) {
          case (?p) {
            if (p.followingCount > 0) p.followingCount -= 1;
          };
          case null {};
        };
        switch (profiles.get(targetId)) {
          case (?p) {
            if (p.followersCount > 0) p.followersCount -= 1;
          };
          case null {};
        };
      };
      case null {};
    };
  };

  public func getFollowers(
    userId : Text,
    followers : Map.Map<Text, Set.Set<Text>>,
    profiles : Map.Map<Text, Types.UserProfileInternal>,
  ) : [Types.UserProfile] {
    switch (followers.get(userId)) {
      case null [];
      case (?set) {
        let result = List.empty<Types.UserProfile>();
        set.forEach(func(fid) {
          switch (profiles.get(fid)) {
            case (?p) result.add(toPublicProfile(p));
            case null {};
          };
        });
        result.toArray();
      };
    };
  };

  public func getFollowing(
    userId : Text,
    follows : Map.Map<Text, Set.Set<Text>>,
    profiles : Map.Map<Text, Types.UserProfileInternal>,
  ) : [Types.UserProfile] {
    switch (follows.get(userId)) {
      case null [];
      case (?set) {
        let result = List.empty<Types.UserProfile>();
        set.forEach(func(fid) {
          switch (profiles.get(fid)) {
            case (?p) result.add(toPublicProfile(p));
            case null {};
          };
        });
        result.toArray();
      };
    };
  };

  public func isFollowing(
    callerId : Text,
    targetId : Text,
    follows : Map.Map<Text, Set.Set<Text>>,
  ) : Bool {
    switch (follows.get(callerId)) {
      case (?set) set.contains(targetId);
      case null false;
    };
  };

  // ── Post helpers ───────────────────────────────────────────────────────────

  public func toPublicPost(self : Types.PostInternal) : Types.Post {
    {
      id = self.id;
      authorId = self.authorId;
      authorUsername = self.authorUsername;
      text = self.text;
      photoUrl = self.photoUrl;
      timestamp = self.timestamp;
      likeCount = self.likeCount;
      commentCount = self.commentCount;
    };
  };

  public func createPost(
    caller : Principal,
    profiles : Map.Map<Text, Types.UserProfileInternal>,
    posts : List.List<Types.PostInternal>,
    nextId : { var value : Nat },
    text : Text,
    photoUrl : ?Text,
  ) : Types.Post {
    let authorId = caller.toText();
    let username = switch (profiles.get(authorId)) {
      case (?p) p.username;
      case null authorId;
    };
    let id = nextId.value;
    nextId.value += 1;
    let post : Types.PostInternal = {
      id;
      authorId;
      var authorUsername = username;
      text;
      photoUrl;
      timestamp = Time.now();
      var likeCount = 0;
      var commentCount = 0;
    };
    posts.add(post);
    toPublicPost(post);
  };

  public func deletePost(
    caller : Principal,
    posts : List.List<Types.PostInternal>,
    postId : Nat,
  ) : () {
    let callerId = caller.toText();
    switch (posts.findIndex(func(p) { p.id == postId })) {
      case null {};
      case (?idx) {
        let post = posts.at(idx);
        if (post.authorId == callerId) {
          // Retain all except the one with this postId
          let filtered = posts.filter(func(p) { p.id != postId });
          posts.clear();
          posts.append(filtered);
        };
      };
    };
  };

  public func getFeed(
    callerId : Text,
    follows : Map.Map<Text, Set.Set<Text>>,
    posts : List.List<Types.PostInternal>,
  ) : [Types.Post] {
    let followedIds = switch (follows.get(callerId)) {
      case (?set) set;
      case null Set.empty<Text>();
    };
    // Also include own posts
    let result = posts.filter(func(p) {
      p.authorId == callerId or followedIds.contains(p.authorId)
    });
    // Sort newest first (descending by timestamp)
    let sorted = result.sort(func(a, b) { Int.compare(b.timestamp, a.timestamp) });
    sorted.map<Types.PostInternal, Types.Post>(func(p) { toPublicPost(p) }).toArray();
  };

  public func getUserPosts(
    userId : Text,
    posts : List.List<Types.PostInternal>,
  ) : [Types.Post] {
    posts.filter(func(p) { p.authorId == userId })
      .sort(func(a, b) { Int.compare(b.timestamp, a.timestamp) })
      .map<Types.PostInternal, Types.Post>(func(p) { toPublicPost(p) })
      .toArray();
  };

  // ── Like helpers ───────────────────────────────────────────────────────────

  public func likePost(
    callerId : Text,
    postId : Nat,
    posts : List.List<Types.PostInternal>,
    likes : Map.Map<Nat, Set.Set<Text>>,
  ) : () {
    let likeSet = switch (likes.get(postId)) {
      case (?s) s;
      case null {
        let s = Set.empty<Text>();
        likes.add(postId, s);
        s;
      };
    };
    if (likeSet.contains(callerId)) return;
    likeSet.add(callerId);
    switch (posts.find(func(p) { p.id == postId })) {
      case (?p) p.likeCount += 1;
      case null {};
    };
  };

  public func unlikePost(
    callerId : Text,
    postId : Nat,
    posts : List.List<Types.PostInternal>,
    likes : Map.Map<Nat, Set.Set<Text>>,
  ) : () {
    switch (likes.get(postId)) {
      case (?set) {
        if (not set.contains(callerId)) return;
        set.remove(callerId);
        switch (posts.find(func(p) { p.id == postId })) {
          case (?p) {
            if (p.likeCount > 0) p.likeCount -= 1;
          };
          case null {};
        };
      };
      case null {};
    };
  };

  public func hasLiked(
    callerId : Text,
    postId : Nat,
    likes : Map.Map<Nat, Set.Set<Text>>,
  ) : Bool {
    switch (likes.get(postId)) {
      case (?set) set.contains(callerId);
      case null false;
    };
  };

  // ── Comment helpers ────────────────────────────────────────────────────────

  public func toPublicComment(self : Types.CommentInternal) : Types.Comment {
    {
      id = self.id;
      postId = self.postId;
      authorId = self.authorId;
      authorUsername = self.authorUsername;
      text = self.text;
      timestamp = self.timestamp;
    };
  };

  public func addComment(
    caller : Principal,
    profiles : Map.Map<Text, Types.UserProfileInternal>,
    comments : List.List<Types.CommentInternal>,
    posts : List.List<Types.PostInternal>,
    nextId : { var value : Nat },
    postId : Nat,
    text : Text,
  ) : Types.Comment {
    let authorId = caller.toText();
    let username = switch (profiles.get(authorId)) {
      case (?p) p.username;
      case null authorId;
    };
    let id = nextId.value;
    nextId.value += 1;
    let comment : Types.CommentInternal = {
      id;
      postId;
      authorId;
      var authorUsername = username;
      text;
      timestamp = Time.now();
    };
    comments.add(comment);
    switch (posts.find(func(p) { p.id == postId })) {
      case (?p) p.commentCount += 1;
      case null {};
    };
    toPublicComment(comment);
  };

  public func deleteComment(
    caller : Principal,
    comments : List.List<Types.CommentInternal>,
    posts : List.List<Types.PostInternal>,
    commentId : Nat,
  ) : () {
    let callerId = caller.toText();
    switch (comments.findIndex(func(c) { c.id == commentId })) {
      case null {};
      case (?_) {
        switch (comments.find(func(c) { c.id == commentId })) {
          case (?c) {
            if (c.authorId == callerId) {
              let postId = c.postId;
              let filtered = comments.filter(func(cm) { cm.id != commentId });
              comments.clear();
              comments.append(filtered);
              switch (posts.find(func(p) { p.id == postId })) {
                case (?p) {
                  if (p.commentCount > 0) p.commentCount -= 1;
                };
                case null {};
              };
            };
          };
          case null {};
        };
      };
    };
  };

  public func getComments(
    postId : Nat,
    comments : List.List<Types.CommentInternal>,
  ) : [Types.Comment] {
    comments.filter(func(c) { c.postId == postId })
      .sort(func(a, b) { Int.compare(a.timestamp, b.timestamp) })
      .map<Types.CommentInternal, Types.Comment>(func(c) { toPublicComment(c) })
      .toArray();
  };

  // ── Story helpers ──────────────────────────────────────────────────────────

  public func toPublicStory(self : Types.StoryInternal) : Types.Story {
    {
      id = self.id;
      authorId = self.authorId;
      authorUsername = self.authorUsername;
      photoUrl = self.photoUrl;
      text = self.text;
      timestamp = self.timestamp;
    };
  };

  public func createStory(
    caller : Principal,
    profiles : Map.Map<Text, Types.UserProfileInternal>,
    stories : List.List<Types.StoryInternal>,
    nextId : { var value : Nat },
    photoUrl : Text,
    text : ?Text,
  ) : Types.Story {
    let authorId = caller.toText();
    let username = switch (profiles.get(authorId)) {
      case (?p) p.username;
      case null authorId;
    };
    let id = nextId.value;
    nextId.value += 1;
    let story : Types.StoryInternal = {
      id;
      authorId;
      var authorUsername = username;
      photoUrl;
      text;
      timestamp = Time.now();
    };
    stories.add(story);
    toPublicStory(story);
  };

  public func deleteStory(
    caller : Principal,
    stories : List.List<Types.StoryInternal>,
    storyId : Nat,
  ) : () {
    let callerId = caller.toText();
    switch (stories.find(func(s) { s.id == storyId })) {
      case (?s) {
        if (s.authorId == callerId) {
          let filtered = stories.filter(func(st) { st.id != storyId });
          stories.clear();
          stories.append(filtered);
        };
      };
      case null {};
    };
  };

  // Stories older than 24 hours (in nanoseconds) are excluded

  public func getStories(
    callerId : Text,
    follows : Map.Map<Text, Set.Set<Text>>,
    stories : List.List<Types.StoryInternal>,
    now : Int,
  ) : [Types.Story] {
    let twentyFourHoursNs : Int = 24 * 3600 * 1_000_000_000;
    let cutoff : Int = now - twentyFourHoursNs;
    let followedIds = switch (follows.get(callerId)) {
      case (?set) set;
      case null Set.empty<Text>();
    };
    stories.filter(func(s) {
      s.timestamp >= cutoff and
      (s.authorId == callerId or followedIds.contains(s.authorId))
    })
      .sort(func(a, b) { Int.compare(b.timestamp, a.timestamp) })
      .map<Types.StoryInternal, Types.Story>(func(s) { toPublicStory(s) })
      .toArray();
  };

  public func getUserStories(
    userId : Text,
    stories : List.List<Types.StoryInternal>,
  ) : [Types.Story] {
    stories.filter(func(s) { s.authorId == userId })
      .sort(func(a, b) { Int.compare(b.timestamp, a.timestamp) })
      .map<Types.StoryInternal, Types.Story>(func(s) { toPublicStory(s) })
      .toArray();
  };

};
