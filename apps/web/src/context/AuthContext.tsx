import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CreatorTier, User } from "../domain/types";
import { getDemoCredentials } from "../lib/demoAuth";
import {
  getEmailConfirmRedirectUrl,
  getLoginRedirectUrl,
  getResetPasswordRedirectUrl,
} from "../lib/authRedirect";
import {
  buildLocalUser,
  loadPersistedLocalUser,
  localSignIn,
  localSignUp,
  persistLocalUser,
  useLocalAuthMode,
} from "../lib/localAuth";
import { isSupabaseConfigured } from "../lib/supabase";
import { getSupabase } from "../lib/supabase";
import { fetchProfile, findAvailableUsername, upsertProfile } from "../services/supabaseProfile";
import type { User as SupabaseUser } from "@supabase/supabase-js";

function mergeOAuthAvatar(profile: User, authUser: SupabaseUser): User {
  if (profile.avatarUrl) return profile;
  const pic = oauthAvatar(authUser.user_metadata ?? {});
  return pic ? normalizeUser({ ...profile, avatarUrl: pic }) : profile;
}

function oauthAvatar(meta: Record<string, unknown>): string | undefined {
  const picture =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture);
  return picture || undefined;
}

function userFromAuthSession(authUser: SupabaseUser): User {
  const meta = authUser.user_metadata ?? {};
  return normalizeUser({
    id: authUser.id,
    email: authUser.email ?? "",
    displayName:
      (typeof meta.display_name === "string" && meta.display_name) ||
      authUser.email?.split("@")[0] ||
      "Member",
    isCreator: Boolean(meta.is_creator),
    creatorTier: "free",
    avatarUrl: oauthAvatar(meta),
    preferredLanguage: "english",
    emailNotifications: true,
  });
}

function emailVerifiedFromAuth(authUser: SupabaseUser | null | undefined): boolean {
  if (!authUser) return false;
  return Boolean(authUser.email_confirmed_at);
}

function normalizeUser(partial: User): User {
  return {
    ...partial,
    creatorTier: partial.creatorTier ?? "free",
    preferredLanguage: partial.preferredLanguage ?? "english",
    emailNotifications: partial.emailNotifications ?? true,
    pushEnabled: partial.pushEnabled ?? false,
    marketingEmails: partial.marketingEmails ?? false,
    displayOverApps: partial.displayOverApps ?? true,
    premiereReminderLead: partial.premiereReminderLead ?? "24h",
    dmPrivacy: partial.dmPrivacy ?? "everyone",
    profileLocked: partial.profileLocked ?? false,
    trailerAutoplay: partial.trailerAutoplay ?? true,
    dataSaver: partial.dataSaver ?? false,
    showtimesLocal: partial.showtimesLocal ?? true,
    creatorVerificationStatus: partial.creatorVerificationStatus ?? "none",
    emailVerified: partial.emailVerified ?? false,
    coinBalance: partial.coinBalance ?? 0,
  };
}

function mergeAuthUser(profile: User, authUser: SupabaseUser): User {
  return normalizeUser({
    ...mergeOAuthAvatar(profile, authUser),
    emailVerified: emailVerifiedFromAuth(authUser),
  });
}

async function ensureSupabaseUsername(profile: User): Promise<User> {
  if (profile.username?.trim()) return profile;
  return {
    ...profile,
    username: await findAvailableUsername(profile.displayName, profile.email, profile.id),
  };
}

export type AuthMode = "local" | "supabase";

type AuthContextValue = {
  user: User | null;
  authReady: boolean;
  authMode: AuthMode;
  /** False when Supabase account exists but email is not confirmed yet. */
  emailVerified: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    isCreator: boolean,
  ) => Promise<boolean>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<User>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  resendConfirmationEmail: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const localAuth = useLocalAuthMode();
  const authUsesSupabase = isSupabaseConfigured() && !localAuth;
  const [authReady, setAuthReady] = useState(!authUsesSupabase);
  const [emailVerified, setEmailVerified] = useState(() => !authUsesSupabase);

  const [user, setUser] = useState<User | null>(() => {
    if (authUsesSupabase) return null;
    const persisted = loadPersistedLocalUser();
    if (persisted) return normalizeUser({ ...persisted, emailVerified: true });
    const demo = getDemoCredentials();
    if (demo) {
      try {
        return normalizeUser(localSignIn(demo.email, demo.password));
      } catch {
        return null;
      }
    }
    return null;
  });

  useEffect(() => {
    if (authUsesSupabase) return;
    persistLocalUser(user);
  }, [authUsesSupabase, user]);

  useEffect(() => {
    if (!authUsesSupabase) return;

    const supabase = getSupabase();
    if (!supabase) return;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        const authUser = data.session.user;
        const profile = await fetchProfile(authUser.id);
        let next = profile
          ? mergeAuthUser(profile, authUser)
          : mergeAuthUser(userFromAuthSession(authUser), authUser);
        next = await ensureSupabaseUsername(next);
        if (!profile || !profile.username || (!profile.avatarUrl && next.avatarUrl)) await upsertProfile(next);
        setUser(next);
        setEmailVerified(emailVerifiedFromAuth(authUser));
        persistLocalUser(next);
      }
      setAuthReady(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null);
        setEmailVerified(false);
        persistLocalUser(null);
        return;
      }
      setEmailVerified(emailVerifiedFromAuth(session.user));
      void fetchProfile(session.user.id).then(async (profile) => {
        let next = profile
          ? mergeAuthUser(profile, session.user)
          : mergeAuthUser(
              await (async () => {
                const fallback = userFromAuthSession(session.user);
                await upsertProfile(fallback);
                return fallback;
              })(),
              session.user,
            );
        next = await ensureSupabaseUsername(next);
        if (!profile || !profile.username || (profile && !profile.avatarUrl && next.avatarUrl)) await upsertProfile(next);
        setUser(next);
        persistLocalUser(next);
      });
    });

    return () => sub.subscription.unsubscribe();
  }, [authUsesSupabase]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const e = email.trim().toLowerCase();
      if (!e) return;

      if (!authUsesSupabase) {
        const next = localSignIn(e, password);
        setUser(normalizeUser({ ...next, emailVerified: true }));
        setEmailVerified(true);
        return;
      }

      const supabase = getSupabase();
      if (!supabase) return;
      const { error } = await supabase.auth.signInWithPassword({
        email: e,
        password,
      });
      if (error) throw new Error(error.message);
      const authUser = (await supabase.auth.getUser()).data.user;
      if (!authUser) return;
      const profile = await fetchProfile(authUser.id);
      let next = profile
        ? mergeAuthUser(profile, authUser)
        : mergeAuthUser(userFromAuthSession(authUser), authUser);
      next = await ensureSupabaseUsername(next);
      if (!profile || !profile.username || (!profile.avatarUrl && next.avatarUrl)) await upsertProfile(next);
      setUser(next);
      setEmailVerified(emailVerifiedFromAuth(authUser));
      persistLocalUser(next);
    },
    [authUsesSupabase],
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      displayName: string,
      isCreator: boolean,
    ) => {
      const e = email.trim().toLowerCase();
      if (!e) return;

      if (!authUsesSupabase) {
        const next = localSignUp(e, password, displayName, isCreator);
        setUser(normalizeUser({ ...next, emailVerified: true }));
        setEmailVerified(true);
        return false;
      }

      const supabase = getSupabase();
      if (!supabase) return false;
      const { data, error } = await supabase.auth.signUp({
        email: e,
        password,
        options: {
          emailRedirectTo: getEmailConfirmRedirectUrl(),
          data: {
            display_name: displayName.trim() || e.split("@")[0] || "Member",
            is_creator: isCreator,
          },
        },
      });
      if (error) throw new Error(error.message);

      const needsEmailConfirmation = !data.session;
      if (data.session?.user) {
        const authUser = data.user ?? data.session.user;
        let u = mergeAuthUser(
          normalizeUser({
            id: authUser.id,
            email: e,
            displayName: displayName.trim() || e.split("@")[0] || "Member",
            isCreator,
            creatorTier: "free",
          }),
          authUser,
        );
        u = await ensureSupabaseUsername(u);
        await upsertProfile(u);
        setUser(u);
        setEmailVerified(emailVerifiedFromAuth(authUser));
        persistLocalUser(u);
      } else {
        setUser(null);
        setEmailVerified(false);
        persistLocalUser(null);
      }
      return needsEmailConfirmation;
    },
    [authUsesSupabase],
  );

  const signOut = useCallback(async () => {
    if (authUsesSupabase) {
      const supabase = getSupabase();
      if (supabase) await supabase.auth.signOut();
    }
    setUser(null);
    setEmailVerified(false);
    persistLocalUser(null);
  }, [authUsesSupabase]);

  const refreshProfile = useCallback(async () => {
    if (!authUsesSupabase) return;
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: authData } = await supabase.auth.getUser();
    const authUser = authData.user;
    if (!authUser) return;
    const profile = await fetchProfile(authUser.id);
    if (!profile) return;
    const next = await ensureSupabaseUsername(mergeAuthUser(profile, authUser));
    if (!profile.username) await upsertProfile(next);
    setUser(next);
    setEmailVerified(emailVerifiedFromAuth(authUser));
    persistLocalUser(next);
  }, [authUsesSupabase]);

  const updateProfile = useCallback(
    async (patch: Partial<User>) => {
      await new Promise<void>((resolve) => {
        setUser((u) => {
          if (!u) {
            resolve();
            return null;
          }
          const next = normalizeUser({ ...u, ...patch });
          persistLocalUser(next);
          if (authUsesSupabase) {
            void upsertProfile(next).finally(() => resolve());
          } else {
            resolve();
          }
          return next;
        });
      });
    },
    [authUsesSupabase],
  );

  const requestPasswordReset = useCallback(
    async (email: string) => {
      const e = email.trim().toLowerCase();
      if (!e) throw new Error("Enter your email address.");

      if (!authUsesSupabase) {
        throw new Error("Password reset is not used with local demo auth.");
      }

      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase is not configured.");

      const { error } = await supabase.auth.resetPasswordForEmail(e, {
        redirectTo: getResetPasswordRedirectUrl(),
      });
      if (error) throw new Error(error.message);
    },
    [authUsesSupabase],
  );

  const resendConfirmationEmail = useCallback(
    async (email: string) => {
      const e = email.trim().toLowerCase();
      if (!e) throw new Error("Enter your email address.");

      if (!authUsesSupabase) {
        throw new Error("Email confirmation is not used with local demo auth.");
      }

      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase is not configured.");

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: e,
        options: { emailRedirectTo: getLoginRedirectUrl() },
      });
      if (error) throw new Error(error.message);
    },
    [authUsesSupabase],
  );

  const updatePassword = useCallback(
    async (password: string) => {
      if (password.length < 6) throw new Error("Password must be at least 6 characters.");

      if (!authUsesSupabase) {
        throw new Error("Password change is not used with local demo auth.");
      }

      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase is not configured.");

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
    },
    [authUsesSupabase],
  );

  useEffect(() => {
    if (!localAuth) return;
    setAuthReady(true);
    const supabase = getSupabase();
    if (supabase) void supabase.auth.signOut();
  }, [localAuth]);

  useEffect(() => {
    const demo = getDemoCredentials();
    if (!demo || !authReady || user) return;

    try {
      const next = localSignIn(demo.email, demo.password);
      setUser(normalizeUser(next));
    } catch (err: unknown) {
      console.warn(
        "[Izora] Demo auto-login failed:",
        err instanceof Error ? err.message : err,
      );
    }
  }, [authReady, user, localAuth]);

  const resolvedEmailVerified = authUsesSupabase
    ? emailVerified || user?.emailVerified === true
    : true;

  const value = useMemo(
    () => ({
      user,
      authReady,
      authMode: authUsesSupabase ? ("supabase" as const) : ("local" as const),
      emailVerified: resolvedEmailVerified,
      signIn,
      signUp,
      signOut,
      updateProfile,
      refreshProfile,
      requestPasswordReset,
      updatePassword,
      resendConfirmationEmail,
    }),
    [
      user,
      authReady,
      authUsesSupabase,
      resolvedEmailVerified,
      signIn,
      signUp,
      signOut,
      updateProfile,
      refreshProfile,
      requestPasswordReset,
      updatePassword,
      resendConfirmationEmail,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function tierRank(t: CreatorTier | undefined): number {
  if (t === "featured") return 2;
  if (t === "verified") return 1;
  return 0;
}
