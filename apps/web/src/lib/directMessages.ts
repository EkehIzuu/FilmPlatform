import type { DirectConversation, MessagePeer } from "../domain/types";

/** Stable 1:1 thread id from two user ids. */
export function conversationIdForPair(a: string, b: string): string {
  return [a, b].sort().join(":");
}

export function otherMemberId(conv: DirectConversation, userId: string): string {
  return conv.memberIds[0] === userId ? conv.memberIds[1] : conv.memberIds[0];
}

export function conversationIsUnread(
  conv: DirectConversation,
  userId: string,
): boolean {
  if (!conv.lastMessageAt || !conv.lastMessageSenderId) return false;
  if (conv.lastMessageSenderId === userId) return false;
  const readAt = conv.readAtByUser[userId];
  if (!readAt) return true;
  return readAt < conv.lastMessageAt;
}

export function peerMatchesQuery(peer: MessagePeer, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  if (peer.displayName.toLowerCase().includes(s)) return true;
  if (peer.username?.toLowerCase().includes(s)) return true;
  return false;
}

export function peerProfilePath(peer: MessagePeer): string | undefined {
  if (peer.username?.trim()) return `/u/${peer.username.trim()}`;
  return undefined;
}
