/** In-memory live room state (TikTok-style broadcast metadata). */

const MAX_CHAT = 300;
const MAX_GUEST_QUEUE = 50;

/** @typedef {{ id: string, socketId: string, userId?: string, displayName: string, avatarUrl?: string, role: 'host'|'viewer'|'guest'|'mod', audioOnly?: boolean }} LiveMember */

/**
 * @typedef {object} LiveRoom
 * @property {string} roomId
 * @property {string|null} hostSocketId
 * @property {string|null} hostUserId
 * @property {Map<string, LiveMember>} members
 * @property {{ id: string, userId?: string, displayName: string, avatarUrl?: string, at: string }[]} guestQueue
 * @property {object[]} chat
 * @property {string|null} pinnedChatId
 * @property {number} likeCount
 * @property {number} viewerCount
 * @property {boolean} isLive
 * @property {boolean} slowMode
 * @property {boolean} followersOnly
 * @property {boolean} privateLive
 * @property {string|null} title
 * @property {object|null} poll
 * @property {{ id: string, userId?: string, displayName: string, body: string, at: string }[]} qa
 * @property {object[]} recentGifts
 * @property {Record<string, number>} giftTotals
 */

/** @type {Map<string, LiveRoom>} */
const rooms = new Map();

function defaultRoom(roomId) {
  return {
    roomId,
    hostSocketId: null,
    hostUserId: null,
    members: new Map(),
    guestQueue: [],
    chat: [],
    pinnedChatId: null,
    likeCount: 0,
    viewerCount: 0,
    isLive: false,
    slowMode: false,
    followersOnly: false,
    privateLive: false,
    title: null,
    poll: null,
    qa: [],
    recentGifts: [],
    giftTotals: {},
  };
}

export function getRoom(roomId) {
  const id = String(roomId || "").trim().slice(0, 64);
  if (!id) return null;
  if (!rooms.has(id)) rooms.set(id, defaultRoom(id));
  return rooms.get(id);
}

export function deleteRoomIfEmpty(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.members.size > 0) return;
  rooms.delete(roomId);
}

function publicState(room) {
  const guests = [];
  const hosts = [];
  for (const m of room.members.values()) {
    if (m.role === "guest") guests.push({ id: m.id, displayName: m.displayName, avatarUrl: m.avatarUrl, audioOnly: m.audioOnly });
    if (m.role === "host") hosts.push({ id: m.id, displayName: m.displayName, avatarUrl: m.avatarUrl });
  }
  return {
    roomId: room.roomId,
    isLive: room.isLive,
    title: room.title,
    likeCount: room.likeCount,
    viewerCount: room.viewerCount,
    guestCount: guests.length,
    layout: guests.length === 0 ? "solo" : guests.length === 1 ? "duo" : "grid",
    hosts,
    guests,
    guestQueue: room.guestQueue.map((g) => ({
      id: g.id,
      displayName: g.displayName,
      avatarUrl: g.avatarUrl,
    })),
    pinnedChatId: room.pinnedChatId,
    slowMode: room.slowMode,
    followersOnly: room.followersOnly,
    privateLive: room.privateLive,
    poll: room.poll,
    recentGifts: room.recentGifts.slice(-8),
    topGifters: Object.entries(room.giftTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([userId, coins]) => ({ userId, coins })),
  };
}

export function snapshot(room) {
  return publicState(room);
}

export function addChat(room, msg) {
  room.chat.push(msg);
  if (room.chat.length > MAX_CHAT) room.chat = room.chat.slice(-MAX_CHAT);
  return msg;
}

export function removeChat(room, messageId) {
  const before = room.chat.length;
  room.chat = room.chat.filter((m) => m.id !== messageId);
  if (room.pinnedChatId === messageId) room.pinnedChatId = null;
  return before !== room.chat.length;
}

export function addGuestRequest(room, entry) {
  if (room.guestQueue.some((g) => g.userId && g.userId === entry.userId)) return null;
  if (room.guestQueue.length >= MAX_GUEST_QUEUE) return null;
  room.guestQueue.push(entry);
  return entry;
}

export function popGuestRequest(room, requestId) {
  const idx = room.guestQueue.findIndex((g) => g.id === requestId);
  if (idx < 0) return null;
  const [entry] = room.guestQueue.splice(idx, 1);
  return entry;
}

export function recalcViewerCount(room) {
  room.viewerCount = [...room.members.values()].filter((m) => m.role === "viewer").length;
  return room.viewerCount;
}

export { publicState };
