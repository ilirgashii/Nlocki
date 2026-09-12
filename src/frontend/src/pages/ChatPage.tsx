import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  MessageCircle,
  Send,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useMyUserId, useProfile } from "../hooks/use-backend";
import {
  useAddReaction,
  useCanMessage,
  useConversation,
  useInbox,
  useMarkRead,
  useRemoveReaction,
  useSendMessage,
  useSendMessageRequest,
} from "../hooks/use-messages";
import { useIsMobile } from "../hooks/use-mobile";
import type { Message } from "../types";

/** Format timestamp as "HH:MM" (24-hour) */
function timeOnly(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Short relative time: "2m ago", "1h ago", "3d ago" */
function shortRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"] as const;

/** Group reactions by emoji → count + whether current user reacted */
function groupReactions(
  reactions: Message["reactions"],
  myId: string,
): { emoji: string; count: number; byMe: boolean }[] {
  if (!reactions || reactions.length === 0) return [];
  const map = new Map<string, { count: number; byMe: boolean }>();
  for (const r of reactions) {
    const cur = map.get(r.emoji) ?? { count: 0, byMe: false };
    map.set(r.emoji, {
      count: cur.count + 1,
      byMe: cur.byMe || r.userId === myId,
    });
  }
  return Array.from(map.entries()).map(([emoji, v]) => ({ emoji, ...v }));
}

// ---- Floating reaction bar ----
function ReactionBar({
  messageId,
  otherUserId,
  myReactionEmoji,
  onClose,
}: {
  messageId: string;
  otherUserId: string;
  myReactionEmoji: string | null;
  onClose: () => void;
}) {
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();

  function handleEmoji(emoji: string) {
    if (myReactionEmoji === emoji) {
      removeReaction.mutate({ messageId, emoji, otherUserId });
    } else {
      addReaction.mutate({ messageId, emoji, otherUserId });
    }
    onClose();
  }

  return (
    <div
      className="absolute z-20 flex items-center gap-0.5 bg-card border border-border rounded-full px-2 py-1 shadow-lg -top-10"
      role="toolbar"
      aria-label="React to message"
      data-ocid="chat.reaction_bar"
    >
      {REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => handleEmoji(emoji)}
          className={`text-lg w-8 h-8 flex items-center justify-center rounded-full transition-colors duration-150 hover:bg-primary/10 ${
            myReactionEmoji === emoji ? "bg-primary/15 scale-110" : ""
          }`}
          aria-label={`React with ${emoji}`}
          data-ocid="chat.reaction.emoji_button"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// ---- Message bubble ----
function MessageBubble({
  message,
  isOwn,
  index,
  myId,
  otherUserId,
}: {
  message: Message;
  isOwn: boolean;
  index: number;
  myId: string;
  otherUserId: string;
}) {
  const [showBar, setShowBar] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const grouped = groupReactions(message.reactions, myId);
  const myReaction =
    message.reactions?.find((r) => r.userId === myId)?.emoji ?? null;

  // Long-press for mobile
  function handleTouchStart() {
    longPressTimer.current = setTimeout(() => setShowBar(true), 500);
  }
  function handleTouchEnd() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  return (
    <div
      className={`flex ${isOwn ? "justify-end" : "justify-start"} px-1`}
      data-ocid={`chat.message.item.${index + 1}`}
    >
      <div className="flex flex-col gap-1 max-w-[75%]">
        {/* Bubble + hover reaction trigger */}
        <div
          className="relative group"
          onMouseEnter={() => setShowBar(true)}
          onMouseLeave={() => setShowBar(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          {/* Floating reaction bar */}
          {showBar && (
            <div className={`${isOwn ? "right-0" : "left-0"} absolute`}>
              <ReactionBar
                messageId={message.id}
                otherUserId={otherUserId}
                myReactionEmoji={myReaction}
                onClose={() => setShowBar(false)}
              />
            </div>
          )}

          <div
            className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words ${
              isOwn
                ? "bg-primary text-primary-foreground rounded-br-sm"
                : "bg-card border border-border text-foreground rounded-bl-sm"
            }`}
          >
            <p className="whitespace-pre-wrap">{message.text}</p>
            <div
              className={`flex items-center gap-1 mt-1 ${isOwn ? "justify-end" : "justify-start"}`}
            >
              <span
                className={`text-xs ${isOwn ? "text-primary-foreground/70" : "text-muted-foreground"}`}
              >
                {timeOnly(message.timestamp)}
              </span>
              {isOwn && (
                <span
                  className="text-primary-foreground/70"
                  aria-label={message.isRead ? "Read" : "Sent"}
                >
                  {message.isRead ? (
                    <CheckCheck className="w-3 h-3" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Reaction pill badges */}
        {grouped.length > 0 && (
          <div
            className={`flex flex-wrap gap-1 ${isOwn ? "justify-end" : "justify-start"}`}
            data-ocid={`chat.reactions.row.${index + 1}`}
          >
            {grouped.map(({ emoji, count, byMe }) => (
              <ReactionPill
                key={emoji}
                emoji={emoji}
                count={count}
                byMe={byMe}
                messageId={message.id}
                otherUserId={otherUserId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Reaction pill ----
function ReactionPill({
  emoji,
  count,
  byMe,
  messageId,
  otherUserId,
}: {
  emoji: string;
  count: number;
  byMe: boolean;
  messageId: string;
  otherUserId: string;
}) {
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();

  function handleClick() {
    if (byMe) {
      removeReaction.mutate({ messageId, emoji, otherUserId });
    } else {
      addReaction.mutate({ messageId, emoji, otherUserId });
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full border transition-colors duration-150 ${
        byMe
          ? "bg-primary/15 border-primary/40 text-primary font-semibold"
          : "bg-muted/60 border-border text-foreground hover:border-primary/30 hover:bg-primary/5"
      }`}
      aria-label={`${emoji} ${count} reaction${count !== 1 ? "s" : ""}${byMe ? " — click to remove" : ""}`}
      data-ocid="chat.reaction.pill"
    >
      <span>{emoji}</span>
      <span>{count}</span>
    </button>
  );
}

// ---- Request form (non-followers) ----
function RequestForm({ recipientId }: { recipientId: string }) {
  const [previewText, setPreviewText] = useState("");
  const [sent, setSent] = useState(false);
  const sendRequest = useSendMessageRequest();
  const { data: profile } = useProfile(recipientId);

  const handleSend = () => {
    if (!previewText.trim()) return;
    sendRequest.mutate(
      { recipientId, previewText: previewText.trim() },
      { onSuccess: () => setSent(true) },
    );
  };

  if (sent) {
    return (
      <div
        className="flex flex-col items-center py-12 gap-4 bg-card border border-border rounded-2xl mx-4"
        data-ocid="chat.request.success_state"
      >
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <MessageCircle className="w-6 h-6 text-primary" />
        </div>
        <div className="text-center">
          <p className="font-display font-semibold text-foreground">
            Request sent!
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            @{profile?.username ?? recipientId} will see your message request.
            <br />
            Waiting for acceptance.
          </p>
        </div>
        <Link to="/messages">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-border hover:border-primary/50"
          >
            Back to Messages
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full justify-end pb-4 px-4">
      {/* Banner explaining the request */}
      <div className="flex flex-col items-center gap-3 py-8 bg-card border border-border rounded-2xl px-5 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <MessageCircle className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="font-display font-semibold text-foreground text-sm">
            Send a message request to start chatting
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            You can only message directly once they follow you or you follow
            them.
          </p>
        </div>
      </div>

      {/* Request input */}
      <div
        className="bg-card border border-border rounded-2xl p-4 space-y-3"
        data-ocid="chat.request.form"
      >
        <Input
          placeholder="Write a short intro (up to 200 chars)…"
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value.slice(0, 200))}
          className="bg-input border-border text-sm"
          maxLength={200}
          data-ocid="chat.request.input"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {previewText.length}/200
          </span>
          <Button
            type="button"
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
            onClick={handleSend}
            disabled={!previewText.trim() || sendRequest.isPending}
            data-ocid="chat.request.submit_button"
          >
            <Send className="w-3.5 h-3.5" />
            Send Request
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---- Mini inbox sidebar for desktop split layout ----
function InboxSidebar({ activeChatId }: { activeChatId: string }) {
  const { data: inbox = [] } = useInbox();
  const navigate = useNavigate();
  const activeConvos = inbox.filter((c) => !c.isArchived);

  return (
    <>
      <div className="px-4 py-3 border-b border-border shrink-0">
        <h2 className="font-display font-bold text-sm text-foreground">
          Messages
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {activeConvos.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8 px-4">
            No conversations yet
          </p>
        ) : (
          activeConvos.map((c) => {
            const isActive = c.otherUserId === activeChatId;
            const initials = c.otherUsername.slice(0, 2).toUpperCase();
            return (
              <button
                key={c.otherUserId}
                type="button"
                onClick={() =>
                  navigate({
                    to: "/messages/$userId",
                    params: { userId: c.otherUserId },
                  })
                }
                className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-smooth ${
                  isActive
                    ? "bg-primary/10 border border-primary/20"
                    : "hover:bg-muted/50 border border-transparent"
                }`}
                data-ocid={`chat.sidebar.convo.${c.otherUserId}`}
              >
                <div className="relative shrink-0">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={c.otherAvatarUrl} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {c.unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-primary border border-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-xs font-medium truncate ${isActive ? "text-primary" : "text-foreground"}`}
                    >
                      @{c.otherUsername}
                    </span>
                    {c.unreadCount > 0 && (
                      <Badge className="bg-primary text-primary-foreground text-xs px-1 py-0 h-4 min-w-[16px] justify-center">
                        {c.unreadCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {c.lastMessagePreview.length > 30
                      ? `${c.lastMessagePreview.slice(0, 30)}…`
                      : c.lastMessagePreview}
                  </p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </>
  );
}

// ---- Inner chat view (reused in both mobile and desktop) ----
function ChatView({ otherUserId }: { otherUserId: string }) {
  const myId = useMyUserId();
  const { data: profile } = useProfile(otherUserId);
  const {
    data: messages = [],
    isLoading,
    refetch,
  } = useConversation(otherUserId);
  const { data: canMessage } = useCanMessage(otherUserId);
  const sendMessage = useSendMessage();
  const markRead = useMarkRead();
  const navigate = useNavigate();

  const [text, setText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mark as read when opening
  const markReadMutate = markRead.mutate;
  useEffect(() => {
    markReadMutate(otherUserId);
  }, [otherUserId, markReadMutate]);

  // Poll for new messages every 10 seconds
  const refetchFn = useCallback(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    const intervalId = setInterval(refetchFn, 10000);
    return () => clearInterval(intervalId);
  }, [refetchFn]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = () => {
    if (!text.trim() || text.length > 2000) return;
    sendMessage.mutate(
      { recipientId: otherUserId, text: text.trim() },
      { onSuccess: () => setText("") },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const otherInitials = (profile?.username ?? otherUserId)
    .slice(0, 2)
    .toUpperCase();

  // Simulate "last seen" from the most recent message timestamp
  const lastMsgTs =
    messages.length > 0 ? messages[messages.length - 1].timestamp : null;

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0 bg-card">
        <button
          type="button"
          onClick={() => navigate({ to: "/messages" })}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-smooth"
          aria-label="Back to messages"
          data-ocid="chat.back_button"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Link
          to="/profile/$userId"
          params={{ userId: otherUserId }}
          className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-80 transition-smooth"
          data-ocid="chat.profile_link"
        >
          <div className="relative shrink-0">
            <Avatar className="w-10 h-10 ring-2 ring-primary/20">
              <AvatarImage src={profile?.avatarUrl} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                {otherInitials}
              </AvatarFallback>
            </Avatar>
            {/* Static presence indicator */}
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-muted border-2 border-card" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">
              @{profile?.username ?? otherUserId}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {lastMsgTs
                ? `Last seen ${shortRelativeTime(lastMsgTs)}`
                : "Tap to view profile"}
            </p>
          </div>
        </Link>
      </div>

      {/* Messages thread */}
      <div className="flex-1 overflow-y-auto py-4 space-y-2.5 min-h-0 bg-background">
        {isLoading ? (
          <div
            className="flex items-center justify-center h-32"
            data-ocid="chat.loading_state"
          >
            <p className="text-sm text-muted-foreground animate-pulse">
              Loading messages…
            </p>
          </div>
        ) : canMessage === false && messages.length === 0 ? (
          <RequestForm recipientId={otherUserId} />
        ) : messages.length === 0 ? (
          <div
            className="flex flex-col items-center py-12 gap-3"
            data-ocid="chat.empty_state"
          >
            <Avatar className="w-16 h-16 ring-2 ring-primary/20">
              <AvatarImage src={profile?.avatarUrl} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-display font-bold">
                {otherInitials}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="font-display font-semibold text-foreground">
                @{profile?.username ?? otherUserId}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Start the conversation!
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.senderId === myId}
              index={i}
              myId={myId ?? ""}
              otherUserId={otherUserId}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area — only show if can message OR already has messages */}
      {(canMessage || messages.length > 0) && (
        <div
          className="border-t border-border px-4 pt-3 pb-3 shrink-0 bg-card"
          data-ocid="chat.input.section"
        >
          <div className="flex gap-2 items-end">
            <Textarea
              placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 2000))}
              onKeyDown={handleKeyDown}
              rows={1}
              className="resize-none bg-input border-border text-sm min-h-[44px] max-h-32"
              data-ocid="chat.message.textarea"
            />
            <Button
              type="button"
              size="icon"
              className="h-11 w-11 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl disabled:opacity-40"
              onClick={handleSend}
              disabled={
                !text.trim() || sendMessage.isPending || text.length > 2000
              }
              aria-label="Send message"
              data-ocid="chat.send_button"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          {text.length > 1800 && (
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {text.length}/2000
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Main ChatPage ----
export default function ChatPage() {
  const { userId: otherUserId } = useParams({ from: "/app/messages/$userId" });
  const isMobile = useIsMobile();
  const myId = useMyUserId();

  // Edge case: viewing own chat
  if (otherUserId === myId) {
    return (
      <div
        className="max-w-2xl mx-auto flex flex-col items-center justify-center gap-4 py-20"
        data-ocid="chat.page"
      >
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
          <MessageCircle className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="font-display font-semibold text-foreground">
          That&apos;s you!
        </p>
        <p className="text-sm text-muted-foreground text-center max-w-xs">
          You can&apos;t send messages to yourself. Find someone to chat with.
        </p>
        <Link to="/messages">
          <Button
            type="button"
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Back to Messages
          </Button>
        </Link>
      </div>
    );
  }

  // Desktop: split layout — sidebar + chat panel
  if (!isMobile) {
    return (
      <div
        className="flex h-[calc(100vh-130px)] gap-4 max-w-5xl mx-auto"
        data-ocid="chat.page"
      >
        {/* Sidebar */}
        <aside className="w-80 shrink-0 overflow-hidden bg-card border border-border rounded-2xl flex flex-col">
          <InboxSidebar activeChatId={otherUserId} />
        </aside>

        {/* Chat panel */}
        <div className="flex-1 bg-card border border-border rounded-2xl overflow-hidden">
          <ChatView otherUserId={otherUserId} />
        </div>
      </div>
    );
  }

  // Mobile: full screen chat
  return (
    <div
      className="flex flex-col"
      style={{ height: "calc(100vh - 130px)" }}
      data-ocid="chat.page"
    >
      <ChatView otherUserId={otherUserId} />
    </div>
  );
}
