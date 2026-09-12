import List "mo:core/List";
import Map "mo:core/Map";
import Order "mo:core/Order";
import Set "mo:core/Set";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import SocialTypes "../types/social";
import Types "../types/messaging";
import MessagingLib "../lib/messaging";

mixin (
  messages : List.List<Types.Message>,
  messageRequests : List.List<Types.MessageRequest>,
  blockedSenders : List.List<Types.BlockEntry>,
  messageCounter : { var value : Nat },
  requestCounter : { var value : Nat },
  // Social state slices needed to verify follow relationships
  follows : Map.Map<Text, Set.Set<Text>>,
  // Profiles for resolving usernames in conversation summaries
  profiles : Map.Map<Text, SocialTypes.UserProfileInternal>,
) {
  // Send a direct message — only allowed if follow relationship or accepted request exists
  // Returns the sent message or traps with a reason
  public shared ({ caller }) func sendMessage(
    recipientId : Text,
    text : Text,
  ) : async Types.Message {
    let callerId = caller.toText();
    if (callerId == recipientId) Runtime.trap("Cannot message yourself");
    let canMsg = MessagingLib.hasFollowRelationship(follows, callerId, recipientId) or
      MessagingLib.hasAcceptedRequest(messageRequests, callerId, recipientId);
    if (not canMsg) Runtime.trap("No follow relationship or accepted message request");
    messageCounter.value += 1;
    let msg : Types.Message = {
      id = MessagingLib.newMessageId(messageCounter.value);
      senderId = callerId;
      recipientId;
      text;
      timestamp = Time.now();
      isRead = false;
      reactions = [];
    };
    messages.add(msg);
    msg;
  };

  // Send a message request to a stranger
  // Returns the request or traps with a reason
  public shared ({ caller }) func sendMessageRequest(
    recipientId : Text,
    previewText : Text,
  ) : async Types.MessageRequest {
    let callerId = caller.toText();
    if (callerId == recipientId) Runtime.trap("Cannot send a request to yourself");
    let now = Time.now();
    if (MessagingLib.isSenderBlocked(blockedSenders, callerId, recipientId, now)) {
      Runtime.trap("You are blocked from messaging this user");
    };
    let existing = messageRequests.find(func(r : Types.MessageRequest) : Bool {
      r.senderId == callerId and r.recipientId == recipientId and r.status == #pending
    });
    switch (existing) {
      case (?_) Runtime.trap("A pending request already exists");
      case null {};
    };
    requestCounter.value += 1;
    let req : Types.MessageRequest = {
      id = MessagingLib.newRequestId(requestCounter.value);
      senderId = callerId;
      recipientId;
      previewText;
      timestamp = now;
      status = #pending;
    };
    messageRequests.add(req);
    req;
  };

  // Accept a pending message request
  public shared ({ caller }) func acceptMessageRequest(
    requestId : Text,
  ) : async () {
    let callerId = caller.toText();
    var found = false;
    messageRequests.mapInPlace(func(r : Types.MessageRequest) : Types.MessageRequest {
      if (r.id == requestId and r.recipientId == callerId and r.status == #pending) {
        found := true;
        { r with status = #accepted }
      } else { r }
    });
    if (not found) Runtime.trap("Request not found");
  };

  // Decline a message request — blocks sender for 7 days
  public shared ({ caller }) func declineMessageRequest(
    requestId : Text,
  ) : async () {
    let callerId = caller.toText();
    var senderId = "";
    var found = false;
    messageRequests.mapInPlace(func(r : Types.MessageRequest) : Types.MessageRequest {
      if (r.id == requestId and r.recipientId == callerId and r.status == #pending) {
        found := true;
        senderId := r.senderId;
        { r with status = #declined }
      } else { r }
    });
    if (not found) Runtime.trap("Request not found");
    // Block sender for 7 days (7 * 24 * 3600 * 1_000_000_000 ns)
    let sevenDays : Int = 7 * 24 * 3600 * 1_000_000_000;
    blockedSenders.add({
      senderId;
      recipientId = callerId;
      blockedUntil = Time.now() + sevenDays;
    });
  };

  // Get all active conversation summaries for the caller
  public shared query ({ caller }) func getConversations() : async [Types.ConversationSummary] {
    let callerId = caller.toText();
    let partners = Set.empty<Text>();
    messages.forEach(func(m : Types.Message) {
      if (m.senderId == callerId) partners.add(m.recipientId)
      else if (m.recipientId == callerId) partners.add(m.senderId)
    });
    partners.toArray().map<Text, Types.ConversationSummary>(func(partnerId) {
      let username = switch (profiles.get(partnerId)) {
        case (?p) p.username;
        case null partnerId;
      };
      MessagingLib.buildSummary(messages, callerId, partnerId, username)
    });
  };

  // Get full message history between caller and another user, ordered by time ascending
  public shared query ({ caller }) func getMessages(
    otherUserId : Text,
  ) : async [Types.Message] {
    let callerId = caller.toText();
    messages.filter(func(m : Types.Message) : Bool {
      (m.senderId == callerId and m.recipientId == otherUserId) or
      (m.senderId == otherUserId and m.recipientId == callerId)
    }).sort(func(a : Types.Message, b : Types.Message) : Order.Order {
      if (a.timestamp < b.timestamp) { #less }
      else if (a.timestamp > b.timestamp) { #greater }
      else { #equal }
    }).toArray();
  };

  // Get all pending incoming message requests for the caller
  public shared query ({ caller }) func getMessageRequests() : async [Types.MessageRequest] {
    let callerId = caller.toText();
    messageRequests.filter(func(r : Types.MessageRequest) : Bool {
      r.recipientId == callerId and r.status == #pending
    }).toArray();
  };

  // Mark a specific message as read by its id
  public shared ({ caller }) func markMessageRead(
    messageId : Text,
  ) : async () {
    let callerId = caller.toText();
    messages.mapInPlace(func(m : Types.Message) : Types.Message {
      if (m.id == messageId and m.recipientId == callerId and not m.isRead) {
        { m with isRead = true }
      } else { m }
    });
  };

  // Remove a conversation from caller's inbox view — deletes messages both ways
  public shared ({ caller }) func deleteConversation(
    otherUserId : Text,
  ) : async () {
    let callerId = caller.toText();
    let kept = messages.filter(func(m : Types.Message) : Bool {
      not ((m.senderId == callerId and m.recipientId == otherUserId) or
           (m.senderId == otherUserId and m.recipientId == callerId))
    });
    messages.clear();
    messages.append(kept);
  };

  // Check if caller can message a target user (follow/follower or accepted request)
  public shared query ({ caller }) func canMessageUser(
    targetUserId : Text,
  ) : async Bool {
    let callerId = caller.toText();
    MessagingLib.hasFollowRelationship(follows, callerId, targetUserId) or
    MessagingLib.hasAcceptedRequest(messageRequests, callerId, targetUserId)
  };

  // Add an emoji reaction to a message (caller must be sender or recipient)
  public shared ({ caller }) func addReaction(
    messageId : Text,
    emoji : Text,
  ) : async () {
    let callerId = caller.toText();
    let now = Time.now();
    messages.mapInPlace(func(m : Types.Message) : Types.Message {
      if (m.id == messageId and (m.senderId == callerId or m.recipientId == callerId)) {
        // Only add if the same user hasn't already reacted with this emoji
        let alreadyReacted = switch (
          Array.find(
            m.reactions,
            func(r) { r.userId == caller and r.emoji == emoji }
          )
        ) {
          case (?_) true;
          case null false;
        };
        if (alreadyReacted) { m } else {
          let newReaction : Types.MessageReaction = {
            emoji;
            userId = caller;
            timestamp = now;
          };
          { m with reactions = m.reactions.concat([newReaction]) }
        }
      } else { m }
    });
  };

  // Remove an emoji reaction from a message (only the caller's own reaction)
  public shared ({ caller }) func removeReaction(
    messageId : Text,
    emoji : Text,
  ) : async () {
    let callerId = caller.toText();
    messages.mapInPlace(func(m : Types.Message) : Types.Message {
      if (m.id == messageId and (m.senderId == callerId or m.recipientId == callerId)) {
        let filtered = Array.filter(
          m.reactions,
          func(r) { not (r.userId == caller and r.emoji == emoji) }
        );
        { m with reactions = filtered }
      } else { m }
    });
  };
};
