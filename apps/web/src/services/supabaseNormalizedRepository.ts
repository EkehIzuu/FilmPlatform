import type {
  AnalyticsEvent,
  AppNotification,
  PremiereEvent,
  PremiereReservation,
  PremiereReminder,
  CommunityPost,
  Episode,
  FeatureFlags,
  FilmDataState,
  FollowEdge,
  LedgerEntry,
  DirectConversation,
  DirectMessage,
  LiveChatMessage,
  Bookmark,
  ContentComment,
  ContentLike,
  PostLike,
  Report,
  StoryClip,
  UserBlock,
  ScheduledLive,
  Title,
  TitleReview,
  UploadAsset,
} from "../domain/types";
import { createInitialState } from "../domain/seed";
import { withEngagementMigrated } from "../lib/migrateEngagement";
import { getSupabase } from "../lib/supabase";
import { isPersistableMediaUrl } from "./mediaStorage";
import { loadFilmStateFromSupabase, pushFilmStateToSupabase } from "./supabaseSync";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

function normalizeFilmState(raw: FilmDataState): FilmDataState {
  return withEngagementMigrated({
    ...raw,
    liveChatByRoom: raw.liveChatByRoom ?? {},
    episodes: raw.episodes ?? [],
    premiereEvents: raw.premiereEvents ?? [],
    premiereReservations: raw.premiereReservations ?? [],
    reviews: raw.reviews ?? [],
    follows: raw.follows ?? [],
    postLikes: raw.postLikes ?? [],
    contentLikes: raw.contentLikes ?? [],
    comments: raw.comments ?? [],
    bookmarks: raw.bookmarks ?? [],
    premiereReminders: raw.premiereReminders ?? [],
    titleAccessGrants: raw.titleAccessGrants ?? [],
    premiereShareClaims: raw.premiereShareClaims ?? [],
    reports: raw.reports ?? [],
    ledger: raw.ledger ?? [],
    stories: raw.stories ?? [],
    messagePeers: raw.messagePeers ?? [],
    directConversations: raw.directConversations ?? [],
    directMessages: raw.directMessages ?? [],
    userBlocks: raw.userBlocks ?? [],
    events: raw.events ?? [],
    featureFlags: {
      premiere: raw.featureFlags?.premiere ?? true,
      live: raw.featureFlags?.live ?? true,
      communities: raw.featureFlags?.communities ?? true,
      explore: raw.featureFlags?.explore ?? true,
      clips: raw.featureFlags?.clips ?? true,
    },
  });
}

function rowToTitle(row: Record<string, unknown>): Title {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    kind: row.kind as Title["kind"],
    description: String(row.description ?? ""),
    ownerId: String(row.owner_id),
    status: row.status as Title["status"],
    genre: row.genre ? String(row.genre) : undefined,
    region: row.region ? String(row.region) : undefined,
    minAge: row.min_age != null ? Number(row.min_age) : undefined,
    listingBoost: (row.listing_boost as Title["listingBoost"]) ?? "none",
    subtitleVttUrl: row.subtitle_vtt_url ? String(row.subtitle_vtt_url) : undefined,
    createdAt: String(row.created_at),
  };
}

export async function loadNormalizedFilmState(): Promise<FilmDataState | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const [
    configRes,
    titlesRes,
    episodesRes,
    uploadsRes,
    livesRes,
    postsRes,
    likesRes,
    cinemaRes,
    reservationsRes,
    remindersRes,
    reviewsRes,
    followsRes,
    reportsRes,
    notificationsRes,
    eventsRes,
    chatRes,
    ledgerRes,
    storiesRes,
    convRes,
    dmRes,
    blocksRes,
    contentLikesRes,
    commentsRes,
    bookmarksRes,
  ] = await Promise.all([
    supabase.from("platform_config").select("*").eq("id", "default").maybeSingle(),
    supabase.from("titles").select("*"),
    supabase.from("episodes").select("*"),
    supabase.from("uploads").select("*"),
    supabase.from("scheduled_lives").select("*"),
    supabase.from("community_posts").select("*"),
    supabase.from("post_likes").select("*"),
    supabase.from("cinema_events").select("*"),
    supabase.from("cinema_reservations").select("*"),
    supabase.from("cinema_reminders").select("*"),
    supabase.from("title_reviews").select("*"),
    supabase.from("follows").select("*"),
    supabase.from("reports").select("*"),
    supabase.from("notifications").select("*"),
    supabase.from("analytics_events").select("*").order("created_at", { ascending: false }).limit(500),
    supabase.from("live_chat_messages").select("*").order("created_at", { ascending: true }).limit(1000),
    supabase.from("ledger_entries").select("*"),
    supabase
      .from("user_stories")
      .select("*")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(300),
    supabase.from("direct_conversations").select("*"),
    supabase
      .from("direct_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(3000),
    supabase.from("user_blocks").select("*"),
    supabase.from("content_likes").select("*"),
    supabase.from("content_comments").select("*").order("created_at", { ascending: true }).limit(5000),
    supabase.from("bookmarks").select("*"),
  ]);

  const firstError =
    configRes.error ||
    titlesRes.error ||
    episodesRes.error ||
    uploadsRes.error ||
    livesRes.error ||
    postsRes.error ||
    likesRes.error ||
    cinemaRes.error ||
    reservationsRes.error ||
    remindersRes.error ||
    reviewsRes.error ||
    followsRes.error ||
    reportsRes.error ||
    notificationsRes.error ||
    chatRes.error ||
    ledgerRes.error;

  const socialOptional =
    storiesRes.error || convRes.error || dmRes.error || blocksRes.error;
  if (socialOptional) {
    console.warn(
      "[supabase] social tables missing? Run 010_social_payments_moderation.sql",
      storiesRes.error?.message ?? convRes.error?.message,
    );
  }
  if (contentLikesRes.error || commentsRes.error || bookmarksRes.error) {
    console.warn(
      "[supabase] engagement tables missing? Run 013_engagement.sql",
      contentLikesRes.error?.message ?? commentsRes.error?.message,
    );
  }
  if (eventsRes.error) {
    console.warn("[supabase] analytics_events missing?", eventsRes.error.message);
  }

  if (firstError) {
    console.warn("[supabase] load normalized failed", firstError.message);
    return null;
  }

  const cfg = configRes.data;
  const featureFlags: FeatureFlags = {
    premiere: cfg?.cinema_enabled ?? true,
    live: cfg?.live_enabled ?? true,
    communities: cfg?.communities_enabled ?? true,
    explore: cfg?.explore_enabled ?? true,
    clips: cfg?.clips_enabled ?? true,
  };

  const titles = (titlesRes.data ?? []).map((r) => rowToTitle(r as Record<string, unknown>));

  if (titles.length === 0) return null;

  const liveChatByRoom: Record<string, LiveChatMessage[]> = {};
  for (const row of chatRes.data ?? []) {
    const msg: LiveChatMessage = {
      id: String(row.id),
      roomId: String(row.room_id),
      authorName: String(row.author_name),
      authorAvatarUrl: row.author_avatar_url ? String(row.author_avatar_url) : undefined,
      body: String(row.body),
      createdAt: String(row.created_at),
    };
    if (!liveChatByRoom[msg.roomId]) liveChatByRoom[msg.roomId] = [];
    liveChatByRoom[msg.roomId].push(msg);
  }

  return normalizeFilmState({
    titles,
    episodes: (episodesRes.data ?? []).map((row) => ({
      id: String(row.id),
      titleId: String(row.title_id),
      label: String(row.label),
      name: String(row.name),
    })),
    uploads: (uploadsRes.data ?? []).map((row) => ({
      id: String(row.id),
      titleId: String(row.title_id),
      kind: row.kind as UploadAsset["kind"],
      fileName: String(row.file_name),
      status: row.status as UploadAsset["status"],
      progress: Number(row.progress ?? 0),
      createdAt: String(row.created_at),
      storagePath: row.storage_path ? String(row.storage_path) : undefined,
    })),
    scheduledLives: (livesRes.data ?? []).map((row) => ({
      id: String(row.id),
      titleId: String(row.title_id),
      title: String(row.display_title),
      startsAt: String(row.starts_at),
      roomId: String(row.room_id),
      description: String(row.description ?? ""),
      ownerId: String(row.owner_id),
    })),
    posts: (postsRes.data ?? []).map((row) => ({
      id: String(row.id),
      titleSlug: String(row.title_slug),
      authorId: String(row.author_id),
      authorName: String(row.author_name),
      authorAvatarUrl: row.author_avatar_url ? String(row.author_avatar_url) : undefined,
      body: String(row.body),
      createdAt: String(row.created_at),
    })),
    postLikes: (likesRes.data ?? []).map((row) => ({
      userId: String(row.user_id),
      postId: String(row.post_id),
      createdAt: String(row.created_at),
    })),
    contentLikes: [
      ...(likesRes.data ?? []).map(
        (row) =>
          ({
            userId: String(row.user_id),
            targetType: "post" as const,
            targetId: String(row.post_id),
            createdAt: String(row.created_at),
          }) satisfies ContentLike,
      ),
      ...(contentLikesRes.data ?? []).map(
        (row) =>
          ({
            userId: String(row.user_id),
            targetType: row.target_type as ContentLike["targetType"],
            targetId: String(row.target_id),
            createdAt: String(row.created_at),
          }) satisfies ContentLike,
      ),
    ],
    comments: (commentsRes.data ?? []).map(
      (row) =>
        ({
          id: String(row.id),
          targetType: row.target_type as ContentComment["targetType"],
          targetId: String(row.target_id),
          authorId: String(row.author_id),
          authorName: String(row.author_name),
          authorAvatarUrl: row.author_avatar_url
            ? String(row.author_avatar_url)
            : undefined,
          body: String(row.body),
          createdAt: String(row.created_at),
        }) satisfies ContentComment,
    ),
    bookmarks: (bookmarksRes.data ?? []).map(
      (row) =>
        ({
          userId: String(row.user_id),
          targetType: row.target_type as Bookmark["targetType"],
          targetId: String(row.target_id),
          createdAt: String(row.created_at),
        }) satisfies Bookmark,
    ),
    premiereEvents: (cinemaRes.data ?? []).map((row) => ({
      id: String(row.id),
      titleId: String(row.title_id),
      titleName: String(row.title_name),
      featureStartsAt: String(row.feature_starts_at),
      preRollAdSeconds: Number(row.pre_roll_ad_seconds ?? 0),
      adVideoUrl: String(row.ad_video_url ?? ""),
      featureVideoUrl: String(row.feature_video_url ?? ""),
      adHlsUrl: row.ad_hls_url ? String(row.ad_hls_url) : undefined,
      featureHlsUrl: row.feature_hls_url ? String(row.feature_hls_url) : undefined,
      featureSubtitleVttUrl: row.feature_subtitle_vtt_url
        ? String(row.feature_subtitle_vtt_url)
        : undefined,
      capacity: Number(row.capacity ?? 0),
      priceCents: Number(row.price_cents ?? 0),
      currency: String(row.currency ?? "USD"),
      description: String(row.description ?? ""),
      ownerId: String(row.owner_id),
      createdAt: String(row.created_at),
    })),
    premiereReservations: (reservationsRes.data ?? []).map((row) => ({
      id: String(row.id),
      eventId: String(row.event_id),
      userId: String(row.user_id),
      amountCents: Number(row.amount_cents ?? 0),
      createdAt: String(row.created_at),
      paymentReference: row.payment_reference ? String(row.payment_reference) : undefined,
      paymentStatus: row.payment_status
        ? (String(row.payment_status) as PremiereReservation["paymentStatus"])
        : undefined,
    })),
    premiereReminders: (remindersRes.data ?? []).map((row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      premiereEventId: String(row.cinema_event_id),
      createdAt: String(row.created_at),
    })),
    reviews: (reviewsRes.data ?? []).map((row) => ({
      id: String(row.id),
      titleId: String(row.title_id),
      userId: String(row.user_id),
      authorName: String(row.author_name),
      rating: Number(row.rating),
      body: String(row.body ?? ""),
      createdAt: String(row.created_at),
    })),
    follows: (followsRes.data ?? []).map((row) => ({
      id: String(row.id),
      followerId: String(row.follower_id),
      targetType: row.target_type as FollowEdge["targetType"],
      targetId: String(row.target_id),
      createdAt: String(row.created_at),
    })),
    reports: (reportsRes.data ?? []).map((row) => ({
      id: String(row.id),
      reporterId: String(row.reporter_id),
      targetType: row.target_type as Report["targetType"],
      targetId: String(row.target_id),
      reason: String(row.reason),
      createdAt: String(row.created_at),
      status: row.status
        ? (String(row.status) as Report["status"])
        : "open",
    })),
    notifications: (notificationsRes.data ?? []).map((row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      kind: String(row.kind),
      message: String(row.message),
      read: Boolean(row.read),
      href: row.href ? String(row.href) : undefined,
      createdAt: String(row.created_at),
    })),
    events: (eventsRes.data ?? []).map((row) => ({
      id: String(row.id),
      type: String(row.event_type),
      meta: (row.meta as Record<string, unknown>) ?? {},
      createdAt: String(row.created_at),
      userId: row.user_id ? String(row.user_id) : undefined,
    })),
    liveChatByRoom,
    ledger: (ledgerRes.data ?? []).map((row) => ({
      id: String(row.id),
      creatorId: String(row.creator_id),
      source: row.source as LedgerEntry["source"],
      amountCents: Number(row.amount_cents),
      currency: String(row.currency),
      label: String(row.label),
      meta: (row.meta as Record<string, unknown>) ?? {},
      createdAt: String(row.created_at),
    })),
    stories: (storiesRes.data ?? []).map((row) => ({
      id: String(row.id),
      authorId: String(row.author_id),
      authorName: String(row.author_name),
      authorAvatarUrl: row.author_avatar_url ? String(row.author_avatar_url) : undefined,
      caption: row.caption ? String(row.caption) : undefined,
      mediaUrl: String(row.media_url),
      mediaType: row.media_type as StoryClip["mediaType"],
      createdAt: String(row.created_at),
      expiresAt: String(row.expires_at),
    })),
    messagePeers: [],
    directConversations: (convRes.data ?? []).map((row) => {
      const members = (row.member_ids as string[]) ?? [];
      const sorted = [...members].sort();
      return {
        id: String(row.id),
        memberIds: [sorted[0], sorted[1]] as [string, string],
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
      } satisfies DirectConversation;
    }),
    directMessages: (dmRes.data ?? []).map((row) => ({
      id: String(row.id),
      conversationId: String(row.conversation_id),
      senderId: String(row.sender_id),
      body: String(row.body),
      createdAt: String(row.created_at),
    })),
    userBlocks: (blocksRes.data ?? []).map((row) => ({
      id: String(row.id),
      blockerId: String(row.blocker_id),
      blockedId: String(row.blocked_id),
      createdAt: String(row.created_at),
    })),
    featureFlags,
  });
}

function remapStateOwner(state: FilmDataState, ownerId: string): FilmDataState {
  const idMap = new Map<string, string>();

  const mapId = (old: string) => {
    if (isUuid(old)) return old;
    if (!idMap.has(old)) idMap.set(old, crypto.randomUUID());
    return idMap.get(old)!;
  };

  const titles = state.titles.map((t) => {
    const id = mapId(t.id);
    return { ...t, id, ownerId };
  });

  const titleIds = new Set(titles.map((t) => t.id));

  return normalizeFilmState({
    ...state,
    titles,
    episodes: state.episodes
      .map((e) => ({ ...e, id: mapId(e.id), titleId: mapId(e.titleId) }))
      .filter((e) => titleIds.has(e.titleId)),
    uploads: state.uploads
      .map((u) => ({ ...u, id: mapId(u.id), titleId: mapId(u.titleId) }))
      .filter((u) => titleIds.has(u.titleId)),
    scheduledLives: state.scheduledLives.map((l) => ({
      ...l,
      id: mapId(l.id),
      titleId: mapId(l.titleId),
      ownerId,
    })),
    posts: state.posts.map((p) => ({
      ...p,
      id: mapId(p.id),
      authorId: isUuid(p.authorId) ? p.authorId : ownerId,
    })),
    premiereEvents: state.premiereEvents.map((c) => ({
      ...c,
      id: mapId(c.id),
      titleId: mapId(c.titleId),
      ownerId,
    })),
    reviews: state.reviews.map((r) => ({
      ...r,
      id: mapId(r.id),
      titleId: mapId(r.titleId),
      userId: isUuid(r.userId) ? r.userId : ownerId,
    })),
    follows: state.follows.map((f) => ({
      ...f,
      id: mapId(f.id),
      targetId: mapId(f.targetId),
    })),
    reports: state.reports.map((r) => ({
      ...r,
      id: mapId(r.id),
      targetId: mapId(r.targetId),
    })),
    notifications: state.notifications.map((n) => ({
      ...n,
      id: mapId(n.id),
    })),
    events: (state.events ?? []).map((e) => ({ ...e, id: mapId(e.id) })),
    premiereReservations: state.premiereReservations.map((r) => ({
      ...r,
      id: mapId(r.id),
      eventId: mapId(r.eventId),
    })),
    premiereReminders: state.premiereReminders.map((r) => ({
      ...r,
      id: mapId(r.id),
      premiereEventId: mapId(r.premiereEventId),
    })),
    postLikes: state.postLikes.map((l) => ({
      ...l,
      postId: mapId(l.postId),
    })),
    ledger: state.ledger.map((l) => ({
      ...l,
      id: mapId(l.id),
      creatorId: ownerId,
    })),
    liveChatByRoom: Object.fromEntries(
      Object.entries(state.liveChatByRoom).map(([room, msgs]) => [
        room,
        msgs.map((m) => ({ ...m, id: mapId(m.id) })),
      ]),
    ),
  });
}

export async function syncNormalizedFilmState(
  state: FilmDataState,
  userId: string,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const flags = state.featureFlags;
  await supabase.from("platform_config").upsert({
    id: "default",
    cinema_enabled: flags.premiere,
    live_enabled: flags.live,
    communities_enabled: flags.communities,
    explore_enabled: flags.explore,
    clips_enabled: flags.clips,
    updated_at: new Date().toISOString(),
  });

  const titleRows = state.titles.map((t) => ({
    id: isUuid(t.id) ? t.id : crypto.randomUUID(),
    slug: t.slug,
    name: t.name,
    kind: t.kind,
    description: t.description,
    owner_id: isUuid(t.ownerId) ? t.ownerId : userId,
    status: t.status,
    genre: t.genre ?? null,
    region: t.region ?? null,
    min_age: t.minAge ?? null,
    listing_boost: t.listingBoost ?? "none",
    subtitle_vtt_url: t.subtitleVttUrl ?? null,
    created_at: t.createdAt,
  }));

  if (titleRows.length) {
    const { error } = await supabase.from("titles").upsert(titleRows, { onConflict: "id" });
    if (error) console.warn("[supabase] sync titles", error.message);
  }

  const titleIds = state.titles.filter((t) => isUuid(t.id)).map((t) => t.id);

  if (titleIds.length) {
    await supabase.from("titles").delete().eq("owner_id", userId).not("id", "in", `(${titleIds.join(",")})`);
  }

  const upsertBatch = async (table: string, rows: Record<string, unknown>[]) => {
    if (!rows.length) return;
    const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
    if (error) console.warn(`[supabase] sync ${table}`, error.message);
  };

  await upsertBatch(
    "episodes",
    state.episodes.filter((e) => isUuid(e.id) && isUuid(e.titleId)).map((e) => ({
      id: e.id,
      title_id: e.titleId,
      label: e.label,
      name: e.name,
    })),
  );

  await upsertBatch(
    "uploads",
    state.uploads.filter((u) => isUuid(u.id)).map((u) => ({
      id: u.id,
      title_id: u.titleId,
      kind: u.kind,
      file_name: u.fileName,
      storage_path: u.storagePath ?? null,
      status: u.status,
      progress: u.progress,
      created_at: u.createdAt,
    })),
  );

  await upsertBatch(
    "scheduled_lives",
    state.scheduledLives.filter((l) => isUuid(l.id)).map((l) => ({
      id: l.id,
      title_id: l.titleId,
      display_title: l.title,
      starts_at: l.startsAt,
      room_id: l.roomId,
      description: l.description,
      owner_id: isUuid(l.ownerId) ? l.ownerId : userId,
    })),
  );

  await upsertBatch(
    "community_posts",
    state.posts.filter((p) => isUuid(p.id)).map((p) => ({
      id: p.id,
      title_slug: p.titleSlug,
      author_id: isUuid(p.authorId) ? p.authorId : userId,
      author_name: p.authorName,
      author_avatar_url: p.authorAvatarUrl ?? null,
      body: p.body,
      created_at: p.createdAt,
    })),
  );

  const likes = state.contentLikes ?? [];
  if (likes.length) {
    await supabase.from("content_likes").upsert(
      likes
        .filter((l) => isUuid(l.userId))
        .map((l) => ({
          user_id: l.userId,
          target_type: l.targetType,
          target_id: l.targetId,
          created_at: l.createdAt,
        })),
      { onConflict: "user_id,target_type,target_id" },
    );
  }

  await upsertBatch(
    "content_comments",
    (state.comments ?? []).filter((c) => isUuid(c.id)).map((c) => ({
      id: c.id,
      target_type: c.targetType,
      target_id: c.targetId,
      author_id: isUuid(c.authorId) ? c.authorId : userId,
      author_name: c.authorName,
      author_avatar_url: c.authorAvatarUrl ?? null,
      body: c.body,
      created_at: c.createdAt,
    })),
  );

  const myBookmarks = (state.bookmarks ?? []).filter((b) => b.userId === userId);
  if (myBookmarks.length) {
    await supabase.from("bookmarks").upsert(
      myBookmarks.map((b) => ({
        user_id: b.userId,
        target_type: b.targetType,
        target_id: b.targetId,
        created_at: b.createdAt,
      })),
      { onConflict: "user_id,target_type,target_id" },
    );
  }

  await upsertBatch(
    "cinema_events",
    state.premiereEvents.filter((c) => isUuid(c.id)).map((c) => ({
      id: c.id,
      title_id: c.titleId,
      title_name: c.titleName,
      feature_starts_at: c.featureStartsAt,
      pre_roll_ad_seconds: c.preRollAdSeconds,
      ad_video_url: c.adVideoUrl,
      feature_video_url: c.featureVideoUrl,
      ad_hls_url: c.adHlsUrl ?? null,
      feature_hls_url: c.featureHlsUrl ?? null,
      feature_subtitle_vtt_url: c.featureSubtitleVttUrl ?? null,
      capacity: c.capacity,
      price_cents: c.priceCents,
      currency: c.currency,
      description: c.description,
      owner_id: isUuid(c.ownerId) ? c.ownerId : userId,
      created_at: c.createdAt,
    })),
  );

  await upsertBatch(
    "cinema_reservations",
    state.premiereReservations.filter((r) => isUuid(r.id)).map((r) => ({
      id: r.id,
      event_id: r.eventId,
      user_id: r.userId,
      amount_cents: r.amountCents,
      created_at: r.createdAt,
      payment_reference: r.paymentReference ?? null,
      payment_status: r.paymentStatus ?? "demo",
    })),
  );

  await upsertBatch(
    "cinema_reminders",
    state.premiereReminders.filter((r) => isUuid(r.id)).map((r) => ({
      id: r.id,
      user_id: r.userId,
      cinema_event_id: r.premiereEventId,
      created_at: r.createdAt,
    })),
  );

  await upsertBatch(
    "title_reviews",
    state.reviews.filter((r) => isUuid(r.id)).map((r) => ({
      id: r.id,
      title_id: r.titleId,
      user_id: r.userId,
      author_name: r.authorName,
      rating: r.rating,
      body: r.body,
      created_at: r.createdAt,
    })),
  );

  await upsertBatch(
    "follows",
    state.follows.filter((f) => isUuid(f.id)).map((f) => ({
      id: f.id,
      follower_id: f.followerId,
      target_type: f.targetType,
      target_id: f.targetId,
      created_at: f.createdAt,
    })),
  );

  await upsertBatch(
    "reports",
    state.reports.filter((r) => isUuid(r.id)).map((r) => ({
      id: r.id,
      reporter_id: r.reporterId,
      target_type: r.targetType,
      target_id: r.targetId,
      reason: r.reason,
      status: r.status ?? "open",
      created_at: r.createdAt,
    })),
  );

  await upsertBatch(
    "notifications",
    state.notifications
      .filter((n) => isUuid(n.id) && n.userId === userId)
      .map((n) => ({
      id: n.id,
      user_id: n.userId,
      kind: n.kind,
      message: n.message,
      read: n.read,
      href: n.href ?? null,
      created_at: n.createdAt,
    })),
  );

  await upsertBatch(
    "analytics_events",
    (state.events ?? []).filter((e) => isUuid(e.id)).map((e) => ({
      id: e.id,
      user_id: e.userId && isUuid(e.userId) ? e.userId : null,
      event_type: e.type,
      meta: e.meta ?? {},
      created_at: e.createdAt,
    })),
  );

  await upsertBatch(
    "ledger_entries",
    state.ledger.filter((l) => isUuid(l.id)).map((l) => ({
      id: l.id,
      creator_id: l.creatorId,
      source: l.source,
      amount_cents: l.amountCents,
      currency: l.currency,
      label: l.label,
      meta: l.meta ?? {},
      created_at: l.createdAt,
    })),
  );

  const chatRows = Object.entries(state.liveChatByRoom).flatMap(([, msgs]) =>
    msgs
      .filter((m) => isUuid(m.id))
      .map((m) => ({
        id: m.id,
        room_id: m.roomId,
        author_name: m.authorName,
        author_avatar_url: m.authorAvatarUrl ?? null,
        body: m.body,
        created_at: m.createdAt,
      })),
  );
  await upsertBatch("live_chat_messages", chatRows);

  await upsertBatch(
    "user_stories",
    (state.stories ?? [])
      // Skip clips still uploading (blob:/data: preview). addStory persists the
      // real row itself once the file is in storage; syncing the temp URL here
      // both writes a broken media_url and races addStory's insert (pkey clash).
      .filter(
        (s) => isUuid(s.id) && s.authorId === userId && isPersistableMediaUrl(s.mediaUrl),
      )
      .map((s) => ({
      id: s.id,
      author_id: s.authorId,
      author_name: s.authorName,
      author_avatar_url: s.authorAvatarUrl ?? null,
      caption: s.caption ?? null,
      media_url: s.mediaUrl,
      media_type: s.mediaType,
      created_at: s.createdAt,
      expires_at: s.expiresAt,
    })),
  );

  await upsertBatch(
    "direct_conversations",
    (state.directConversations ?? [])
      .filter((c) => c.memberIds.includes(userId))
      .map((c) => ({
      id: c.id,
      member_ids: c.memberIds,
      created_at: c.createdAt,
      updated_at: c.updatedAt,
      last_message_at: c.lastMessageAt ?? null,
      last_message_preview: c.lastMessagePreview ?? null,
      last_message_sender_id: c.lastMessageSenderId ?? null,
      read_at_by_user: c.readAtByUser,
    })),
  );

  const myConvIds = new Set(
    (state.directConversations ?? [])
      .filter((c) => c.memberIds.includes(userId))
      .map((c) => c.id),
  );
  await upsertBatch(
    "direct_messages",
    (state.directMessages ?? [])
      .filter((m) => isUuid(m.id) && myConvIds.has(m.conversationId))
      .map((m) => ({
      id: m.id,
      conversation_id: m.conversationId,
      sender_id: m.senderId,
      body: m.body,
      created_at: m.createdAt,
    })),
  );

  await upsertBatch(
    "user_blocks",
    (state.userBlocks ?? []).filter((b) => isUuid(b.id)).map((b) => ({
      id: b.id,
      blocker_id: b.blockerId,
      blocked_id: b.blockedId,
      created_at: b.createdAt,
    })),
  );
}

export async function ensureNormalizedFilmState(userId: string): Promise<FilmDataState> {
  const normalized = await loadNormalizedFilmState();
  if (normalized) return normalized;

  const legacy = await loadFilmStateFromSupabase();
  if (legacy) {
    const remapped = remapStateOwner(normalizeFilmState(legacy), userId);
    await syncNormalizedFilmState(remapped, userId);
    return remapped;
  }

  const initial = remapStateOwner(createInitialState(userId), userId);
  await syncNormalizedFilmState(initial, userId);
  return initial;
}

/** @deprecated Legacy JSON blob — used only for one-time migration in ensureNormalizedFilmState */
export { pushFilmStateToSupabase };
