import type { ScheduledLive, User } from "../domain/types";
import { normalizeUsername } from "./profileDisplay";

/** Stable WebRTC room key for a creator profile (used by the live engine + chat). */
export function liveRoomIdForUsername(username: string): string {
  const u = normalizeUsername(username);
  return u ? `u-${u}` : "";
}

export function liveRoomIdForUser(user: Pick<User, "id" | "username" | "displayName">): string {
  if (user.username?.trim()) return liveRoomIdForUsername(user.username);
  const fromName = user.displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  if (fromName) return `u-${fromName}`;
  return `uid-${user.id.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 24)}`;
}

export type ProfileLiveQuery = {
  liveId?: string;
  title?: string;
  ep?: string;
  spoilers?: boolean;
};

export function profileLivePath(username: string, query?: ProfileLiveQuery): string {
  const base = `/u/${encodeURIComponent(username)}/live`;
  if (!query) return base;
  const params = new URLSearchParams();
  if (query.liveId) params.set("live", query.liveId);
  if (query.title) params.set("title", query.title);
  if (query.ep) params.set("ep", query.ep);
  if (query.spoilers) params.set("spoilers", "1");
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

export function usernameFromRoomId(roomId: string): string | undefined {
  if (roomId.startsWith("u-")) return roomId.slice(2);
  return undefined;
}

export function livePathForScheduled(live: ScheduledLive): string {
  const handle = live.ownerUsername ?? usernameFromRoomId(live.roomId);
  if (handle) {
    return profileLivePath(handle, { liveId: live.id, title: live.title });
  }
  return `/watch/live?room=${encodeURIComponent(live.roomId)}&title=${encodeURIComponent(live.title)}`;
}

export type LiveEngineRole = "host" | "viewer" | "guest";

export function liveEngineIframeParams(
  roomId: string,
  hostUsername?: string,
  opts?: { role?: LiveEngineRole; layout?: "broadcast" | "call"; audioOnly?: boolean },
): URLSearchParams {
  const p = new URLSearchParams();
  p.set("room", roomId);
  p.set("autojoin", "1");
  p.set("embed", "1");
  p.set("layout", opts?.layout ?? "broadcast");
  p.set("role", opts?.role ?? "host");
  if (hostUsername) p.set("host", hostUsername);
  if (opts?.audioOnly) p.set("audioOnly", "1");
  return p;
}
