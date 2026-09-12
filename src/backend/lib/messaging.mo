import List "mo:core/List";
import Map "mo:core/Map";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Types "../types/messaging";

module {
  // Build a deterministic conversation key from two user IDs (sorted)
  public func conversationKey(a : Text, b : Text) : Types.ConversationKey {
    if (a < b) { a # ":" # b } else { b # ":" # a };
  };

  // Generate a unique message ID
  public func newMessageId(counter : Nat) : Types.MessageId {
    "msg-" # debug_show(counter);
  };

  // Generate a unique request ID
  public func newRequestId(counter : Nat) : Text {
    "req-" # debug_show(counter);
  };

  // Check if a sender is currently blocked by recipient
  public func isSenderBlocked(
    blocks : List.List<Types.BlockEntry>,
    senderId : Text,
    recipientId : Text,
    now : Int,
  ) : Bool {
    switch (blocks.find(func(b : Types.BlockEntry) : Bool {
      b.senderId == senderId and b.recipientId == recipientId and b.blockedUntil > now
    })) {
      case (?_) true;
      case null false;
    };
  };

  // Build a ConversationSummary for a given caller from messages list
  public func buildSummary(
    messages : List.List<Types.Message>,
    callerId : Text,
    otherUserId : Text,
    otherUsername : Text,
  ) : Types.ConversationSummary {
    let convMessages = messages.filter(func(m : Types.Message) : Bool {
      (m.senderId == callerId and m.recipientId == otherUserId) or
      (m.senderId == otherUserId and m.recipientId == callerId)
    });
    let unread = convMessages.filter(func(m : Types.Message) : Bool {
      m.recipientId == callerId and not m.isRead
    }).size();
    let lastMsg = convMessages.last();
    switch (lastMsg) {
      case (?m) {
        {
          otherUserId;
          otherUsername;
          lastMessage = m.text;
          lastMessageTime = m.timestamp;
          unreadCount = unread;
        }
      };
      case null {
        {
          otherUserId;
          otherUsername;
          lastMessage = "";
          lastMessageTime = 0;
          unreadCount = 0;
        }
      };
    };
  };

  // Check if two users have a follow relationship (either direction)
  // follows: Map<userId, Set<followedUserId>>
  public func hasFollowRelationship(
    follows : Map.Map<Text, Set.Set<Text>>,
    userA : Text,
    userB : Text,
  ) : Bool {
    let aFollowsB = switch (follows.get(userA)) {
      case (?set) set.contains(userB);
      case null false;
    };
    if (aFollowsB) return true;
    switch (follows.get(userB)) {
      case (?set) set.contains(userA);
      case null false;
    };
  };

  // Check if an accepted message request exists between the two users
  public func hasAcceptedRequest(
    requests : List.List<Types.MessageRequest>,
    userA : Text,
    userB : Text,
  ) : Bool {
    switch (requests.find(func(r : Types.MessageRequest) : Bool {
      r.status == #accepted and
      ((r.senderId == userA and r.recipientId == userB) or
       (r.senderId == userB and r.recipientId == userA))
    })) {
      case (?_) true;
      case null false;
    };
  };
};
