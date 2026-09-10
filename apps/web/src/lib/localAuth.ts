import type { User } from "../domain/types";
import { newId } from "../domain/id";
import { getDemoCredentials, isDemoAutoLoginEnabled } from "./demoAuth";
import { defaultUsername } from "./usernames";

const AUTH_KEY = "film-auth-v1";
const USER_ID_KEY_PREFIX = "film-local-user-id:";

/** Auth stays in the browser — no Supabase sign-in (data/API can still use Supabase). */
export function useLocalAuthMode(): boolean {
  const mode = import.meta.env.VITE_AUTH_MODE?.trim().toLowerCase();
  if (mode === "local") return true;
  if (mode === "supabase") return false;
  return isDemoAutoLoginEnabled();
}

export function loadPersistedLocalUser(): User | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function persistLocalUser(user: User | null): void {
  if (user) localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  else localStorage.removeItem(AUTH_KEY);
}

function stableLocalUserId(email: string): string {
  const fromEnv = import.meta.env.VITE_DEMO_USER_ID?.trim();
  if (fromEnv) return fromEnv;

  const key = USER_ID_KEY_PREFIX + email;
  let id = localStorage.getItem(key);
  if (!id) {
    id = newId();
    localStorage.setItem(key, id);
  }
  return id;
}

function demoIsCreator(email: string): boolean {
  const flag = import.meta.env.VITE_DEMO_IS_CREATOR?.trim().toLowerCase();
  if (flag === "true" || flag === "1" || flag === "yes") return true;
  return email.includes("creator") || email.endsWith("+c@test.local");
}

export function assertLocalCredentials(email: string, password: string): void {
  const demo = getDemoCredentials();
  if (!demo) return;

  const e = email.trim().toLowerCase();
  if (e !== demo.email || password !== demo.password) {
    throw new Error("Invalid email or password.");
  }
}

export function buildLocalUser(
  email: string,
  patch?: Partial<Pick<User, "displayName" | "isCreator">>,
): User {
  const e = email.trim().toLowerCase();
  const existing = loadPersistedLocalUser();
  if (existing && existing.email === e) {
    const displayName = patch?.displayName?.trim() || existing.displayName;
    return {
      ...existing,
      ...patch,
      email: e,
      displayName,
      isCreator: patch?.isCreator ?? existing.isCreator,
      username: existing.username || defaultUsername(displayName, e, existing.id),
    };
  }
  const id = stableLocalUserId(e);
  const displayName = patch?.displayName?.trim() || e.split("@")[0] || "Member";

  return {
    id,
    email: e,
    displayName,
    username: defaultUsername(displayName, e, id),
    isCreator: patch?.isCreator ?? demoIsCreator(e),
    creatorTier: "free",
    preferredLanguage: "english",
    emailNotifications: true,
    emailVerified: true,
    creatorVerificationStatus: "none",
  };
}

export function localSignIn(email: string, password: string): User {
  assertLocalCredentials(email, password);
  const user = buildLocalUser(email);
  persistLocalUser(user);
  return user;
}

export function localSignUp(
  email: string,
  password: string,
  displayName: string,
  isCreator: boolean,
): User {
  assertLocalCredentials(email, password);
  const user = buildLocalUser(email, {
    displayName: displayName.trim() || email.split("@")[0] || "Member",
    isCreator,
  });
  persistLocalUser(user);
  return user;
}
