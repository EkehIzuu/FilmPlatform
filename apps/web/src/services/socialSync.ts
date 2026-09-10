import type {
  AppNotification,
  ContentComment,
  ContentLike,
  DirectConversation,
  DirectMessage,
  FilmDataState,
  FollowEdge,
  PostLike,
  StoryClip,
  UserBlock,
} from "../domain/types";
import { getSupabase } from "../lib/supabase";
import { isPersistableMediaUrl } from "./mediaStorage";

export type SocialPatch = Pick<
  FilmDataState,
  | "stories"
  | "directConversations"
  | "directMessages"
  | "notifications"
  | "userBlocks"
  | "contentLikes"
  | "postLikes"
  | "comments"
  | "follows"
>;

function rowToStory(row: Record<string, unknown>): StoryClip {
  return {
    id: String(row.id),
    authorId: String(row.author_id),
    authorName: String(row.author_name),
    authorAvatarUrl: row.author_avatar_url ? String(row.author_avatar_url) : undefined,
    caption: row.caption ? String(row.caption) : undefined,
    mediaUrl: String(row.media_url),
    mediaType: row.media_type as StoryClip["mediaType"],
    createdAt: String(row.created_at),
    expiresAt: String(row.expires_at),
  };
}

function rowToConversation(row: Record<string, unknown>): DirectConversation {
  const members = (row.member_ids as string[]) ?? [];
  return {
    id: String(row.id),
    memberIds: [members[0], members[1]].sort() as [string, string],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    lastMessageAt: row.last_message_at ? String(row.last_message_at) : undefined,
    lastMessagePreview: row.last_message_preview
      ? String(row.last_message_preview)
      : undefined,
    lastMessageSenderId: row.last_message_sender_id
      ? String(row.last_message_sender_id)
      : undefined,
    readAtByUser: (row.read_at_by_user as Record<string, string>) ?? {},
  };
}

export async function loadSocialPatch(userId: string): Promise<SocialPatch | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const [storiesRes, convRes, notifRes, blocksRes, postLikesRes, contentLikesRes, commentsRes, followsRes] =
    await Promise.all([
      supabase
        .from("user_stories")
        .select("*")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("direct_conversations").select("*").contains("member_ids", [userId]),
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("user_blocks").select("*").eq("blocker_id", userId),
      supabase.from("post_likes").select("*"),
      supabase.from("content_likes").select("*"),
      supabase.from("content_comments").select("*").order("created_at", { ascending: true }).limit(5000),
      supabase.from("follows").select("*"),
    ]);

  if (storiesRes.error) console.warn("[social] stories", storiesRes.error.message);
  if (convRes.error) console.warn("[social] conv", convRes.error.message);

  const convIds = [...new Set((convRes.data ?? []).map((c) => String(c.id)))];
  let directMessages: DirectMessage[] = [];
  if (convIds.length > 0) {
    const msgRes = await supabase
      .from("direct_messages")
      .select("*")
      .in("conversation_id", convIds)
      .order("created_at", { ascending: true })
      .limit(2000);
    if (msgRes.error) console.warn("[social] messages", msgRes.error.message);
    directMessages = (msgRes.data ?? []).map((row) => ({
      id: String(row.id),
      conversationId: String(row.conversation_id),
      senderId: String(row.sender_id),
      body: String(row.body),
      createdAt: String(row.created_at),
    }));
  }

  const postLikes: PostLike[] = (postLikesRes.data ?? []).map((row) => ({
    userId: String(row.user_id),
    postId: String(row.post_id),
    createdAt: String(row.created_at),
  }));

  const contentLikes: ContentLike[] = [
    ...postLikes.map((l) => ({
      userId: l.userId,
      targetType: "post" as const,
      targetId: l.postId,
      createdAt: l.createdAt,
    })),
    ...(contentLikesRes.data ?? []).map((row) => ({
      userId: String(row.user_id),
      targetType: row.target_type as ContentLike["targetType"],
      targetId: String(row.target_id),
      createdAt: String(row.created_at),
    })),
  ];

  const comments: ContentComment[] = (commentsRes.data ?? []).map((row) => ({
    id: String(row.id),
    targetType: row.target_type as ContentComment["targetType"],
    targetId: String(row.target_id),
    authorId: String(row.author_id),
    authorName: String(row.author_name),
    authorAvatarUrl: row.author_avatar_url ? String(row.author_avatar_url) : undefined,
    body: String(row.body),
    createdAt: String(row.created_at),
  }));

  const follows: FollowEdge[] = (followsRes.data ?? []).map((row) => ({
    id: String(row.id),
    followerId: String(row.follower_id),
    targetType: row.target_type as FollowEdge["targetType"],
    targetId: String(row.target_id),
    createdAt: String(row.created_at),
  }));

  return {
    stories: (storiesRes.data ?? []).map((r) => rowToStory(r as Record<string, unknown>)),
    directConversations: (convRes.data ?? []).map((r) =>
      rowToConversation(r as Record<string, unknown>),
    ),
    directMessages,
    notifications: (notifRes.data ?? []).map((row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      kind: String(row.kind),
      message: String(row.message),
      read: Boolean(row.read),
      href: row.href ? String(row.href) : undefined,
      createdAt: String(row.created_at),
    })),
    userBlocks: (blocksRes.data ?? []).map((row) => ({
      id: String(row.id),
      blockerId: String(row.blocker_id),
      blockedId: String(row.blocked_id),
      createdAt: String(row.created_at),
    })),
    postLikes,
    contentLikes,
    comments,
    follows,
  };
}

export async function upsertDirectMessageRemote(msg: DirectMessage): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from("direct_messages").upsert({
    id: msg.id,
    conversation_id: msg.conversationId,
    sender_id: msg.senderId,
    body: msg.body,
    created_at: msg.createdAt,
  });
}

export async function upsertConversationRemote(conv: DirectConversation): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from("direct_conversations").upsert({
    id: conv.id,
    member_ids: conv.memberIds,
    created_at: conv.createdAt,
    updated_at: conv.updatedAt,
    last_message_at: conv.lastMessageAt ?? null,
    last_message_preview: conv.lastMessagePreview ?? null,
    last_message_sender_id: conv.lastMessageSenderId ?? null,
    read_at_by_user: conv.readAtByUser,
  });
}

function storyInsertErrorMessage(error: { message: string; code?: string }): string {
  const msg = error.message ?? "Could not save clip.";
  if (error.code === "42P01" || (/user_stories/i.test(msg) && /does not exist/i.test(msg))) {
    return "Clips database table is missing. In Supabase SQL Editor, run supabase/009_user_stories.sql.";
  }
  if (/row-level security/i.test(msg)) {
    return "Permission denied saving clip. Sign out, sign back in, then try again.";
  }
  if (/invalid input syntax for type uuid/i.test(msg)) {
    return "Clip id rejected by database. Refresh the page and try again.";
  }
  return msg;
}

/** New clip posts — use insert (upsert needs an update policy). */
export async function insertStoryRemote(story: StoryClip): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Cloud database is not connected.");
  if (!isPersistableMediaUrl(story.mediaUrl)) {
    throw new Error("Clip media hasn't finished uploading yet. Try again.");
  }
  const { error } = await supabase.from("user_stories").insert({
    id: story.id,
    author_id: story.authorId,
    author_name: story.authorName,
    author_avatar_url: story.authorAvatarUrl ?? null,
    caption: story.caption ?? null,
    media_url: story.mediaUrl,
    media_type: story.mediaType,
    created_at: story.createdAt,
    expires_at: story.expiresAt,
  });
  if (error) throw new Error(storyInsertErrorMessage(error));
}

export async function upsertStoryRemote(story: StoryClip): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  if (!isPersistableMediaUrl(story.mediaUrl)) {
    throw new Error("Clip media hasn't finished uploading yet. Try again.");
  }
  const { error } = await supabase.from("user_stories").upsert({
    id: story.id,
    author_id: story.authorId,
    author_name: story.authorName,
    author_avatar_url: story.authorAvatarUrl ?? null,
    caption: story.caption ?? null,
    media_url: story.mediaUrl,
    media_type: story.mediaType,
    created_at: story.createdAt,
    expires_at: story.expiresAt,
  });
  if (error) throw new Error(storyInsertErrorMessage(error));
}

export async function deleteStoryRemote(storyId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from("user_stories").delete().eq("id", storyId);
}

export async function upsertNotificationRemote(n: AppNotification): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from("notifications").upsert({
    id: n.id,
    user_id: n.userId,
    kind: n.kind,
    message: n.message,
    read: n.read,
    href: n.href ?? null,
    created_at: n.createdAt,
  });
}

export async function updateNotificationReadRemote(
  id: string,
  read: boolean,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from("notifications").update({ read }).eq("id", id);
}

export async function markAllNotificationsReadRemote(userId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from("notifications").update({ read: true }).eq("user_id", userId).eq("read", false);
}

export async function insertUserBlockRemote(block: UserBlock): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.from("user_blocks").insert({
    id: block.id,
    blocker_id: block.blockerId,
    blocked_id: block.blockedId,
    created_at: block.createdAt,
  });
}

export async function deleteUserBlockRemote(blockerId: string, blockedId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);
}
