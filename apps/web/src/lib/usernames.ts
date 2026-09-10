import { normalizeUsername } from "./profileDisplay";

function suffixFromId(id: string): string {
  let hash = 0;
  for (const ch of id) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  return String(hash % 1_000_000).padStart(6, "0");
}

export function usernameBase(displayName: string, email?: string): string {
  const fromName = normalizeUsername(displayName.replace(/\s+/g, "_"));
  if (fromName.length >= 3) return fromName;
  const fromEmail = normalizeUsername(email?.split("@")[0] ?? "");
  if (fromEmail.length >= 3) return fromEmail;
  return "user";
}

export function usernameWithSuffix(base: string, suffix: string): string {
  const cleanBase = normalizeUsername(base) || "user";
  const cleanSuffix = normalizeUsername(suffix).replace(/^_+/, "") || "000000";
  const room = Math.max(3, 24 - cleanSuffix.length);
  return `${cleanBase.slice(0, room)}${cleanSuffix}`.slice(0, 24);
}

export function defaultUsername(displayName: string, email: string | undefined, userId: string): string {
  return usernameWithSuffix(usernameBase(displayName, email), suffixFromId(userId));
}
