import { resolveMediaUrl } from "../services/mediaStorage";
import { GLOBAL_LANGUAGE_OPTIONS } from "./localization";

export function profileAvatarSrc(avatarUrl: string | undefined): string {
  return resolveMediaUrl(avatarUrl);
}

export function profileInitials(displayName: string, email?: string): string {
  const name = displayName.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  const local = email?.split("@")[0] ?? "?";
  return local.slice(0, 2).toUpperCase();
}

/** @handle — lowercase letters, numbers, underscore; 3–24 chars */
export function normalizeUsername(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_]{3,24}$/.test(username);
}

export const PROFILE_LANGUAGES = GLOBAL_LANGUAGE_OPTIONS;
