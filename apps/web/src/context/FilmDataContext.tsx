import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AnalyticsEvent,
  AppNotification,
  DirectConversation,
  DirectMessage,
  MessagePeer,
  PremiereEvent,
  PremiereReservation,
  PremiereReminder,
  CommunityPost,
  Episode,
  FeatureFlags,
  FilmDataState,
  FollowEdge,
  LedgerEntry,
  PostLike,
  Report,
  ScheduledLive,
  LivePremiereRole,
  StoryClip,
  UserBlock,
  Bookmark,
  BookmarkTargetType,
  ContentComment,
  ContentLike,
  EngagementTargetType,
  Title,
  TitleReview,
  UploadAsset,
  UploadKind,
} from "../domain/types";
import { newId, uuidV4 } from "../domain/id";
import { slugify } from "../domain/slug";
import { loadFilmData, saveFilmData } from "../domain/storage";
import { collectSearchablePeers } from "../domain/messagePeers";
import {
  conversationIdForPair,
  conversationIsUnread,
  otherMemberId,
  peerMatchesQuery,
} from "../lib/directMessages";
import { activeStories, storyExpiresAt, storyMediaType } from "../lib/stories";
import { mergeById } from "../lib/mergeRecords";
import { withEngagementMigrated } from "../lib/migrateEngagement";
import { useFilmRealtime } from "../hooks/useFilmRealtime";
import { showLocalNotification } from "../lib/pushNotifications";
import { searchProfiles } from "../services/supabaseProfile";
import {
  deleteBookmarkRemote,
  deleteCommentRemote,
  deleteContentLikeRemote,
  upsertBookmarkRemote,
  upsertCommentRemote,
  upsertContentLikeRemote,
} from "../services/engagementSync";
import {
  deleteStoryRemote,
  deleteUserBlockRemote,
  insertUserBlockRemote,
  loadSocialPatch,
  markAllNotificationsReadRemote,
  updateNotificationReadRemote,
  upsertConversationRemote,
  upsertDirectMessageRemote,
  upsertNotificationRemote,
  upsertStoryRemote,
  type SocialPatch,
} from "../services/socialSync";
import { premiereTicketsUsed, recordLedgerPair } from "../lib/businessAnalytics";
import {
  BOOST_PRODUCTS,
  COIN_PACKS,
  generateShareCode,
  LIVE_GIFTS,
  splitPayment,
} from "../lib/monetization";
import {
  afterPartyLiveStartsAt,
  preShowLiveStartsAt,
} from "../lib/premiereStack";
import { liveRoomIdForUser } from "../lib/livePaths";
import { useLocalAuthMode } from "../lib/localAuth";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";
import {
  isMediaStorageEnabled,
  uploadMediaFile,
  uploadStoryFile,
} from "../services/mediaStorage";
import {
  ensureNormalizedFilmState,
  syncNormalizedFilmState,
} from "../services/supabaseNormalizedRepository";
import { useAuth } from "./AuthContext";

type FilmDataContextValue = {
  state: FilmDataState;
  getTitleBySlug: (slug: string) => Title | undefined;
  listPublishedTitles: () => Title[];
  listMyTitles: () => Title[];
  addTitle: (input: {
    name: string;
    kind: Title["kind"];
    description: string;
    status: Title["status"];
    genre?: string;
    region?: string;
    minAge?: number;
    listingBoost?: Title["listingBoost"];
    subtitleVttUrl?: string;
    accessMode?: Title["accessMode"];
    accessPriceCents?: number;
    accessCurrency?: string;
  }) => Title | null;
  updateTitle: (id: string, patch: Partial<Title>) => void;
  deleteTitle: (id: string) => void;
  listEpisodes: (titleId: string) => Episode[];
  addUpload: (input: {
    titleId: string;
    kind: UploadKind;
    fileName: string;
    file?: File;
  }) => string | undefined;
  scheduleLive: (input: {
    titleId: string;
    startsAt: string;
    description: string;
    premiereEventId?: string;
    liveRole?: ScheduledLive["liveRole"];
    displayTitle?: string;
  }) => ScheduledLive | null;
  updatePremiereEvent: (id: string, patch: Partial<PremiereEvent>) => void;
  purchaseBoost: (productId: string, titleId?: string) => { ok: boolean; error?: string };
  listScheduledLives: (ownerOnly: boolean) => ScheduledLive[];
  listPosts: (titleSlug: string) => CommunityPost[];
  addPost: (titleSlug: string, body: string) => void;
  listActiveStories: () => StoryClip[];
  listStoriesByUser: (userId: string) => StoryClip[];
  addStory: (input: { file: File; caption?: string }) => Promise<StoryClip | null>;
  deleteStory: (id: string) => void;
  dismissStory: (id: string) => void;
  isStoryDismissed: (id: string) => boolean;
  notificationsForUser: () => AppNotification[];
  unreadCount: () => number;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  inboxUnreadCount: () => number;
  unreadNotificationCount: () => number;
  unreadMessagesCount: () => number;
  listConversations: () => DirectConversation[];
  messagesForConversation: (conversationId: string) => DirectMessage[];
  getConversation: (conversationId: string) => DirectConversation | undefined;
  openConversationWith: (peerId: string, peerHint?: MessagePeer) => DirectConversation | null;
  sendDirectMessage: (conversationId: string, body: string) => void;
  markConversationRead: (conversationId: string) => void;
  getMessagePeer: (peerId: string) => MessagePeer | undefined;
  cacheMessagePeer: (peer: MessagePeer) => void;
  searchMessagePeers: (query: string) => MessagePeer[];
  trackEvent: (type: string, meta?: Record<string, unknown>) => void;
  listAnalyticsEvents: () => AnalyticsEvent[];
  sendLiveChat: (roomId: string, body: string) => void;
  liveChatForRoom: (roomId: string) => FilmDataState["liveChatByRoom"][string];
  getPremiereEvent: (id: string) => PremiereEvent | undefined;
  listPremiereEvents: () => PremiereEvent[];
  listMyPremiereEvents: () => PremiereEvent[];
  addPremiereEvent: (
    input: {
      titleId: string;
      titleName: string;
      featureStartsAt: string;
      preRollAdSeconds: number;
      adVideoUrl: string;
      featureVideoUrl: string;
      adHlsUrl?: string;
      featureHlsUrl?: string;
      featureSubtitleVttUrl?: string;
      capacity: number;
      priceCents: number;
      currency: string;
      description: string;
      preShowLiveId?: string;
      afterPartyLiveId?: string;
    },
    options?: { schedulePreShow?: boolean; scheduleAfterParty?: boolean },
  ) => PremiereEvent | null;
  deletePremiereEvent: (id: string) => void;
  reservePremiereSeat: (
    eventId: string,
    payment?: {
      reference?: string;
      status?: PremiereReservation["paymentStatus"];
      ticketCount?: number;
    },
  ) => { ok: boolean; error?: string; already?: boolean; shareCode?: string };
  redeemPremiereShare: (
    shareCode: string,
  ) => { ok: boolean; error?: string; eventId?: string };
  hasTitleAccess: (titleId: string) => boolean;
  purchaseTitleAccess: (
    titleId: string,
    payment?: { reference?: string },
  ) => { ok: boolean; error?: string };
  purchaseCoinPack: (packId: string) => { ok: boolean; error?: string };
  sendLiveGift: (creatorId: string, giftId: string) => { ok: boolean; error?: string };
  hasPremiereAccess: (eventId: string) => boolean;
  premiereReservationCount: (eventId: string) => number;
  getFeatureFlags: () => FeatureFlags;
  setFeatureFlags: (patch: Partial<FeatureFlags>) => void;
  toggleFollow: (targetType: "title" | "user", targetId: string) => void;
  isFollowing: (targetType: "title" | "user", targetId: string) => boolean;
  followedTitleIds: () => string[];
  togglePremiereReminder: (premiereEventId: string) => void;
  hasPremiereReminder: (premiereEventId: string) => boolean;
  addReview: (titleId: string, rating: number, body: string) => void;
  listReviewsForTitle: (titleId: string) => TitleReview[];
  titleRatingSummary: (titleId: string) => { avg: number; count: number };
  toggleLike: (targetType: EngagementTargetType, targetId: string) => void;
  likeCount: (targetType: EngagementTargetType, targetId: string) => number;
  userLiked: (targetType: EngagementTargetType, targetId: string) => boolean;
  togglePostLike: (postId: string) => void;
  postLikeCount: (postId: string) => number;
  userLikedPost: (postId: string) => boolean;
  addComment: (targetType: EngagementTargetType, targetId: string, body: string) => void;
  deleteComment: (commentId: string) => void;
  listComments: (targetType: EngagementTargetType, targetId: string) => ContentComment[];
  commentCount: (targetType: EngagementTargetType, targetId: string) => number;
  toggleBookmark: (targetType: BookmarkTargetType, targetId: string) => void;
  isBookmarked: (targetType: BookmarkTargetType, targetId: string) => boolean;
  listMyBookmarks: () => Bookmark[];
  addReport: (targetType: Report["targetType"], targetId: string, reason: string) => void;
  listReports: () => Report[];
  listOpenReports: () => Report[];
  setReportStatus: (id: string, status: Report["status"]) => void;
  blockUser: (blockedId: string) => void;
  unblockUser: (blockedId: string) => void;
  isBlocked: (userId: string) => boolean;
  isBlockedEitherWay: (userId: string) => boolean;
  listBlockedUsers: () => { id: string; displayName: string; username?: string }[];
  listLedgerForCreator: (creatorId: string) => LedgerEntry[];
  dataMode: "local" | "supabase";
  dataReady: boolean;
};

const FilmDataContext = createContext<FilmDataContextValue | null>(null);

export function FilmDataProvider({ children }: { children: ReactNode }) {
  const { user, authReady, updateProfile } = useAuth();
  const supabaseOn = isSupabaseConfigured() && !useLocalAuthMode();
  const [dataReady, setDataReady] = useState(!supabaseOn);
  const [state, setState] = useState<FilmDataState>(() => withEngagementMigrated(loadFilmData()));

  useEffect(() => {
    if (!supabaseOn || !authReady || !user) return;
    let cancelled = false;
    void (async () => {
      try {
        const remote = await ensureNormalizedFilmState(user.id);
        if (!cancelled) {
          setState((current) => ({
            ...remote,
            events: remote.events ?? current.events ?? [],
            stories: mergeById(current.stories ?? [], remote.stories ?? [], (a, b) =>
              b.createdAt.localeCompare(a.createdAt),
            ),
            notifications: mergeById(current.notifications, remote.notifications, (a, b) =>
              b.createdAt.localeCompare(a.createdAt),
            ),
            directConversations: mergeById(
              current.directConversations ?? [],
              remote.directConversations ?? [],
              (a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
            ),
            directMessages: mergeById(
              current.directMessages ?? [],
              remote.directMessages ?? [],
              (a, b) => a.createdAt.localeCompare(b.createdAt),
            ),
          }));
          setDataReady(true);
        }
      } catch (err) {
        console.warn(
          "[film-data] bootstrap fallback to local state:",
          err instanceof Error ? err.message : err,
        );
        if (!cancelled) {
          // Unblock the app even when normalized bootstrap fails (missing tables/migrations).
          // Subsequent social patch + local persistence can still work.
          setDataReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabaseOn, authReady, user?.id]);

  useEffect(() => {
    if (!dataReady) return;
    saveFilmData(state);
    if (!supabaseOn || !user) return;
    const t = window.setTimeout(() => {
      void syncNormalizedFilmState(state, user.id);
    }, 600);
    return () => window.clearTimeout(t);
  }, [state, dataReady, supabaseOn, user?.id]);

  const mergeSocialPatch = useCallback(
    (patch: Partial<SocialPatch> | null) => {
      if (!patch) return;
      setState((s) => ({
        ...s,
        ...(patch.stories
          ? {
              stories: mergeById(s.stories ?? [], patch.stories, (a, b) =>
                b.createdAt.localeCompare(a.createdAt),
              ),
            }
          : {}),
        ...(patch.directConversations
          ? {
              directConversations: mergeById(
                s.directConversations ?? [],
                patch.directConversations,
                (a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""),
              ),
            }
          : {}),
        ...(patch.directMessages
          ? {
              directMessages: mergeById(s.directMessages ?? [], patch.directMessages, (a, b) =>
                a.createdAt.localeCompare(b.createdAt),
              ),
            }
          : {}),
        ...(patch.notifications
          ? {
              notifications: mergeById(s.notifications, patch.notifications, (a, b) =>
                b.createdAt.localeCompare(a.createdAt),
              ),
            }
          : {}),
        ...(patch.userBlocks
          ? { userBlocks: mergeById(s.userBlocks ?? [], patch.userBlocks) }
          : {}),
        // Likes/comments/follows arrive as full server snapshots, so replace
        // them outright — this is what makes others' activity show live.
        ...(patch.contentLikes ? { contentLikes: patch.contentLikes } : {}),
        ...(patch.postLikes ? { postLikes: patch.postLikes } : {}),
        ...(patch.comments ? { comments: patch.comments } : {}),
        ...(patch.follows ? { follows: patch.follows } : {}),
      }));
    },
    [],
  );

  useEffect(() => {
    if (!supabaseOn || !user || !dataReady) return;
    void loadSocialPatch(user.id).then(mergeSocialPatch);
  }, [supabaseOn, user?.id, dataReady, mergeSocialPatch]);

  useFilmRealtime({
    userId: user?.id,
    pushEnabled: user?.pushEnabled === true,
    enabled: supabaseOn && dataReady,
    onSocialPatch: mergeSocialPatch,
  });

  // Supabase tables use `uuid` columns, so cloud ids must always be valid UUIDs
  // (crypto.randomUUID is unavailable on insecure origins, hence uuidV4 fallback).
  const remoteId = () => (supabaseOn ? uuidV4() : newId());

  const pushNotification = useCallback(
    (n: Omit<AppNotification, "id" | "createdAt" | "read">) => {
      if (!user) return;
      const item: AppNotification = {
        ...n,
        id: remoteId(),
        createdAt: new Date().toISOString(),
        read: false,
      };
      setState((s) => ({ ...s, notifications: [item, ...s.notifications] }));
      if (supabaseOn && n.userId === user.id) {
        void upsertNotificationRemote(item);
      }
      if (user.pushEnabled && n.userId === user.id) {
        showLocalNotification("Izora", {
          body: n.message,
          tag: item.id,
          href: n.href,
        });
      }
    },
    [user, supabaseOn],
  );

  const getTitleBySlug = useCallback(
    (slug: string) => state.titles.find((t) => t.slug === slug),
    [state.titles],
  );

  const listPublishedTitles = useCallback(() => {
    const list = state.titles.filter((t) => t.status === "published");
    return [...list].sort((a, b) => {
      const boost = (x: Title) => (x.listingBoost === "featured" ? 1 : 0);
      if (boost(b) !== boost(a)) return boost(b) - boost(a);
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [state.titles]);

  const listMyTitles = useCallback(() => {
    if (!user) return [];
    return state.titles.filter((t) => t.ownerId === user.id);
  }, [state.titles, user]);

  const trackEventInternal = useCallback(
    (type: string, meta?: Record<string, unknown>) => {
      const ev: AnalyticsEvent = {
        id: newId(),
        type,
        meta,
        createdAt: new Date().toISOString(),
        userId: user?.id,
      };
      setState((s) => ({ ...s, events: [...(s.events ?? []), ev] }));
    },
    [user?.id],
  );

  const addTitle = useCallback(
    (input: {
      name: string;
      kind: Title["kind"];
      description: string;
      status: Title["status"];
      genre?: string;
      region?: string;
      minAge?: number;
      listingBoost?: Title["listingBoost"];
      subtitleVttUrl?: string;
      accessMode?: Title["accessMode"];
      accessPriceCents?: number;
      accessCurrency?: string;
    }): Title | null => {
      if (!user?.isCreator) return null;
      let slug = slugify(input.name);
      const taken = (s: string) => state.titles.some((t) => t.slug === s);
      if (taken(slug)) slug = `${slug}-${newId().slice(0, 6)}`;
      const title: Title = {
        id: newId(),
        slug,
        name: input.name.trim(),
        kind: input.kind,
        description: input.description.trim(),
        ownerId: user.id,
        status: input.status,
        genre: input.genre?.trim() || undefined,
        region: input.region?.trim() || undefined,
        minAge: input.minAge,
        listingBoost: input.listingBoost ?? "none",
        subtitleVttUrl: input.subtitleVttUrl?.trim() || undefined,
        accessMode: input.accessMode ?? "free",
        accessPriceCents:
          input.accessMode === "paid" ? Math.max(0, input.accessPriceCents ?? 0) : 0,
        accessCurrency: input.accessCurrency?.trim() || "USD",
        createdAt: new Date().toISOString(),
      };
      setState((s) => ({ ...s, titles: [...s.titles, title] }));
      trackEventInternal("title_created", { titleId: title.id, slug: title.slug });
      return title;
    },
    [state.titles, user, trackEventInternal],
  );

  const updateTitle = useCallback((id: string, patch: Partial<Title>) => {
    setState((s) => ({
      ...s,
      titles: s.titles.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  }, []);

  const deleteTitle = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      titles: s.titles.filter((t) => t.id !== id),
      episodes: s.episodes.filter((e) => e.titleId !== id),
      uploads: s.uploads.filter((u) => u.titleId !== id),
      scheduledLives: s.scheduledLives.filter((l) => l.titleId !== id),
      reviews: s.reviews.filter((r) => r.titleId !== id),
      follows: s.follows.filter((f) => !(f.targetType === "title" && f.targetId === id)),
    }));
  }, []);

  const listEpisodes = useCallback(
    (titleId: string) => state.episodes.filter((e) => e.titleId === titleId),
    [state.episodes],
  );

  const addUpload = useCallback(
    (input: { titleId: string; kind: UploadKind; fileName: string; file?: File }) => {
      if (!user) return undefined;
      const id = newId();
      const createdAt = new Date().toISOString();
      const row: UploadAsset = {
        id,
        titleId: input.titleId,
        kind: input.kind,
        fileName: input.fileName,
        status: "uploading",
        progress: 0,
        createdAt,
      };
      setState((s) => ({ ...s, uploads: [...s.uploads, row] }));

      const finishReady = (patch: Partial<UploadAsset>) => {
        setState((s) => ({
          ...s,
          uploads: s.uploads.map((u) =>
            u.id === id ? { ...u, ...patch, status: "ready", progress: 100 } : u,
          ),
        }));
        trackEventInternal("upload_complete", { uploadId: id, kind: input.kind });
        pushNotification({
          userId: user.id,
          kind: "upload",
          message: `Upload ready: ${input.fileName}`,
          href: "/creator/upload",
        });
      };

      const failUpload = (message: string) => {
        setState((s) => ({
          ...s,
          uploads: s.uploads.map((u) =>
            u.id === id ? { ...u, status: "failed", progress: 0 } : u,
          ),
        }));
        trackEventInternal("upload_failed", { uploadId: id, error: message });
        pushNotification({
          userId: user.id,
          kind: "upload",
          message: `Upload failed: ${input.fileName}`,
          href: "/creator/upload",
        });
      };

      if (input.file && isMediaStorageEnabled()) {
        void uploadMediaFile({
          userId: user.id,
          titleId: input.titleId,
          kind: input.kind,
          file: input.file,
          onProgress: (pct) => {
            setState((s) => ({
              ...s,
              uploads: s.uploads.map((u) =>
                u.id === id
                  ? {
                      ...u,
                      progress: pct,
                      status: pct >= 95 ? "processing" : "uploading",
                    }
                  : u,
              ),
            }));
          },
        })
          .then(({ storagePath, publicUrl }) => {
            finishReady({ storagePath, publicUrl });
          })
          .catch((err: unknown) => {
            failUpload(err instanceof Error ? err.message : "Upload failed");
          });
        return id;
      }

      if (input.file) {
        const blobUrl = URL.createObjectURL(input.file);
        finishReady({ publicUrl: blobUrl });
        return id;
      }

      let progress = 0;
      const step = () => {
        progress += 12;
        setState((s) => ({
          ...s,
          uploads: s.uploads.map((u) =>
            u.id === id
              ? {
                  ...u,
                  progress: Math.min(progress, 100),
                  status: progress >= 88 ? "processing" : "uploading",
                }
              : u,
          ),
        }));
        if (progress < 100) {
          window.setTimeout(step, 180);
        } else {
          window.setTimeout(() => finishReady({}), 600);
        }
      };
      window.setTimeout(step, 100);
      return id;
    },
    [user, pushNotification, trackEventInternal],
  );

  const scheduleLive = useCallback(
    (input: {
      titleId: string;
      startsAt: string;
      description: string;
      premiereEventId?: string;
      liveRole?: LivePremiereRole;
      displayTitle?: string;
    }): ScheduledLive | null => {
      if (!user?.isCreator) return null;
      const title = state.titles.find((t) => t.id === input.titleId);
      if (!title) return null;
      const roomId = liveRoomIdForUser(user);
      const live: ScheduledLive = {
        id: newId(),
        titleId: input.titleId,
        title: input.displayTitle?.trim() || title.name,
        startsAt: input.startsAt,
        roomId,
        description: input.description.trim(),
        ownerId: user.id,
        ownerUsername: user.username,
        premiereEventId: input.premiereEventId,
        liveRole: input.liveRole ?? "general",
      };
      setState((s) => ({ ...s, scheduledLives: [...s.scheduledLives, live] }));
      trackEventInternal("live_scheduled", {
        liveId: live.id,
        premiereEventId: input.premiereEventId,
        liveRole: live.liveRole,
      });
      const liveHref = user.username
        ? `/u/${encodeURIComponent(user.username)}/live`
        : "/creator/lives";
      pushNotification({
        userId: user.id,
        kind: "live",
        message: `Scheduled live: ${live.title}`,
        href: liveHref,
      });
      return live;
    },
    [state.titles, user, pushNotification, trackEventInternal],
  );

  const listScheduledLives = useCallback(
    (ownerOnly: boolean) => {
      if (!user) return state.scheduledLives;
      if (ownerOnly) return state.scheduledLives.filter((l) => l.ownerId === user.id);
      return state.scheduledLives;
    },
    [state.scheduledLives, user],
  );

  const listPosts = useCallback(
    (titleSlug: string) =>
      state.posts
        .filter((p) => p.titleSlug === titleSlug)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [state.posts],
  );

  const addPost = useCallback(
    (titleSlug: string, body: string) => {
      if (!user) return;
      const text = body.trim();
      if (!text) return;
      const post: CommunityPost = {
        id: newId(),
        titleSlug,
        authorId: user.id,
        authorName: user.displayName,
        authorAvatarUrl: user.avatarUrl,
        body: text,
        createdAt: new Date().toISOString(),
      };
      setState((s) => ({ ...s, posts: [...s.posts, post] }));
      trackEventInternal("community_post", { titleSlug });
    },
    [user, trackEventInternal],
  );

  const listActiveStories = useCallback(() => {
    const dismissed = new Set(state.dismissedStoryIds ?? []);
    return activeStories(state.stories ?? []).filter((s) => !dismissed.has(s.id));
  }, [state.stories, state.dismissedStoryIds]);

  const listStoriesByUser = useCallback(
    (userId: string) => activeStories(state.stories ?? []).filter((s) => s.authorId === userId),
    [state.stories],
  );

  const addStory = useCallback(
    async (input: { file: File; caption?: string }): Promise<StoryClip | null> => {
      if (!user) throw new Error("Sign in to post a clip.");
      try {
        const createdAt = new Date().toISOString();
        const id = remoteId();
        const caption = input.caption?.trim() || undefined;
        const mediaType = storyMediaType(input.file);
        const localUrl = URL.createObjectURL(input.file);

        const base: StoryClip = {
          id,
          authorId: user.id,
          authorName: user.displayName,
          authorAvatarUrl: user.avatarUrl,
          caption,
          // Show the clip immediately from the local preview; cloud upload swaps
          // this for the storage path in the background.
          mediaUrl: localUrl,
          mediaType,
          createdAt,
          expiresAt: storyExpiresAt(createdAt),
        };

        if (supabaseOn) {
          // Fast, synchronous pre-checks so obvious misconfig fails before posting.
          if (!isMediaStorageEnabled()) {
            URL.revokeObjectURL(localUrl);
            throw new Error("Media storage is not configured. Check VITE_SUPABASE_URL and keys.");
          }
          const supabase = getSupabase();
          if (!supabase) {
            URL.revokeObjectURL(localUrl);
            throw new Error("Cloud database is not connected.");
          }

          // Optimistic: add now, navigate instantly, finish upload in background.
          setState((s) => ({ ...s, stories: [...(s.stories ?? []), base] }));
          trackEventInternal("story_post", { storyId: id, mediaType });

          void (async () => {
            try {
              const { data: sessionData, error: sessionError } =
                await supabase.auth.getSession();
              if (sessionError) throw new Error(`Sign-in check failed: ${sessionError.message}`);
              if (!sessionData.session?.user) {
                throw new Error("You're not signed in. Sign in again, then post your clip.");
              }
              if (sessionData.session.user.id !== user.id) {
                throw new Error("Account session mismatch. Sign out and sign back in.");
              }

              const timeoutMs = input.file.type.startsWith("video/") ? 120000 : 30000;
              const uploadPromise = uploadStoryFile({ userId: user.id, file: input.file });
              const timeoutPromise = new Promise<never>((_, reject) => {
                window.setTimeout(
                  () =>
                    reject(
                      new Error(
                        `Upload timed out after ${Math.round(timeoutMs / 1000)}s. Try a smaller file or stronger Wi‑Fi.`,
                      ),
                    ),
                  timeoutMs,
                );
              });
              const { storagePath } = await Promise.race([uploadPromise, timeoutPromise]);

              const remoteStory: StoryClip = { ...base, mediaUrl: storagePath };
              // Upsert (not insert): the full-state sync may have already written
              // this row, so inserting again would throw a duplicate-key error.
              await upsertStoryRemote(remoteStory);

              // Swap blob preview for the durable storage path.
              setState((s) => ({
                ...s,
                stories: (s.stories ?? []).map((x) =>
                  x.id === id ? { ...x, mediaUrl: storagePath } : x,
                ),
              }));
              URL.revokeObjectURL(localUrl);
              pushNotification({
                userId: user.id,
                kind: "story",
                message: "Your clip is live for 24 hours.",
                href: "/clips",
              });
            } catch (e) {
              // Roll back the optimistic clip and tell the user why.
              setState((s) => ({
                ...s,
                stories: (s.stories ?? []).filter((x) => x.id !== id),
              }));
              URL.revokeObjectURL(localUrl);
              const raw = e instanceof Error ? e.message : "Upload failed.";
              trackEventInternal("story_failed", { error: raw });
              pushNotification({
                userId: user.id,
                kind: "story",
                message: `Clip upload failed: ${raw}`,
                href: "/clips/new",
              });
            }
          })();

          return base;
        }

        // Local/demo mode keeps in-browser story previews.
        setState((s) => ({ ...s, stories: [...(s.stories ?? []), base] }));
        trackEventInternal("story_post", { storyId: id, mediaType });
        pushNotification({
          userId: user.id,
          kind: "story",
          message: "Your clip is live for 24 hours.",
          href: "/clips",
        });
        return base;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown story error.";
        trackEventInternal("story_failed", {
          error: message,
        });
        throw new Error(message);
      }
    },
    [user, pushNotification, trackEventInternal, supabaseOn],
  );

  const deleteStory = useCallback(
    (id: string) => {
      if (!user) return;
      const story = (state.stories ?? []).find((s) => s.id === id);
      if (!story || story.authorId !== user.id) return;
      setState((s) => ({
        ...s,
        stories: (s.stories ?? []).filter((x) => x.id !== id),
      }));
      if (supabaseOn) void deleteStoryRemote(id);
    },
    [state.stories, user, supabaseOn],
  );

  const dismissStory = useCallback(
    (id: string) => {
      setState((s) => {
        const current = s.dismissedStoryIds ?? [];
        if (current.includes(id)) return s;
        return { ...s, dismissedStoryIds: [...current, id] };
      });
      trackEventInternal("story_not_interested", { storyId: id });
    },
    [trackEventInternal],
  );

  const isStoryDismissed = useCallback(
    (id: string) => (state.dismissedStoryIds ?? []).includes(id),
    [state.dismissedStoryIds],
  );

  const notificationsForUser = useCallback(() => {
    if (!user) return [];
    return state.notifications
      .filter((n) => n.userId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [state.notifications, user]);

  const unreadNotificationCount = useCallback(() => {
    if (!user) return 0;
    return state.notifications.filter((n) => n.userId === user.id && !n.read).length;
  }, [state.notifications, user]);

  const unreadMessagesCount = useCallback(() => {
    if (!user) return 0;
    return (state.directConversations ?? []).filter(
      (c) => c.memberIds.includes(user.id) && conversationIsUnread(c, user.id),
    ).length;
  }, [state.directConversations, user]);

  const inboxUnreadCount = useCallback(() => {
    return unreadNotificationCount() + unreadMessagesCount();
  }, [unreadNotificationCount, unreadMessagesCount]);

  /** @deprecated Use inboxUnreadCount — kept for any legacy callers */
  const unreadCount = inboxUnreadCount;

  const markNotificationRead = useCallback(
    (id: string) => {
      setState((s) => ({
        ...s,
        notifications: s.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n,
        ),
      }));
      if (supabaseOn) void updateNotificationReadRemote(id, true);
    },
    [supabaseOn],
  );

  const markAllNotificationsRead = useCallback(() => {
    if (!user) return;
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) =>
        n.userId === user.id ? { ...n, read: true } : n,
      ),
    }));
    if (supabaseOn) void markAllNotificationsReadRemote(user.id);
  }, [user, supabaseOn]);

  const listConversations = useCallback(() => {
    if (!user) return [];
    return [...(state.directConversations ?? [])]
      .filter((c) => c.memberIds.includes(user.id))
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  }, [state.directConversations, user]);

  const getConversation = useCallback(
    (conversationId: string) =>
      (state.directConversations ?? []).find((c) => c.id === conversationId),
    [state.directConversations],
  );

  const messagesForConversation = useCallback(
    (conversationId: string) =>
      (state.directMessages ?? [])
        .filter((m) => m.conversationId === conversationId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [state.directMessages],
  );

  const getMessagePeer = useCallback(
    (peerId: string) => collectSearchablePeers(state, user?.id ?? "").find((p) => p.id === peerId),
    [state, user?.id],
  );

  /** Remember a peer's identity (e.g. fetched from Supabase) so DMs show a real name. */
  const cacheMessagePeer = useCallback((peer: MessagePeer) => {
    if (!peer?.id) return;
    setState((s) => {
      const peers = s.messagePeers ?? [];
      const existing = peers.find((p) => p.id === peer.id);
      // Only write when it's new or actually adds a display name/username.
      if (existing && (existing.displayName || !peer.displayName)) return s;
      const nextPeers = existing
        ? peers.map((p) => (p.id === peer.id ? { ...p, ...peer } : p))
        : [...peers, peer];
      return { ...s, messagePeers: nextPeers };
    });
  }, []);

  const searchMessagePeers = useCallback(
    (query: string) => {
      if (!user) return [];
      const blocked = new Set(
        (state.userBlocks ?? []).flatMap((b) =>
          b.blockerId === user.id
            ? [b.blockedId]
            : b.blockedId === user.id
              ? [b.blockerId]
              : [],
        ),
      );
      return collectSearchablePeers(state, user.id)
        .filter((p) => !blocked.has(p.id))
        .filter((p) => peerMatchesQuery(p, query));
    },
    [state, user],
  );

  const openConversationWith = useCallback(
    (peerId: string, peerHint?: MessagePeer) => {
      if (!user || peerId === user.id) return null;
      if (
        (state.userBlocks ?? []).some(
          (b) =>
            (b.blockerId === user.id && b.blockedId === peerId) ||
            (b.blockerId === peerId && b.blockedId === user.id),
        )
      ) {
        return null;
      }
      const id = conversationIdForPair(user.id, peerId);
      const existing = (state.directConversations ?? []).find((c) => c.id === id);
      if (existing) {
        if (peerHint) {
          setState((s) => {
            const peers = s.messagePeers ?? [];
            if (peers.some((p) => p.id === peerHint.id)) return s;
            return { ...s, messagePeers: [...peers, peerHint] };
          });
        }
        return existing;
      }

      const now = new Date().toISOString();
      const conv: DirectConversation = {
        id,
        memberIds: [user.id, peerId].sort() as [string, string],
        createdAt: now,
        updatedAt: now,
        readAtByUser: { [user.id]: now },
      };
      setState((s) => {
        const peers = s.messagePeers ?? [];
        const nextPeers =
          peerHint && !peers.some((p) => p.id === peerHint.id)
            ? [...peers, peerHint]
            : peers;
        return {
          ...s,
          messagePeers: nextPeers,
          directConversations: [...(s.directConversations ?? []), conv],
        };
      });
      if (supabaseOn) void upsertConversationRemote(conv);
      return conv;
    },
    [state.directConversations, state.userBlocks, user, supabaseOn],
  );

  const markConversationRead = useCallback(
    (conversationId: string) => {
      if (!user) return;
      const now = new Date().toISOString();
      setState((s) => {
        const next = (s.directConversations ?? []).map((c) =>
          c.id === conversationId
            ? { ...c, readAtByUser: { ...c.readAtByUser, [user.id]: now } }
            : c,
        );
        const updated = next.find((c) => c.id === conversationId);
        if (supabaseOn && updated) void upsertConversationRemote(updated);
        return { ...s, directConversations: next };
      });
    },
    [user, supabaseOn],
  );

  const sendDirectMessage = useCallback(
    (conversationId: string, body: string) => {
      const text = body.trim();
      if (!text || !user) return;
      const conv = (state.directConversations ?? []).find((c) => c.id === conversationId);
      if (!conv || !conv.memberIds.includes(user.id)) return;

      const now = new Date().toISOString();
      const recipientId = otherMemberId(conv, user.id);
      if (
        (state.userBlocks ?? []).some(
          (b) =>
            (b.blockerId === user.id && b.blockedId === recipientId) ||
            (b.blockerId === recipientId && b.blockedId === user.id),
        )
      ) {
        return;
      }

      const msg: DirectMessage = {
        id: remoteId(),
        conversationId,
        senderId: user.id,
        body: text,
        createdAt: now,
      };

      setState((s) => {
        const nextConv = (s.directConversations ?? []).map((c) =>
          c.id === conversationId
            ? {
                ...c,
                updatedAt: now,
                lastMessageAt: now,
                lastMessagePreview: text.slice(0, 120),
                lastMessageSenderId: user.id,
                readAtByUser: { ...c.readAtByUser, [user.id]: now },
              }
            : c,
        );
        const updatedConv = nextConv.find((c) => c.id === conversationId);
        if (supabaseOn && updatedConv) {
          void upsertConversationRemote(updatedConv);
          void upsertDirectMessageRemote(msg);
        }
        return {
          ...s,
          directMessages: [...(s.directMessages ?? []), msg],
          directConversations: nextConv,
        };
      });

      if (!supabaseOn) {
        pushNotification({
          userId: recipientId,
          kind: "message",
          message: `${user.displayName}: ${text.slice(0, 80)}${text.length > 80 ? "…" : ""}`,
          href: `/inbox/${conversationId}`,
        });
      }
    },
    [state.directConversations, state.userBlocks, user, pushNotification, supabaseOn],
  );

  const trackEvent = useCallback(
    (type: string, meta?: Record<string, unknown>) => {
      trackEventInternal(type, meta);
    },
    [trackEventInternal],
  );

  const listAnalyticsEvents = useCallback(() => state.events ?? [], [state.events]);

  const sendLiveChat = useCallback(
    (roomId: string, body: string) => {
      const text = body.trim();
      if (!text || !user) return;
      const msg = {
        id: newId(),
        roomId,
        authorName: user.displayName,
        authorAvatarUrl: user.avatarUrl,
        body: text,
        createdAt: new Date().toISOString(),
      };
      setState((s) => ({
        ...s,
        liveChatByRoom: {
          ...s.liveChatByRoom,
          [roomId]: [...(s.liveChatByRoom[roomId] ?? []), msg],
        },
      }));
    },
    [user],
  );

  const liveChatForRoom = useCallback(
    (roomId: string) => state.liveChatByRoom[roomId] ?? [],
    [state.liveChatByRoom],
  );

  const getPremiereEvent = useCallback(
    (id: string) => state.premiereEvents.find((e) => e.id === id),
    [state.premiereEvents],
  );

  const listPremiereEvents = useCallback(() => {
    return [...state.premiereEvents].sort(
      (a, b) =>
        new Date(a.featureStartsAt).getTime() - new Date(b.featureStartsAt).getTime(),
    );
  }, [state.premiereEvents]);

  const listMyPremiereEvents = useCallback(() => {
    if (!user) return [];
    return state.premiereEvents.filter((e) => e.ownerId === user.id);
  }, [state.premiereEvents, user]);

  const addPremiereEvent = useCallback(
    (
      input: {
        titleId: string;
        titleName: string;
        featureStartsAt: string;
        preRollAdSeconds: number;
        adVideoUrl: string;
        featureVideoUrl: string;
        adHlsUrl?: string;
        featureHlsUrl?: string;
        featureSubtitleVttUrl?: string;
        capacity: number;
        priceCents: number;
        currency: string;
        description: string;
        preShowLiveId?: string;
        afterPartyLiveId?: string;
      },
      options?: { schedulePreShow?: boolean; scheduleAfterParty?: boolean },
    ): PremiereEvent | null => {
      if (!user?.isCreator) return null;
      const title = state.titles.find((t) => t.id === input.titleId);
      const evId = newId();
      let preShowLiveId = input.preShowLiveId;
      let afterPartyLiveId = input.afterPartyLiveId;
      const companionLives: ScheduledLive[] = [];

      if (options?.schedulePreShow && title) {
        const pre = preShowLiveStartsAt({
          ...input,
          id: evId,
          ownerId: user.id,
          createdAt: "",
        } as PremiereEvent);
        companionLives.push({
          id: newId(),
          titleId: input.titleId,
          title: `${title.name} — pre-show`,
          startsAt: pre,
          roomId: liveRoomIdForUser(user),
          description: `Red carpet before ${input.titleName}`,
          ownerId: user.id,
          ownerUsername: user.username,
          premiereEventId: evId,
          liveRole: "pre_show",
        });
        preShowLiveId = companionLives[companionLives.length - 1].id;
      }

      const ev: PremiereEvent = {
        ...input,
        id: evId,
        ownerId: user.id,
        createdAt: new Date().toISOString(),
        preShowLiveId,
        afterPartyLiveId,
      };

      if (options?.scheduleAfterParty && title) {
        const afterAt = afterPartyLiveStartsAt(ev);
        const afterLive: ScheduledLive = {
          id: newId(),
          titleId: input.titleId,
          title: `${title.name} — after-party`,
          startsAt: afterAt,
          roomId: liveRoomIdForUser(user),
          description: `Discussion after ${input.titleName}`,
          ownerId: user.id,
          ownerUsername: user.username,
          premiereEventId: evId,
          liveRole: "after_party",
        };
        companionLives.push(afterLive);
        ev.afterPartyLiveId = afterLive.id;
      }

      setState((s) => ({
        ...s,
        premiereEvents: [...s.premiereEvents, ev],
        scheduledLives: [...s.scheduledLives, ...companionLives],
      }));
      trackEventInternal("premiere_created", {
        eventId: ev.id,
        preShow: !!ev.preShowLiveId,
        afterParty: !!ev.afterPartyLiveId,
      });
      pushNotification({
        userId: user.id,
        kind: "premiere",
        message: `Premiere scheduled: ${ev.titleName}`,
        href: `/premiere/${ev.id}`,
      });
      return ev;
    },
    [state.titles, user, pushNotification, trackEventInternal],
  );

  const updatePremiereEvent = useCallback((id: string, patch: Partial<PremiereEvent>) => {
    if (!user?.isCreator) return;
    setState((s) => ({
      ...s,
      premiereEvents: s.premiereEvents.map((e) =>
        e.id === id && e.ownerId === user.id ? { ...e, ...patch } : e,
      ),
    }));
  }, [user]);

  const deletePremiereEvent = useCallback(
    (id: string) => {
      if (!user) return;
      const ev = state.premiereEvents.find((e) => e.id === id);
      if (!ev || ev.ownerId !== user.id) return;
      setState((s) => ({
        ...s,
        premiereEvents: s.premiereEvents.filter((e) => e.id !== id),
        premiereReservations: s.premiereReservations.filter((r) => r.eventId !== id),
      }));
    },
    [state.premiereEvents, user],
  );

  const reservePremiereSeat = useCallback(
    (
      eventId: string,
      payment?: {
        reference?: string;
        status?: PremiereReservation["paymentStatus"];
        ticketCount?: number;
      },
    ): { ok: boolean; error?: string; already?: boolean; shareCode?: string } => {
      if (!user) return { ok: false, error: "sign-in" };
      const ev = state.premiereEvents.find((e) => e.id === eventId);
      if (!ev) return { ok: false, error: "missing" };
      const tickets = Math.max(1, Math.min(20, payment?.ticketCount ?? 1));
      const used = premiereTicketsUsed(state.premiereReservations, eventId);
      if (used + tickets > ev.capacity) return { ok: false, error: "full" };
      if (
        state.premiereReservations.some(
          (r) => r.eventId === eventId && r.userId === user.id,
        )
      ) {
        return { ok: true, already: true };
      }
      const grossCents = ev.priceCents * tickets;
      const shareCode = tickets > 1 ? generateShareCode() : undefined;
      const row: PremiereReservation = {
        id: remoteId(),
        eventId,
        userId: user.id,
        createdAt: new Date().toISOString(),
        amountCents: grossCents,
        ticketCount: tickets,
        shareCode,
        ticketsRedeemed: 1,
        paymentReference: payment?.reference,
        paymentStatus: payment?.status ?? (payment?.reference ? "paid" : "demo"),
      };
      const ledgerRows = recordLedgerPair(
        ev.ownerId,
        "premiere_reservation",
        `Premiere · ${ev.titleName} (${tickets} ticket${tickets > 1 ? "s" : ""})`,
        grossCents,
        ev.currency,
        { eventId, reservationId: row.id, ticketCount: tickets },
      );
      setState((s) => ({
        ...s,
        premiereReservations: [...s.premiereReservations, row],
        ledger: [...s.ledger, ...ledgerRows],
      }));
      pushNotification({
        userId: user.id,
        kind: "premiere",
        message: `Premiere tickets: ${ev.titleName}`,
        href: `/premiere/${ev.id}`,
      });
      trackEventInternal("premiere_reserve", { eventId, ticketCount: tickets });
      return { ok: true, already: false, shareCode };
    },
    [
      state.premiereEvents,
      state.premiereReservations,
      state.ledger,
      user,
      pushNotification,
      trackEventInternal,
    ],
  );

  const redeemPremiereShare = useCallback(
    (shareCode: string): { ok: boolean; error?: string; eventId?: string } => {
      if (!user) return { ok: false, error: "sign-in" };
      const code = shareCode.trim().toUpperCase();
      const purchase = state.premiereReservations.find(
        (r) => r.shareCode?.toUpperCase() === code,
      );
      if (!purchase) return { ok: false, error: "invalid" };
      const ev = state.premiereEvents.find((e) => e.id === purchase.eventId);
      if (!ev) return { ok: false, error: "missing" };
      const redeemed = purchase.ticketsRedeemed ?? 1;
      const total = purchase.ticketCount ?? 1;
      if (redeemed >= total) return { ok: false, error: "used" };
      if (purchase.userId === user.id) {
        return { ok: true, eventId: ev.id };
      }
      if (
        state.premiereReservations.some(
          (r) => r.eventId === ev.id && r.userId === user.id,
        ) ||
        state.premiereShareClaims.some(
          (c) => c.eventId === ev.id && c.userId === user.id,
        )
      ) {
        return { ok: true, eventId: ev.id };
      }
      if (
        state.premiereShareClaims.some(
          (c) => c.shareCode.toUpperCase() === code && c.userId === user.id,
        )
      ) {
        return { ok: true, eventId: ev.id };
      }
      setState((s) => ({
        ...s,
        premiereReservations: s.premiereReservations.map((r) =>
          r.id === purchase.id
            ? { ...r, ticketsRedeemed: (r.ticketsRedeemed ?? 1) + 1 }
            : r,
        ),
        premiereShareClaims: [
          ...s.premiereShareClaims,
          {
            eventId: ev.id,
            userId: user.id,
            shareCode: code,
            createdAt: new Date().toISOString(),
          },
        ],
      }));
      trackEventInternal("premiere_share_redeem", { eventId: ev.id, shareCode: code });
      return { ok: true, eventId: ev.id };
    },
    [state.premiereEvents, state.premiereReservations, state.premiereShareClaims, user, trackEventInternal],
  );

  const hasTitleAccess = useCallback(
    (titleId: string) => {
      if (!user) return false;
      const title = state.titles.find((t) => t.id === titleId);
      if (!title) return false;
      if (title.ownerId === user.id) return true;
      if (title.accessMode !== "paid" || (title.accessPriceCents ?? 0) <= 0) return true;
      return state.titleAccessGrants.some(
        (g) => g.titleId === titleId && g.userId === user.id,
      );
    },
    [state.titles, state.titleAccessGrants, user],
  );

  const purchaseTitleAccess = useCallback(
    (
      titleId: string,
      payment?: { reference?: string },
    ): { ok: boolean; error?: string } => {
      if (!user) return { ok: false, error: "sign-in" };
      const title = state.titles.find((t) => t.id === titleId);
      if (!title || title.accessMode !== "paid") return { ok: false, error: "missing" };
      const price = title.accessPriceCents ?? 0;
      if (price <= 0) return { ok: false, error: "free" };
      if (hasTitleAccess(titleId)) return { ok: true };
      const grant = {
        id: newId(),
        titleId,
        userId: user.id,
        amountCents: price,
        currency: title.accessCurrency ?? "USD",
        createdAt: new Date().toISOString(),
        paymentReference: payment?.reference,
        paymentStatus: (payment?.reference ? "paid" : "demo") as const,
      };
      const ledgerRows = recordLedgerPair(
        title.ownerId,
        "title_access",
        `Watch · ${title.name}`,
        price,
        title.accessCurrency ?? "USD",
        { titleId, grantId: grant.id },
      );
      setState((s) => ({
        ...s,
        titleAccessGrants: [...s.titleAccessGrants, grant],
        ledger: [...s.ledger, ...ledgerRows],
      }));
      trackEventInternal("title_access_purchase", { titleId, priceCents: price });
      return { ok: true };
    },
    [state.titles, state.titleAccessGrants, state.ledger, user, hasTitleAccess, trackEventInternal],
  );

  const purchaseBoost = useCallback(
    (productId: string, titleId?: string): { ok: boolean; error?: string } => {
      if (!user?.isCreator) return { ok: false, error: "creator" };
      const product = BOOST_PRODUCTS.find((p) => p.id === productId);
      if (!product) return { ok: false, error: "missing" };
      const at = new Date().toISOString();
      setState((s) => {
        const nextTitles =
          titleId && product.id.includes("featured")
            ? s.titles.map((t) =>
                t.id === titleId && t.ownerId === user.id
                  ? { ...t, listingBoost: "featured" as const }
                  : t,
              )
            : s.titles;
        return {
          ...s,
          titles: nextTitles,
          ledger: [
            ...s.ledger,
            {
              id: newId(),
              creatorId: "__platform__",
              source: "boost",
              amountCents: product.priceCents,
              currency: product.currency,
              label: `Boost · ${product.label}`,
              createdAt: at,
              meta: { productId, fromCreatorId: user.id, titleId },
            },
          ],
        };
      });
      trackEventInternal("boost_purchase", { productId, titleId });
      return { ok: true };
    },
    [user, trackEventInternal],
  );

  const purchaseCoinPack = useCallback(
    (packId: string): { ok: boolean; error?: string } => {
      if (!user) return { ok: false, error: "sign-in" };
      const pack = COIN_PACKS.find((p) => p.id === packId);
      if (!pack) return { ok: false, error: "missing" };
      const { platformFeeCents } = splitPayment(pack.priceCents);
      const balance = (user.coinBalance ?? 0) + pack.coins;
      void platformFeeCents;
      setState((s) => ({
        ...s,
        ledger: [
          ...s.ledger,
          {
            id: newId(),
            creatorId: "__platform__",
            source: "coin_purchase",
            amountCents: pack.priceCents - platformFeeCents,
            currency: pack.currency,
            label: `Coins · ${pack.label}`,
            createdAt: new Date().toISOString(),
            meta: { userId: user.id, packId },
          },
        ],
      }));
      void updateProfile({ coinBalance: balance });
      trackEventInternal("coin_purchase", { packId, coins: pack.coins });
      return { ok: true };
    },
    [user, trackEventInternal, updateProfile],
  );

  const sendLiveGift = useCallback(
    (creatorId: string, giftId: string): { ok: boolean; error?: string } => {
      if (!user) return { ok: false, error: "sign-in" };
      const gift = LIVE_GIFTS.find((g) => g.id === giftId);
      if (!gift) return { ok: false, error: "missing" };
      const balance = user.coinBalance ?? 0;
      if (balance < gift.coins) return { ok: false, error: "coins" };
      const grossCents = gift.coins * 10;
      const creatorShare = Math.round(grossCents * gift.creatorShare);
      const ledgerRows = recordLedgerPair(
        creatorId,
        "live_gift",
        `Live gift · ${gift.label}`,
        creatorShare,
        "USD",
        { giftId, fromUserId: user.id },
      );
      void updateProfile({ coinBalance: balance - gift.coins });
      setState((s) => ({ ...s, ledger: [...s.ledger, ...ledgerRows] }));
      trackEventInternal("live_gift", { creatorId, giftId });
      return { ok: true };
    },
    [user, trackEventInternal, updateProfile],
  );

  const hasPremiereAccess = useCallback(
    (eventId: string) => {
      if (!user) return false;
      const ev = state.premiereEvents.find((e) => e.id === eventId);
      if (!ev) return false;
      if (ev.ownerId === user.id) return true;
      if (
        state.premiereReservations.some(
          (r) => r.eventId === eventId && r.userId === user.id,
        )
      ) {
        return true;
      }
      return state.premiereShareClaims.some(
        (c) => c.eventId === eventId && c.userId === user.id,
      );
    },
    [state.premiereEvents, state.premiereReservations, state.premiereShareClaims, user],
  );

  const premiereReservationCount = useCallback(
    (eventId: string) => premiereTicketsUsed(state.premiereReservations, eventId),
    [state.premiereReservations],
  );

  const getFeatureFlags = useCallback(() => state.featureFlags, [state.featureFlags]);

  const setFeatureFlags = useCallback((patch: Partial<FeatureFlags>) => {
    setState((s) => ({
      ...s,
      featureFlags: { ...s.featureFlags, ...patch },
    }));
  }, []);

  const toggleFollow = useCallback(
    (targetType: "title" | "user", targetId: string) => {
      if (!user) return;
      const ex = state.follows.find(
        (f) =>
          f.followerId === user.id &&
          f.targetType === targetType &&
          f.targetId === targetId,
      );
      if (ex) {
        setState((s) => ({
          ...s,
          follows: s.follows.filter((x) => x.id !== ex.id),
        }));
      } else {
        const edge: FollowEdge = {
          id: newId(),
          followerId: user.id,
          targetType,
          targetId,
          createdAt: new Date().toISOString(),
        };
        setState((s) => ({ ...s, follows: [...s.follows, edge] }));
      }
      trackEventInternal("follow_toggle", { targetType, targetId });
    },
    [user, state.follows, trackEventInternal],
  );

  const isFollowing = useCallback(
    (targetType: "title" | "user", targetId: string) => {
      if (!user) return false;
      return state.follows.some(
        (f) =>
          f.followerId === user.id &&
          f.targetType === targetType &&
          f.targetId === targetId,
      );
    },
    [user, state.follows],
  );

  const followedTitleIds = useCallback(() => {
    if (!user) return [];
    return state.follows
      .filter((f) => f.followerId === user.id && f.targetType === "title")
      .map((f) => f.targetId);
  }, [user, state.follows]);

  const togglePremiereReminder = useCallback(
    (premiereEventId: string) => {
      if (!user) return;
      const ex = state.premiereReminders.find(
        (r) => r.userId === user.id && r.premiereEventId === premiereEventId,
      );
      if (ex) {
        setState((s) => ({
          ...s,
          premiereReminders: s.premiereReminders.filter((x) => x.id !== ex.id),
        }));
      } else {
        const r: PremiereReminder = {
          id: newId(),
          userId: user.id,
          premiereEventId,
          createdAt: new Date().toISOString(),
        };
        setState((s) => ({ ...s, premiereReminders: [...s.premiereReminders, r] }));
        pushNotification({
          userId: user.id,
          kind: "reminder",
          message: "Reminder saved for this screening.",
          href: `/premiere/${premiereEventId}`,
        });
      }
    },
    [user, state.premiereReminders, pushNotification],
  );

  const hasPremiereReminder = useCallback(
    (premiereEventId: string) => {
      if (!user) return false;
      return state.premiereReminders.some(
        (r) => r.userId === user.id && r.premiereEventId === premiereEventId,
      );
    },
    [user, state.premiereReminders],
  );

  const addReview = useCallback(
    (titleId: string, rating: number, body: string) => {
      if (!user) return;
      const text = body.trim();
      if (!text) return;
      const r: TitleReview = {
        id: newId(),
        titleId,
        userId: user.id,
        authorName: user.displayName,
        rating: Math.min(5, Math.max(1, Math.round(rating))),
        body: text,
        createdAt: new Date().toISOString(),
      };
      setState((s) => ({ ...s, reviews: [...s.reviews, r] }));
      trackEventInternal("title_review", { titleId });
    },
    [user, trackEventInternal],
  );

  const listReviewsForTitle = useCallback(
    (titleId: string) =>
      state.reviews
        .filter((r) => r.titleId === titleId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.reviews],
  );

  const titleRatingSummary = useCallback(
    (titleId: string) => {
      const rs = state.reviews.filter((r) => r.titleId === titleId);
      if (rs.length === 0) return { avg: 0, count: 0 };
      const sum = rs.reduce((a, r) => a + r.rating, 0);
      return { avg: sum / rs.length, count: rs.length };
    },
    [state.reviews],
  );

  const toggleLike = useCallback(
    (targetType: EngagementTargetType, targetId: string) => {
      if (!user) return;
      const likes = state.contentLikes ?? [];
      const ex = likes.find(
        (l) =>
          l.userId === user.id && l.targetType === targetType && l.targetId === targetId,
      );
      if (ex) {
        setState((s) => ({
          ...s,
          contentLikes: (s.contentLikes ?? []).filter(
            (l) =>
              !(
                l.userId === user.id &&
                l.targetType === targetType &&
                l.targetId === targetId
              ),
          ),
        }));
        if (supabaseOn) void deleteContentLikeRemote(user.id, targetType, targetId);
      } else {
        const l: ContentLike = {
          userId: user.id,
          targetType,
          targetId,
          createdAt: new Date().toISOString(),
        };
        setState((s) => ({ ...s, contentLikes: [...(s.contentLikes ?? []), l] }));
        if (supabaseOn) void upsertContentLikeRemote(l);
      }
    },
    [user, state.contentLikes, supabaseOn],
  );

  const likeCount = useCallback(
    (targetType: EngagementTargetType, targetId: string) =>
      (state.contentLikes ?? []).filter(
        (l) => l.targetType === targetType && l.targetId === targetId,
      ).length,
    [state.contentLikes],
  );

  const userLiked = useCallback(
    (targetType: EngagementTargetType, targetId: string) =>
      !!user &&
      (state.contentLikes ?? []).some(
        (l) =>
          l.userId === user.id && l.targetType === targetType && l.targetId === targetId,
      ),
    [user, state.contentLikes],
  );

  const togglePostLike = useCallback(
    (postId: string) => toggleLike("post", postId),
    [toggleLike],
  );

  const postLikeCount = useCallback(
    (postId: string) => likeCount("post", postId),
    [likeCount],
  );

  const userLikedPost = useCallback(
    (postId: string) => userLiked("post", postId),
    [userLiked],
  );

  const listComments = useCallback(
    (targetType: EngagementTargetType, targetId: string) =>
      (state.comments ?? [])
        .filter((c) => c.targetType === targetType && c.targetId === targetId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [state.comments],
  );

  const commentCount = useCallback(
    (targetType: EngagementTargetType, targetId: string) =>
      listComments(targetType, targetId).length,
    [listComments],
  );

  const addComment = useCallback(
    (targetType: EngagementTargetType, targetId: string, body: string) => {
      const text = body.trim();
      if (!text || !user) return;
      const c: ContentComment = {
        id: remoteId(),
        targetType,
        targetId,
        authorId: user.id,
        authorName: user.displayName,
        authorAvatarUrl: user.avatarUrl,
        body: text,
        createdAt: new Date().toISOString(),
      };
      setState((s) => ({ ...s, comments: [...(s.comments ?? []), c] }));
      if (supabaseOn) void upsertCommentRemote(c);
      trackEventInternal("comment_add", { targetType, targetId });
    },
    [user, trackEventInternal, supabaseOn],
  );

  const deleteComment = useCallback(
    (commentId: string) => {
      if (!user) return;
      setState((s) => ({
        ...s,
        comments: (s.comments ?? []).filter(
          (c) => !(c.id === commentId && c.authorId === user.id),
        ),
      }));
      if (supabaseOn) void deleteCommentRemote(commentId);
    },
    [user, supabaseOn],
  );

  const toggleBookmark = useCallback(
    (targetType: BookmarkTargetType, targetId: string) => {
      if (!user) return;
      const marks = state.bookmarks ?? [];
      const ex = marks.find(
        (b) =>
          b.userId === user.id && b.targetType === targetType && b.targetId === targetId,
      );
      if (ex) {
        setState((s) => ({
          ...s,
          bookmarks: (s.bookmarks ?? []).filter(
            (b) =>
              !(
                b.userId === user.id &&
                b.targetType === targetType &&
                b.targetId === targetId
              ),
          ),
        }));
        if (supabaseOn) void deleteBookmarkRemote(user.id, targetType, targetId);
      } else {
        const b: Bookmark = {
          userId: user.id,
          targetType,
          targetId,
          createdAt: new Date().toISOString(),
        };
        setState((s) => ({ ...s, bookmarks: [...(s.bookmarks ?? []), b] }));
        if (supabaseOn) void upsertBookmarkRemote(b);
        pushNotification({
          userId: user.id,
          kind: "bookmark",
          message: "Saved to your watch later list.",
          href: "/saved",
        });
      }
    },
    [user, state.bookmarks, supabaseOn, pushNotification],
  );

  const isBookmarked = useCallback(
    (targetType: BookmarkTargetType, targetId: string) =>
      !!user &&
      (state.bookmarks ?? []).some(
        (b) =>
          b.userId === user.id && b.targetType === targetType && b.targetId === targetId,
      ),
    [user, state.bookmarks],
  );

  const listMyBookmarks = useCallback(() => {
    if (!user) return [];
    return (state.bookmarks ?? [])
      .filter((b) => b.userId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [state.bookmarks, user]);

  const addReport = useCallback(
    (targetType: Report["targetType"], targetId: string, reason: string) => {
      if (!user) return;
      const r: Report = {
        id: remoteId(),
        reporterId: user.id,
        targetType,
        targetId,
        reason: reason.trim(),
        createdAt: new Date().toISOString(),
        status: "open",
      };
      setState((s) => ({ ...s, reports: [...s.reports, r] }));
      trackEventInternal("report", { targetType, targetId });
    },
    [user, trackEventInternal],
  );

  const listReports = useCallback(
    () => [...state.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.reports],
  );

  const listOpenReports = useCallback(
    () =>
      state.reports
        .filter((r) => (r.status ?? "open") === "open")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.reports],
  );

  const setReportStatus = useCallback((id: string, status: Report["status"]) => {
    setState((s) => ({
      ...s,
      reports: s.reports.map((r) => (r.id === id ? { ...r, status } : r)),
    }));
  }, []);

  const isBlocked = useCallback(
    (userId: string) => {
      if (!user) return false;
      return (state.userBlocks ?? []).some(
        (b) => b.blockerId === user.id && b.blockedId === userId,
      );
    },
    [state.userBlocks, user],
  );

  const isBlockedEitherWay = useCallback(
    (userId: string) => {
      if (!user) return false;
      return (state.userBlocks ?? []).some(
        (b) =>
          (b.blockerId === user.id && b.blockedId === userId) ||
          (b.blockerId === userId && b.blockedId === user.id),
      );
    },
    [state.userBlocks, user],
  );

  const blockUser = useCallback(
    (blockedId: string) => {
      if (!user || blockedId === user.id) return;
      if (isBlocked(blockedId)) return;
      const row: UserBlock = {
        id: remoteId(),
        blockerId: user.id,
        blockedId,
        createdAt: new Date().toISOString(),
      };
      setState((s) => ({ ...s, userBlocks: [...(s.userBlocks ?? []), row] }));
      if (supabaseOn) void insertUserBlockRemote(row);
      trackEventInternal("user_block", { blockedId });
    },
    [user, isBlocked, trackEventInternal, supabaseOn],
  );

  const unblockUser = useCallback(
    (blockedId: string) => {
      if (!user) return;
      setState((s) => ({
        ...s,
        userBlocks: (s.userBlocks ?? []).filter(
          (b) => !(b.blockerId === user.id && b.blockedId === blockedId),
        ),
      }));
      if (supabaseOn) void deleteUserBlockRemote(user.id, blockedId);
    },
    [user, supabaseOn],
  );

  const listBlockedUsers = useCallback(() => {
    if (!user) return [];
    const peers = collectSearchablePeers(state, user.id);
    return (state.userBlocks ?? [])
      .filter((b) => b.blockerId === user.id)
      .map((b) => {
        const peer = peers.find((p) => p.id === b.blockedId);
        return {
          id: b.blockedId,
          displayName: peer?.displayName ?? "User",
          username: peer?.username,
        };
      });
  }, [state, user]);

  const listLedgerForCreator = useCallback(
    (creatorId: string) =>
      state.ledger
        .filter((l) => l.creatorId === creatorId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [state.ledger],
  );

  const value = useMemo(
    () => ({
      state,
      getTitleBySlug,
      listPublishedTitles,
      listMyTitles,
      addTitle,
      updateTitle,
      deleteTitle,
      listEpisodes,
      addUpload,
      scheduleLive,
      updatePremiereEvent,
      purchaseBoost,
      listScheduledLives,
      listPosts,
      addPost,
      listActiveStories,
      listStoriesByUser,
      addStory,
      deleteStory,
      dismissStory,
      isStoryDismissed,
      notificationsForUser,
      unreadCount,
      inboxUnreadCount,
      unreadNotificationCount,
      unreadMessagesCount,
      markNotificationRead,
      markAllNotificationsRead,
      listConversations,
      messagesForConversation,
      getConversation,
      openConversationWith,
      sendDirectMessage,
      markConversationRead,
      getMessagePeer,
      cacheMessagePeer,
      searchMessagePeers,
      trackEvent,
      listAnalyticsEvents,
      sendLiveChat,
      liveChatForRoom,
      getPremiereEvent,
      listPremiereEvents,
      listMyPremiereEvents,
      addPremiereEvent,
      deletePremiereEvent,
      reservePremiereSeat,
      redeemPremiereShare,
      hasTitleAccess,
      purchaseTitleAccess,
      purchaseCoinPack,
      sendLiveGift,
      hasPremiereAccess,
      premiereReservationCount,
      getFeatureFlags,
      setFeatureFlags,
      toggleFollow,
      isFollowing,
      followedTitleIds,
      togglePremiereReminder,
      hasPremiereReminder,
      addReview,
      listReviewsForTitle,
      titleRatingSummary,
      toggleLike,
      likeCount,
      userLiked,
      togglePostLike,
      postLikeCount,
      userLikedPost,
      addComment,
      deleteComment,
      listComments,
      commentCount,
      toggleBookmark,
      isBookmarked,
      listMyBookmarks,
      addReport,
      listReports,
      listOpenReports,
      setReportStatus,
      blockUser,
      unblockUser,
      isBlocked,
      isBlockedEitherWay,
      listBlockedUsers,
      listLedgerForCreator,
      dataMode: supabaseOn ? ("supabase" as const) : ("local" as const),
      dataReady,
    }),
    [
      state,
      supabaseOn,
      dataReady,
      getTitleBySlug,
      listPublishedTitles,
      listMyTitles,
      addTitle,
      updateTitle,
      deleteTitle,
      listEpisodes,
      addUpload,
      scheduleLive,
      updatePremiereEvent,
      purchaseBoost,
      listScheduledLives,
      listPosts,
      addPost,
      listActiveStories,
      listStoriesByUser,
      addStory,
      deleteStory,
      dismissStory,
      isStoryDismissed,
      notificationsForUser,
      unreadCount,
      inboxUnreadCount,
      unreadNotificationCount,
      unreadMessagesCount,
      markNotificationRead,
      markAllNotificationsRead,
      listConversations,
      messagesForConversation,
      getConversation,
      openConversationWith,
      sendDirectMessage,
      markConversationRead,
      getMessagePeer,
      cacheMessagePeer,
      searchMessagePeers,
      trackEvent,
      listAnalyticsEvents,
      sendLiveChat,
      liveChatForRoom,
      getPremiereEvent,
      listPremiereEvents,
      listMyPremiereEvents,
      addPremiereEvent,
      deletePremiereEvent,
      reservePremiereSeat,
      redeemPremiereShare,
      hasTitleAccess,
      purchaseTitleAccess,
      purchaseCoinPack,
      sendLiveGift,
      hasPremiereAccess,
      premiereReservationCount,
      getFeatureFlags,
      setFeatureFlags,
      toggleFollow,
      isFollowing,
      followedTitleIds,
      togglePremiereReminder,
      hasPremiereReminder,
      addReview,
      listReviewsForTitle,
      titleRatingSummary,
      toggleLike,
      likeCount,
      userLiked,
      togglePostLike,
      postLikeCount,
      userLikedPost,
      addComment,
      deleteComment,
      listComments,
      commentCount,
      toggleBookmark,
      isBookmarked,
      listMyBookmarks,
      addReport,
      listReports,
      listOpenReports,
      setReportStatus,
      blockUser,
      unblockUser,
      isBlocked,
      isBlockedEitherWay,
      listBlockedUsers,
      listLedgerForCreator,
    ],
  );

  return (
    <FilmDataContext.Provider value={value}>{children}</FilmDataContext.Provider>
  );
}

export function useFilmData() {
  const ctx = useContext(FilmDataContext);
  if (!ctx) throw new Error("useFilmData must be used within FilmDataProvider");
  return ctx;
}
