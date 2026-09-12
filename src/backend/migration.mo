import List "mo:core/List";
import Map "mo:core/Map";
import Set "mo:core/Set";
import MessagingTypes "types/messaging";
import TaskTypes "types/tasks";
import WorkoutTypes "types/workouts";
import MealTypes "types/meals";
import SocialTypes "types/social";
import ScheduleTypes "types/schedule";
import GoalTypes "types/goals";

module {
  // ─── Old types (inline from previous version) ────────────────────────────
  type OldMessage = {
    id : Text;
    senderId : Text;
    recipientId : Text;
    text : Text;
    timestamp : Int;
    isRead : Bool;
    // no `reactions` field in the old version
  };

  // ─── Stable state shapes ─────────────────────────────────────────────────
  type OldActor = {
    messages : List.List<OldMessage>;
  };

  type NewActor = {
    messages : List.List<MessagingTypes.Message>;
  };

  // ─── Migration function ───────────────────────────────────────────────────
  public func run(old : OldActor) : NewActor {
    let migratedMessages = old.messages.map<OldMessage, MessagingTypes.Message>(
      func(m : OldMessage) : MessagingTypes.Message {
        {
          id = m.id;
          senderId = m.senderId;
          recipientId = m.recipientId;
          text = m.text;
          timestamp = m.timestamp;
          isRead = m.isRead;
          reactions = [];
        };
      }
    );
    { messages = migratedMessages };
  };
};
