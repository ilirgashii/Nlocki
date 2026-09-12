import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ConversationSummary,
  Message,
  MessageReaction,
  MessageRequest,
  SocialProfile,
} from "../types";

// --- Helpers (shared pattern with use-backend.ts) ---
function storageGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function storageSet<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}
function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
function getMyUserId(): string {
  let id = localStorage.getItem("social:myUserId");
  if (!id) {
    id = `user-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem("social:myUserId", id);
  }
  return id;
}

// ---- Storage keys ----
const MESSAGES_KEY = "msg:messages";
const REQUESTS_KEY = "msg:requests";
const ARCHIVED_KEY = "msg:archived";

function getAllMessages(): Message[] {
  return storageGet<Message[]>(MESSAGES_KEY, []);
}
function saveAllMessages(msgs: Message[]): void {
  storageSet(MESSAGES_KEY, msgs);
}
function getAllRequests(): MessageRequest[] {
  return storageGet<MessageRequest[]>(REQUESTS_KEY, []);
}
function saveAllRequests(reqs: MessageRequest[]): void {
  storageSet(REQUESTS_KEY, reqs);
}
function getArchivedConvos(): string[] {
  return storageGet<string[]>(ARCHIVED_KEY, []);
}

// ---- Seed mock messages on first run ----
function seedMessagesIfNeeded(): void {
  if (localStorage.getItem("msg:seeded")) return;
  const myId = getMyUserId();
  const now = Date.now();

  const messages: Message[] = [
    {
      id: "msg-1",
      senderId: "mock-u1",
      recipientId: myId,
      text: "Hey! Saw your PR post — that's amazing! What's your weekly mileage?",
      timestamp: now - 1000 * 60 * 60 * 2,
      isRead: false,
    },
    {
      id: "msg-2",
      senderId: myId,
      recipientId: "mock-u1",
      text: "Thanks! I'm at about 40km/week right now. Slowly building up 🏃",
      timestamp: now - 1000 * 60 * 90,
      isRead: true,
    },
    {
      id: "msg-3",
      senderId: "mock-u1",
      recipientId: myId,
      text: "That's solid! Have you tried adding tempo runs?",
      timestamp: now - 1000 * 60 * 45,
      isRead: false,
    },
    {
      id: "msg-4",
      senderId: "mock-u2",
      recipientId: myId,
      text: "Great lift today! Love the dedication 💪",
      timestamp: now - 1000 * 60 * 60 * 5,
      isRead: true,
    },
  ];

  const requests: MessageRequest[] = [
    {
      id: "req-1",
      senderId: "mock-u3",
      senderUsername: "jord_runs",
      senderAvatarUrl: "https://i.pravatar.cc/150?img=12",
      recipientId: myId,
      previewText: "Hey! Love your training posts. Mind if we connect?",
      timestamp: now - 1000 * 60 * 60 * 12,
      status: "pending",
    },
  ];

  saveAllMessages(messages);
  saveAllRequests(requests);
  localStorage.setItem("msg:seeded", "1");
}

seedMessagesIfNeeded();

// ---- Conversation thread between two users ----
function getConversation(myId: string, otherUserId: string): Message[] {
  return getAllMessages()
    .filter(
      (m) =>
        (m.senderId === myId && m.recipientId === otherUserId) ||
        (m.senderId === otherUserId && m.recipientId === myId),
    )
    .sort((a, b) => a.timestamp - b.timestamp);
}

function getProfile(userId: string): SocialProfile | null {
  return storageGet<SocialProfile | null>(`social:profile:${userId}`, null);
}

// ---- Inbox hook — list of conversations ----
export function useInbox() {
  const myId = getMyUserId();
  return useQuery<ConversationSummary[]>({
    queryKey: ["msg:inbox", myId],
    queryFn: () => {
      const messages = getAllMessages();
      const archived = getArchivedConvos();

      // Collect unique partner IDs
      const partnerSet = new Set<string>();
      for (const m of messages) {
        if (m.senderId === myId) partnerSet.add(m.recipientId);
        else if (m.recipientId === myId) partnerSet.add(m.senderId);
      }

      const convos: ConversationSummary[] = [];
      for (const partnerId of partnerSet) {
        const thread = getConversation(myId, partnerId);
        if (thread.length === 0) continue;
        const last = thread[thread.length - 1];
        const unread = thread.filter(
          (m) => m.recipientId === myId && !m.isRead,
        ).length;
        const profile = getProfile(partnerId);
        convos.push({
          otherUserId: partnerId,
          otherUsername: profile?.username ?? partnerId,
          otherAvatarUrl: profile?.avatarUrl,
          lastMessagePreview: last.text,
          lastTimestamp: last.timestamp,
          unreadCount: unread,
          isArchived: archived.includes(partnerId),
        });
      }

      return convos.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
    },
  });
}

// ---- Conversation thread hook ----
export function useConversation(otherUserId: string) {
  const myId = getMyUserId();
  return useQuery<Message[]>({
    queryKey: ["msg:conversation", myId, otherUserId],
    queryFn: () => getConversation(myId, otherUserId),
  });
}

// ---- Send message ----
export function useSendMessage() {
  const qc = useQueryClient();
  const myId = getMyUserId();
  return useMutation({
    mutationFn: async ({
      recipientId,
      text,
    }: {
      recipientId: string;
      text: string;
    }): Promise<Message> => {
      const msg: Message = {
        id: `msg-${uid()}`,
        senderId: myId,
        recipientId,
        text: text.trim(),
        timestamp: Date.now(),
        isRead: false,
      };
      saveAllMessages([...getAllMessages(), msg]);
      return msg;
    },
    onSuccess: (_data, { recipientId }) => {
      qc.invalidateQueries({
        queryKey: ["msg:conversation", myId, recipientId],
      });
      qc.invalidateQueries({ queryKey: ["msg:inbox", myId] });
      qc.invalidateQueries({ queryKey: ["msg:unread"] });
    },
  });
}

// ---- Mark conversation as read ----
export function useMarkRead() {
  const qc = useQueryClient();
  const myId = getMyUserId();
  return useMutation({
    mutationFn: async (otherUserId: string) => {
      const msgs = getAllMessages().map((m) =>
        m.senderId === otherUserId && m.recipientId === myId
          ? { ...m, isRead: true }
          : m,
      );
      saveAllMessages(msgs);
    },
    onSuccess: (_data, otherUserId) => {
      qc.invalidateQueries({
        queryKey: ["msg:conversation", myId, otherUserId],
      });
      qc.invalidateQueries({ queryKey: ["msg:inbox", myId] });
      qc.invalidateQueries({ queryKey: ["msg:unread"] });
    },
  });
}

// ---- Delete conversation ----
export function useDeleteConversation() {
  const qc = useQueryClient();
  const myId = getMyUserId();
  return useMutation({
    mutationFn: async (otherUserId: string) => {
      const msgs = getAllMessages().filter(
        (m) =>
          !(
            (m.senderId === myId && m.recipientId === otherUserId) ||
            (m.senderId === otherUserId && m.recipientId === myId)
          ),
      );
      saveAllMessages(msgs);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["msg:inbox", myId] });
      qc.invalidateQueries({ queryKey: ["msg:unread"] });
    },
  });
}

// ---- Archive conversation (toggle) ----
export function useArchiveConversation() {
  const qc = useQueryClient();
  const myId = getMyUserId();
  return useMutation({
    mutationFn: async (otherUserId: string) => {
      const archived = getArchivedConvos();
      if (archived.includes(otherUserId)) {
        storageSet(
          ARCHIVED_KEY,
          archived.filter((id) => id !== otherUserId),
        );
      } else {
        storageSet(ARCHIVED_KEY, [...archived, otherUserId]);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["msg:inbox", myId] });
    },
  });
}

// ---- Pending message requests ----
export function usePendingRequests() {
  const myId = getMyUserId();
  return useQuery<MessageRequest[]>({
    queryKey: ["msg:requests", myId],
    queryFn: () =>
      getAllRequests().filter(
        (r) => r.recipientId === myId && r.status === "pending",
      ),
  });
}

// ---- Send message request ----
export function useSendMessageRequest() {
  const qc = useQueryClient();
  const myId = getMyUserId();
  return useMutation({
    mutationFn: async ({
      recipientId,
      previewText,
    }: {
      recipientId: string;
      previewText: string;
    }): Promise<MessageRequest> => {
      const profile = getProfile(myId);
      const req: MessageRequest = {
        id: `req-${uid()}`,
        senderId: myId,
        senderUsername: profile?.username ?? "you",
        senderAvatarUrl: profile?.avatarUrl,
        recipientId,
        previewText: previewText.slice(0, 200),
        timestamp: Date.now(),
        status: "pending",
      };
      saveAllRequests([...getAllRequests(), req]);
      return req;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["msg:requests"] });
    },
  });
}

// ---- Accept message request ----
export function useAcceptRequest() {
  const qc = useQueryClient();
  const myId = getMyUserId();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const reqs = getAllRequests().map((r) =>
        r.id === requestId ? { ...r, status: "accepted" as const } : r,
      );
      saveAllRequests(reqs);
      // Find the accepted request to return its senderId
      return reqs.find((r) => r.id === requestId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["msg:requests", myId] });
      qc.invalidateQueries({ queryKey: ["msg:inbox", myId] });
    },
  });
}

// ---- Decline message request ----
export function useDeclineRequest() {
  const qc = useQueryClient();
  const myId = getMyUserId();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const reqs = getAllRequests().map((r) =>
        r.id === requestId ? { ...r, status: "declined" as const } : r,
      );
      saveAllRequests(reqs);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["msg:requests", myId] });
    },
  });
}

// ---- Can message directly (must be following, follower, or have an accepted request) ----
export function useCanMessage(targetUserId: string) {
  const myId = getMyUserId();
  return useQuery<boolean>({
    queryKey: ["msg:canMessage", myId, targetUserId],
    queryFn: () => {
      const following = storageGet<string[]>(`social:following:${myId}`, []);
      const followers = storageGet<string[]>(`social:followers:${myId}`, []);
      if (
        following.includes(targetUserId) ||
        followers.includes(targetUserId)
      ) {
        return true;
      }
      // Also allow if there is an accepted message request between these two users
      const requests = getAllRequests();
      const hasAccepted = requests.some(
        (r) =>
          r.status === "accepted" &&
          ((r.senderId === myId && r.recipientId === targetUserId) ||
            (r.senderId === targetUserId && r.recipientId === myId)),
      );
      return hasAccepted;
    },
  });
}

// ---- Total unread count (conversations + pending requests) ----
export function useUnreadCount() {
  const myId = getMyUserId();
  return useQuery<number>({
    queryKey: ["msg:unread", myId],
    queryFn: () => {
      const unreadMsgs = getAllMessages().filter(
        (m) => m.recipientId === myId && !m.isRead,
      );
      const pendingReqs = getAllRequests().filter(
        (r) => r.recipientId === myId && r.status === "pending",
      );
      // Count unique unread conversation partners + pending requests
      const unreadPartners = new Set(unreadMsgs.map((m) => m.senderId)).size;
      return unreadPartners + pendingReqs.length;
    },
    refetchInterval: 10000,
  });
}

export { getMyUserId as getMessagingUserId };

// ---- Add emoji reaction to a message ----
export function useAddReaction() {
  const qc = useQueryClient();
  const myId = getMyUserId();
  return useMutation({
    mutationFn: async ({
      messageId,
      emoji,
      otherUserId,
    }: {
      messageId: string;
      emoji: string;
      otherUserId: string;
    }) => {
      const msgs = getAllMessages().map((m) => {
        if (m.id !== messageId) return m;
        const existing = m.reactions ?? [];
        // Remove previous reaction by this user on this message (one per user)
        const filtered = existing.filter((r) => r.userId !== myId);
        const newReaction: MessageReaction = {
          emoji,
          userId: myId,
          timestamp: Date.now(),
        };
        return { ...m, reactions: [...filtered, newReaction] };
      });
      saveAllMessages(msgs);
      return otherUserId;
    },
    onSuccess: (_data, { otherUserId }) => {
      qc.invalidateQueries({
        queryKey: ["msg:conversation", myId, otherUserId],
      });
    },
  });
}

// ---- Remove emoji reaction from a message ----
export function useRemoveReaction() {
  const qc = useQueryClient();
  const myId = getMyUserId();
  return useMutation({
    mutationFn: async ({
      messageId,
      otherUserId,
    }: {
      messageId: string;
      emoji: string;
      otherUserId: string;
    }) => {
      const msgs = getAllMessages().map((m) => {
        if (m.id !== messageId) return m;
        const filtered = (m.reactions ?? []).filter((r) => r.userId !== myId);
        return { ...m, reactions: filtered };
      });
      saveAllMessages(msgs);
      return otherUserId;
    },
    onSuccess: (_data, { otherUserId }) => {
      qc.invalidateQueries({
        queryKey: ["msg:conversation", myId, otherUserId],
      });
    },
  });
}
