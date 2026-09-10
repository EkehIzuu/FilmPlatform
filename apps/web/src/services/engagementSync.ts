import type { Bookmark, ContentComment, ContentLike } from "../domain/types";
import { getSupabase } from "../lib/supabase";

export async function upsertContentLikeRemote(like: ContentLike): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from("content_likes").upsert({
    user_id: like.userId,
    target_type: like.targetType,
    target_id: like.targetId,
    created_at: like.createdAt,
  });
}

export async function deleteContentLikeRemote(
  userId: string,
  targetType: ContentLike["targetType"],
  targetId: string,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase
    .from("content_likes")
    .delete()
    .eq("user_id", userId)
    .eq("target_type", targetType)
    .eq("target_id", targetId);
}

export async function upsertCommentRemote(comment: ContentComment): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from("content_comments").upsert({
    id: comment.id,
    target_type: comment.targetType,
    target_id: comment.targetId,
    author_id: comment.authorId,
    author_name: comment.authorName,
    author_avatar_url: comment.authorAvatarUrl ?? null,
    body: comment.body,
    created_at: comment.createdAt,
  });
}

export async function deleteCommentRemote(commentId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from("content_comments").delete().eq("id", commentId);
}

export async function upsertBookmarkRemote(bookmark: Bookmark): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from("bookmarks").upsert({
    user_id: bookmark.userId,
    target_type: bookmark.targetType,
    target_id: bookmark.targetId,
    created_at: bookmark.createdAt,
  });
}

export async function deleteBookmarkRemote(
  userId: string,
  targetType: Bookmark["targetType"],
  targetId: string,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase
    .from("bookmarks")
    .delete()
    .eq("user_id", userId)
    .eq("target_type", targetType)
    .eq("target_id", targetId);
}
