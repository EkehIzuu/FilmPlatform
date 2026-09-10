export type PremiereChatMessage = {
  id: string;
  eventId: string;
  authorName: string;
  body: string;
  createdAt: string;
  kind?: "chat" | "reaction";
};

function storageKey(eventId: string): string {
  return `izora-premiere-chat-${eventId}`;
}

export function loadPremiereChat(eventId: string): PremiereChatMessage[] {
  try {
    const raw = sessionStorage.getItem(storageKey(eventId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PremiereChatMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const PREMIERE_CHAT_REFRESH = "izora-premiere-chat-refresh";

export function savePremiereChat(eventId: string, messages: PremiereChatMessage[]): void {
  try {
    sessionStorage.setItem(storageKey(eventId), JSON.stringify(messages.slice(-120)));
    window.dispatchEvent(
      new CustomEvent(PREMIERE_CHAT_REFRESH, { detail: { eventId } }),
    );
  } catch {
    /* ignore */
  }
}

export function appendPremiereChat(
  eventId: string,
  msg: Omit<PremiereChatMessage, "id" | "createdAt" | "eventId">,
): PremiereChatMessage[] {
  const row: PremiereChatMessage = {
    id: `pc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    eventId,
    createdAt: new Date().toISOString(),
    ...msg,
  };
  const next = [...loadPremiereChat(eventId), row];
  savePremiereChat(eventId, next);
  return next;
}
