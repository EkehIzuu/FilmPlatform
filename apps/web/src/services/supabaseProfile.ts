import type { CreatorTier, CreatorVerificationStatus, User } from "../domain/types";
import { normalizeUsername } from "../lib/profileDisplay";
import { getSupabase } from "../lib/supabase";
import { defaultUsername, usernameBase, usernameWithSuffix } from "../lib/usernames";

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string;
  is_creator: boolean;
  creator_tier: CreatorTier;
  region: string | null;
  birth_year: number | null;
  date_of_birth: string | null;
  place_of_birth: string | null;
  adult_confirmed: boolean | null;
  avatar_url: string | null;
  cover_photo_url: string | null;
  bio: string | null;
  username: string | null;
  preferred_language: string | null;
  city: string | null;
  headline: string | null;
  workplace: string | null;
  schools: string | null;
  certifications: string | null;
  languages_spoken: string | null;
  website_url: string | null;
  instagram: string | null;
  email_notifications: boolean | null;
  push_enabled: boolean | null;
  marketing_emails: boolean | null;
  display_over_apps: boolean | null;
  premiere_reminder_lead: string | null;
  dm_privacy: string | null;
  profile_locked: boolean | null;
  trailer_autoplay: boolean | null;
  data_saver: boolean | null;
  showtimes_local: boolean | null;
  creator_verification_status: CreatorVerificationStatus | null;
  verification_message: string | null;
  verification_requested_at: string | null;
  verified_at: string | null;
};

export function profileRowToUser(row: ProfileRow): User {
  return {
    id: row.id,
    email: row.email ?? "",
    displayName: row.display_name || "Member",
    isCreator: row.is_creator,
    creatorTier: row.creator_tier ?? "free",
    region: row.region ?? undefined,
    birthYear: row.birth_year ?? undefined,
    dateOfBirth: row.date_of_birth ?? undefined,
    placeOfBirth: row.place_of_birth ?? undefined,
    adultConfirmed: row.adult_confirmed ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    coverPhotoUrl: row.cover_photo_url ?? undefined,
    bio: row.bio ?? undefined,
    username: row.username ?? undefined,
    preferredLanguage: row.preferred_language ?? "english",
    city: row.city ?? undefined,
    headline: row.headline ?? undefined,
    workplace: row.workplace ?? undefined,
    schools: row.schools ?? undefined,
    certifications: row.certifications ?? undefined,
    languagesSpoken: row.languages_spoken ?? undefined,
    websiteUrl: row.website_url ?? undefined,
    instagram: row.instagram ?? undefined,
    emailNotifications: row.email_notifications ?? true,
    pushEnabled: row.push_enabled ?? false,
    marketingEmails: row.marketing_emails ?? false,
    displayOverApps: row.display_over_apps ?? true,
    premiereReminderLead: (row.premiere_reminder_lead as User["premiereReminderLead"]) ?? "24h",
    dmPrivacy: (row.dm_privacy as User["dmPrivacy"]) ?? "everyone",
    profileLocked: row.profile_locked ?? false,
    trailerAutoplay: row.trailer_autoplay ?? true,
    dataSaver: row.data_saver ?? false,
    showtimesLocal: row.showtimes_local ?? true,
    creatorVerificationStatus: row.creator_verification_status ?? "none",
    verificationMessage: row.verification_message ?? undefined,
    verificationRequestedAt: row.verification_requested_at ?? undefined,
    verifiedAt: row.verified_at ?? undefined,
  };
}

export async function fetchProfile(userId: string): Promise<User | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return profileRowToUser(data as ProfileRow);
}

export async function searchProfiles(
  query: string,
  exceptUserId: string,
  limit = 20,
): Promise<User[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const q = query.trim();
  if (q.length < 1) return [];

  const needle = q.toLowerCase();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .neq("id", exceptUserId)
    .limit(Math.min(limit * 4, 80));

  if (error || !data) return [];
  return (data as ProfileRow[])
    .map(profileRowToUser)
    .filter(
      (u) =>
        u.displayName.toLowerCase().includes(needle) ||
        (u.username?.toLowerCase().includes(needle) ?? false),
    )
    .slice(0, limit);
}

export async function fetchProfileByUsername(username: string): Promise<User | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", normalizeUsername(username))
    .maybeSingle();

  if (error || !data) return null;
  return profileRowToUser(data as ProfileRow);
}

export async function isUsernameTaken(username: string, exceptUserId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", normalizeUsername(username))
    .maybeSingle();

  if (error || !data) return false;
  return String(data.id) !== exceptUserId;
}

export async function findAvailableUsername(
  displayName: string,
  email: string | undefined,
  userId: string,
  preferred?: string,
): Promise<string> {
  const preferredBase = preferred?.trim() ? usernameBase(preferred) : "";
  const base = preferredBase || usernameBase(displayName, email);
  const first = preferredBase || defaultUsername(displayName, email, userId);
  const candidates = [first];
  for (let n = 0; n < 20; n += 1) {
    candidates.push(usernameWithSuffix(base, String(100000 + Math.floor(Math.random() * 900000) + n)));
  }

  for (const candidate of candidates) {
    if (!(await isUsernameTaken(candidate, userId))) return candidate;
  }
  return usernameWithSuffix(base, String(Date.now()).slice(-6));
}

export async function upsertProfile(user: User): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from("profiles").upsert({
    id: user.id,
    email: user.email,
    display_name: user.displayName,
    is_creator: user.isCreator,
    creator_tier: user.creatorTier ?? "free",
    region: user.region ?? null,
    birth_year: user.birthYear ?? null,
    date_of_birth: user.dateOfBirth ?? null,
    place_of_birth: user.placeOfBirth?.trim() || null,
    adult_confirmed: user.adultConfirmed ?? null,
    avatar_url: user.avatarUrl ?? null,
    cover_photo_url: user.coverPhotoUrl ?? null,
    bio: user.bio?.trim() || null,
    username: user.username?.trim() || null,
    preferred_language: user.preferredLanguage ?? "english",
    city: user.city?.trim() || null,
    headline: user.headline?.trim() || null,
    workplace: user.workplace?.trim() || null,
    schools: user.schools?.trim() || null,
    certifications: user.certifications?.trim() || null,
    languages_spoken: user.languagesSpoken?.trim() || null,
    website_url: user.websiteUrl?.trim() || null,
    instagram: user.instagram?.replace(/^@/, "").trim() || null,
    email_notifications: user.emailNotifications ?? true,
    push_enabled: user.pushEnabled ?? false,
    marketing_emails: user.marketingEmails ?? false,
    display_over_apps: user.displayOverApps ?? true,
    premiere_reminder_lead: user.premiereReminderLead ?? "24h",
    dm_privacy: user.dmPrivacy ?? "everyone",
    profile_locked: user.profileLocked ?? false,
    trailer_autoplay: user.trailerAutoplay ?? true,
    data_saver: user.dataSaver ?? false,
    showtimes_local: user.showtimesLocal ?? true,
    updated_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
}
