module {
  public type MessageId = Text;
  public type ConversationKey = Text; // sorted "userId1:userId2"

  public type RequestStatus = {
    #pending;
    #accepted;
    #declined;
  };

  // Emoji reaction on a specific message
  public type MessageReaction = {
    emoji : Text;
    userId : Principal;
    timestamp : Int;
  };

  public type Message = {
    id : MessageId;
    senderId : Text;
    recipientId : Text;
    text : Text;
    timestamp : Int;
    isRead : Bool;
    reactions : [MessageReaction];
  };

  public type ConversationSummary = {
    otherUserId : Text;
    otherUsername : Text;
    lastMessage : Text;
    lastMessageTime : Int;
    unreadCount : Nat;
  };

  public type MessageRequest = {
    id : Text;
    senderId : Text;
    recipientId : Text;
    previewText : Text;
    timestamp : Int;
    status : RequestStatus;
  };

  // Internal block record: tracks declined senders per recipient
  public type BlockEntry = {
    senderId : Text;
    recipientId : Text;
    blockedUntil : Int; // timestamp in nanoseconds
  };
};
