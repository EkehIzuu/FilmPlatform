export type TitleKind = "movie" | "series";

export type ListingBoost = "none" | "featured";

export type Title = {
  id: string;
  slug: string;
  name: string;
  kind: TitleKind;
  description: string;
  ownerId: string;
  status: "draft" | "published";
  genre?: string;
  region?: string;
  createdAt: string;
  /** Minimum age to view (13, 16, 18). */
  minAge?: number;
  /** Explore placement — creator-controlled for demo. */
  listingBoost?: ListingBoost;
  /** Optional WebVTT URL for trailer/title extras. */
  subtitleVttUrl?: string;
  /** Profile VOD: free or pay to watch uploaded film (no premiere required). */
  accessMode?: "free" | "paid";
  accessPriceCents?: number;
  accessCurrency?: string;
};

export type Episode = {
  id: string;
  titleId: string;
  label: string;
  name: string;
};

export type UploadKind =
  | "trailer"
  | "feature"
  | "pre_show"
  | "episode"
  | "bts"
  | "bloopers"
  | "interview"
  | "announcement";

export type UploadAsset = {
  id: string;
  titleId: string;
  /** When set, ties an episode upload to a specific episode row. */
  episodeId?: string;
  kind: UploadKind;
  fileName: string;
  status: "uploading" | "processing" | "ready" | "failed";
  progress: number;
  createdAt: string;
  storagePath?: string;
  publicUrl?: string;
};

export type LivePremiereRole = "pre_show" | "reactions" | "after_party" | "q_and_a" | "general";

export type ScheduledLive = {
  id: string;
  titleId: string;
  title: string;
  startsAt: string;
  /** Internal engine/chat key — fans use profile URL, not this id. */
  roomId: string;
  description: string;
  ownerId: string;
  /** Public @handle for profile-based live links. */
  ownerUsername?: string;
  /** When set, this live is part of a ticketed premiere night. */
  premiereEventId?: string;
  liveRole?: LivePremiereRole;
};

/** Ephemeral short clip (24h story) — fans and creators can post. */
export type StoryClip = {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  caption?: string;
  mediaUrl: string;
  mediaType: "video" | "image";
  createdAt: string;
  expiresAt: string;
};

export type CommunityPost = {
  id: string;
  titleSlug: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  body: string;
  createdAt: string;
};

export type PostLike = {
  userId: string;
  postId: string;
  createdAt: string;
};

export type EngagementTargetType = "post" | "story" | "title" | "episode";

export type BookmarkTargetType = "title" | "episode" | "story";

export type ContentLike = {
  userId: string;
  targetType: EngagementTargetType;
  targetId: string;
  createdAt: string;
};

export type ContentComment = {
  id: string;
  targetType: EngagementTargetType;
  targetId: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  body: string;
  createdAt: string;
};

export type Bookmark = {
  userId: string;
  targetType: BookmarkTargetType;
  targetId: string;
  createdAt: string;
};

export type AppNotification = {
  id: string;
  userId: string;
  kind: string;
  message: string;
  read: boolean;
  createdAt: string;
  href?: string;
};

/** Lightweight profile for DM search (local directory + Supabase). */
export type MessagePeer = {
  id: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  isCreator?: boolean;
};

export type DirectConversation = {
  id: string;
  memberIds: [string, string];
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  lastMessageSenderId?: string;
  /** userId → ISO timestamp of last read */
  readAtByUser: Record<string, string>;
};

export type DirectMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

export type AnalyticsEvent = {
  id: string;
  type: string;
  meta?: Record<string, unknown>;
  createdAt: string;
  userId?: string;
};

export type LiveChatMessage = {
  id: string;
  roomId: string;
  authorName: string;
  authorAvatarUrl?: string;
  body: string;
  createdAt: string;
};

/** Scheduled premiere: pre-uploaded VOD, wall-clock synced (not WebRTC). */
export type PremiereEvent = {
  id: string;
  titleId: string;
  titleName: string;
  featureStartsAt: string;
  preRollAdSeconds: number;
  adVideoUrl: string;
  featureVideoUrl: string;
  /** Optional adaptive stream (HLS). Player prefers HLS when set. */
  adHlsUrl?: string;
  featureHlsUrl?: string;
  /** WebVTT for feature (premiere player). */
  featureSubtitleVttUrl?: string;
  capacity: number;
  priceCents: number;
  currency: string;
  description: string;
  ownerId: string;
  createdAt: string;
  /** Optional profile lives bundled with this premiere. */
  preShowLiveId?: string;
  afterPartyLiveId?: string;
};

export type PremiereReservation = {
  id: string;
  eventId: string;
  userId: string;
  createdAt: string;
  amountCents: number;
  /** Tickets in this purchase (counts toward premiere capacity). */
  ticketCount?: number;
  /** Share with friends — each redeem uses one ticket from this purchase. */
  shareCode?: string;
  ticketsRedeemed?: number;
  paymentReference?: string;
  paymentStatus?: "demo" | "paid" | "pending" | "failed";
};

/** Fan purchased access to watch a title on profile (not premiere). */
export type TitleAccessGrant = {
  id: string;
  titleId: string;
  userId: string;
  amountCents: number;
  currency: string;
  createdAt: string;
  paymentReference?: string;
  paymentStatus?: "demo" | "paid";
};

export type UserBlock = {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
};

export type TitleReview = {
  id: string;
  titleId: string;
  userId: string;
  authorName: string;
  rating: number;
  body: string;
  createdAt: string;
};

export type FollowEdge = {
  id: string;
  followerId: string;
  targetType: "title" | "user";
  targetId: string;
  createdAt: string;
};

export type PremiereReminder = {
  id: string;
  userId: string;
  premiereEventId: string;
  createdAt: string;
};

export type Report = {
  id: string;
  reporterId: string;
  targetType:
    | "title"
    | "post"
    | "comment"
    | "review"
    | "premiere"
    | "story"
    | "user"
    | "message";
  targetId: string;
  reason: string;
  createdAt: string;
  status?: "open" | "resolved" | "dismissed";
};

export type LedgerEntry = {
  id: string;
  creatorId: string;
  source:
    | "premiere_reservation"
    | "title_access"
    | "live_gift"
    | "coin_purchase"
    | "boost"
    | "platform_fee"
    | "adjustment";
  amountCents: number;
  currency: string;
  label: string;
  createdAt: string;
  meta?: Record<string, unknown>;
};

export type FeatureFlags = {
  premiere: boolean;
  live: boolean;
  communities: boolean;
  explore: boolean;
  clips: boolean;
};

export type FilmDataState = {
  titles: Title[];
  episodes: Episode[];
  uploads: UploadAsset[];
  scheduledLives: ScheduledLive[];
  posts: CommunityPost[];
  stories: StoryClip[];
  notifications: AppNotification[];
  messagePeers: MessagePeer[];
  directConversations: DirectConversation[];
  directMessages: DirectMessage[];
  events: AnalyticsEvent[];
  liveChatByRoom: Record<string, LiveChatMessage[]>;
  premiereEvents: PremiereEvent[];
  premiereReservations: PremiereReservation[];
  reviews: TitleReview[];
  follows: FollowEdge[];
  /** @deprecated Migrated to contentLikes on load */
  postLikes: PostLike[];
  contentLikes: ContentLike[];
  comments: ContentComment[];
  bookmarks: Bookmark[];
  premiereReminders: PremiereReminder[];
  reports: Report[];
  userBlocks: UserBlock[];
  ledger: LedgerEntry[];
  titleAccessGrants: TitleAccessGrant[];
  /** Redeemed premiere share link (uses ticket from purchaser's bundle). */
  premiereShareClaims: { eventId: string; userId: string; shareCode: string; createdAt: string }[];
  /** Clip ids the user marked "Not interested" — hidden from their feeds (local). */
  dismissedStoryIds?: string[];
  featureFlags: FeatureFlags;
};

export type CreatorTier = "free" | "verified" | "featured";

export type CreatorVerificationStatus = "none" | "pending" | "approved" | "rejected";

export type User = {
  id: string;
  email: string;
  displayName: string;
  isCreator: boolean;
  birthYear?: number;
  /** ISO date YYYY-MM-DD */
  dateOfBirth?: string;
  placeOfBirth?: string;
  adultConfirmed?: boolean;
  region?: string;
  creatorTier?: CreatorTier;
  avatarUrl?: string;
  coverPhotoUrl?: string;
  bio?: string;
  username?: string;
  preferredLanguage?: string;
  city?: string;
  headline?: string;
  workplace?: string;
  /** Newline-separated schools / programs */
  schools?: string;
  /** Newline-separated certifications & awards */
  certifications?: string;
  /** Newline-separated languages spoken */
  languagesSpoken?: string;
  websiteUrl?: string;
  instagram?: string;
  emailNotifications?: boolean;
  pushEnabled?: boolean;
  /** Product updates & promos (separate from premiere reminder emails). */
  marketingEmails?: boolean;
  /** Mini player / overlay when using other apps (native or PiP when available). */
  displayOverApps?: boolean;
  /** When to remind before a ticketed premiere. */
  premiereReminderLead?: "1m" | "5m" | "10m" | "20m" | "30m" | "1h" | "24h" | "day" | "off";
  /** Who can start DMs: everyone | followers | none */
  dmPrivacy?: "everyone" | "followers" | "none";
  /** When enabled, non-followers only see a limited public profile preview. */
  profileLocked?: boolean;
  trailerAutoplay?: boolean;
  dataSaver?: boolean;
  /** Show premiere times in viewer local timezone. */
  showtimesLocal?: boolean;
  /** Demo in-app coins for gifts & tips. */
  coinBalance?: number;
  /** Supabase email confirmation; local/demo auth treats as verified. */
  emailVerified?: boolean;
  creatorVerificationStatus?: CreatorVerificationStatus;
  verificationMessage?: string;
  verificationRequestedAt?: string;
  verifiedAt?: string;
};
