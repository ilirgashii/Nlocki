import { message, ms } from "../lib/backend-client";
import type { BackendActor } from "../lib/backend-client";
import {
  useBackendMutation as mutation,
  useBackendQuery as query,
  useActor,
} from "./use-actor";

async function request(
  a: BackendActor,
  r: Awaited<ReturnType<BackendActor["getMessageRequests"]>>[number],
) {
  const p = (await a.getProfile(r.senderId))[0];
  return {
    ...r,
    timestamp: ms(r.timestamp),
    status: Object.keys(r.status)[0] as "pending" | "accepted" | "declined",
    senderUsername: p?.username ?? r.senderId,
    senderAvatarUrl: p?.avatarUrl[0],
  };
}
export function useInbox() {
  return query(
    ["inbox"],
    async (a) => {
      const [conversations, archived] = await Promise.all([
        a.getConversations(),
        a.getArchivedConversations(),
      ]);
      return Promise.all(
        conversations.map(async (c) => ({
          otherUserId: c.otherUserId,
          otherUsername: c.otherUsername,
          otherAvatarUrl: (await a.getProfile(c.otherUserId))[0]?.avatarUrl[0],
          lastMessagePreview: c.lastMessage,
          lastTimestamp: ms(c.lastMessageTime),
          unreadCount: Number(c.unreadCount),
          isArchived: archived.includes(c.otherUserId),
        })),
      );
    },
    true,
    10000,
  );
}
export function useConversation(id: string) {
  return query(
    ["conversation", id],
    async (a) => (await a.getMessages(id)).map(message),
    !!id,
    5000,
  );
}
export function useSendMessage() {
  return mutation(async (a, v: { recipientId: string; text: string }) =>
    message(await a.sendMessage(v.recipientId, v.text.trim())),
  );
}
export function useMarkRead() {
  const { userId } = useActor();
  return mutation(async (a, id: string) => {
    const messages = await a.getMessages(id);
    await Promise.all(
      messages
        .filter((m) => m.recipientId === userId && !m.isRead)
        .map((m) => a.markMessageRead(m.id)),
    );
  });
}
export function useDeleteConversation() {
  return mutation((a, id: string) => a.deleteConversation(id));
}
export function useArchiveConversation() {
  return mutation((a, id: string) => a.toggleArchivedConversation(id));
}
export function usePendingRequests() {
  return query(
    ["requests"],
    async (a) =>
      Promise.all((await a.getMessageRequests()).map((r) => request(a, r))),
    true,
    10000,
  );
}
export function useSendMessageRequest() {
  return mutation(async (a, v: { recipientId: string; previewText: string }) =>
    request(a, await a.sendMessageRequest(v.recipientId, v.previewText.trim())),
  );
}
export function useAcceptRequest() {
  return mutation(async (a, id: string) => {
    const r = (await a.getMessageRequests()).find((r) => r.id === id);
    await a.acceptMessageRequest(id);
    return r ? request(a, r) : undefined;
  });
}
export function useDeclineRequest() {
  return mutation((a, id: string) => a.declineMessageRequest(id));
}
export function useCanMessage(id: string) {
  return query(["can-message", id], (a) => a.canMessageUser(id), !!id);
}
export function useUnreadCount() {
  return query(
    ["unread"],
    async (a) => {
      const [convos, requests] = await Promise.all([
        a.getConversations(),
        a.getMessageRequests(),
      ]);
      return convos.filter((c) => c.unreadCount > 0n).length + requests.length;
    },
    true,
    10000,
  );
}
export function useAddReaction() {
  return mutation(
    (a, v: { messageId: string; emoji: string; otherUserId: string }) =>
      a.addReaction(v.messageId, v.emoji),
  );
}
export function useRemoveReaction() {
  return mutation(
    (a, v: { messageId: string; emoji: string; otherUserId: string }) =>
      a.removeReaction(v.messageId, v.emoji),
  );
}
