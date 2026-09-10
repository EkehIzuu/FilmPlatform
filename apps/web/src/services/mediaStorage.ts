import { getSupabase, isSupabaseConfigured } from "../lib/supabase";

export const MEDIA_BUCKET = "izora-media";

export function isMediaStorageEnabled(): boolean {
  return isSupabaseConfigured();
}

/**
 * True when a media URL is safe to persist to the database. `blob:`/`data:`
 * URLs are session-only previews (optimistic posting) and become dead links
 * after a reload, so they must never be written to a remote row.
 */
export function isPersistableMediaUrl(url: string | undefined | null): boolean {
  if (!url || !url.trim()) return false;
  return !/^(blob:|data:)/i.test(url);
}

export function buildMediaObjectPath(
  userId: string,
  titleId: string,
  kind: string,
  fileName: string,
): string {
  const safe = fileName.replace(/[^\w.\-()+]/g, "_");
  return `${userId}/${titleId}/${kind}/${Date.now()}-${safe}`;
}

export async function uploadMediaFile(input: {
  userId: string;
  titleId: string;
  kind: string;
  file: File;
  onProgress?: (pct: number) => void;
}): Promise<{ storagePath: string; publicUrl: string }> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");

  const path = buildMediaObjectPath(
    input.userId,
    input.titleId,
    input.kind,
    input.file.name,
  );

  input.onProgress?.(5);

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, input.file, {
    cacheControl: "3600",
    upsert: false,
    contentType: input.file.type || undefined,
  });

  if (error) throw new Error(error.message);

  input.onProgress?.(100);

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { storagePath: path, publicUrl: data.publicUrl };
}

export function buildAvatarPath(userId: string, fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
  return `${userId}/avatar/avatar.${safeExt}`;
}

export async function uploadAvatarFile(input: {
  userId: string;
  file: File;
}): Promise<{ storagePath: string; publicUrl: string }> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");

  const path = buildAvatarPath(input.userId, input.file.name);

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, input.file, {
    cacheControl: "3600",
    upsert: true,
    contentType: input.file.type || undefined,
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { storagePath: path, publicUrl: data.publicUrl };
}

export function buildCoverPath(userId: string, fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const safeExt = ["jpg", "jpeg", "png", "webp", "gif"].includes(ext) ? ext : "jpg";
  return `${userId}/cover/cover.${safeExt}`;
}

export async function uploadCoverFile(input: {
  userId: string;
  file: File;
}): Promise<{ storagePath: string; publicUrl: string }> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");

  const path = buildCoverPath(input.userId, input.file.name);

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, input.file, {
    cacheControl: "3600",
    upsert: true,
    contentType: input.file.type || undefined,
  });

  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { storagePath: path, publicUrl: data.publicUrl };
}

export async function removeCoverFile(storagePath: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !storagePath.trim()) return;
  await supabase.storage.from(MEDIA_BUCKET).remove([storagePath]);
}

export function buildStoryPath(userId: string, fileName: string): string {
  const safe = fileName.replace(/[^\w.\-()+]/g, "_");
  return `${userId}/stories/${Date.now()}-${safe}`;
}

export async function uploadStoryFile(input: {
  userId: string;
  file: File;
  onProgress?: (pct: number) => void;
}): Promise<{ storagePath: string; publicUrl: string }> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase is not configured.");

  const path = buildStoryPath(input.userId, input.file.name);
  input.onProgress?.(10);

  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, input.file, {
    cacheControl: "3600",
    upsert: false,
    contentType: input.file.type || undefined,
  });

  if (error) throw new Error(error.message);

  input.onProgress?.(100);
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return { storagePath: path, publicUrl: data.publicUrl };
}

export async function removeAvatarFile(storagePath: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !storagePath.trim()) return;
  await supabase.storage.from(MEDIA_BUCKET).remove([storagePath]);
}

export function resolveMediaUrl(stored: string | undefined): string {
  if (!stored?.trim()) return "";
  // Local previews (optimistic posting) and already-absolute URLs pass through.
  if (/^(https?:|blob:|data:)/i.test(stored)) return stored;
  const supabase = getSupabase();
  if (!supabase) return stored;
  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(stored);
  return data.publicUrl;
}
