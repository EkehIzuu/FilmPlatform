import type {
  FilmDataState,
  Title,
  Episode,
  CommunityPost,
  ScheduledLive,
  PremiereEvent,
  TitleReview,
} from "./types";
import { newId } from "./id";
import { seedMessagePeers } from "./messagePeers";

const DEMO_OWNER = "__seed_creator__";

function seedTitles(ownerId: string): Title[] {
  const t1: Title = {
    id: newId(),
    slug: "midnight-crossing",
    name: "Midnight Crossing",
    kind: "series",
    description: "Family drama set across three generations - demo title in your local store.",
    ownerId,
    status: "published",
    genre: "Drama",
    region: "Global",
    listingBoost: "featured",
    minAge: 13,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  };
  const t2: Title = {
    id: newId(),
    slug: "the-last-premiere",
    name: "The Last Premiere",
    kind: "movie",
    description: "Indie thriller - fans can follow and join premiere lives.",
    ownerId,
    status: "published",
    genre: "Thriller",
    region: "Indie",
    minAge: 18,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  };
  return [t1, t2];
}

function seedReviews(titles: Title[]): TitleReview[] {
  const premiere = titles.find((t) => t.slug === "the-last-premiere");
  if (!premiere) return [];
  return [
    {
      id: newId(),
      titleId: premiere.id,
      userId: "fan-demo",
      authorName: "Maya",
      rating: 4,
      body: "Tight pacing - would watch again in Cinema.",
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
  ];
}

function seedEpisodes(titles: Title[]): Episode[] {
  const main = titles.find((t) => t.slug === "midnight-crossing");
  if (!main) return [];
  return [
    {
      id: newId(),
      titleId: main.id,
      label: "S1E1",
      name: "Opening night",
    },
    {
      id: newId(),
      titleId: main.id,
      label: "S1E2",
      name: "Crossroads",
    },
  ];
}

function seedPosts(titles: Title[]): CommunityPost[] {
  const main = titles.find((t) => t.slug === "midnight-crossing");
  if (!main) return [];
  return [
    {
      id: newId(),
      titleSlug: main.slug,
      authorId: "fan-demo",
      authorName: "Amina",
      body: "That ending - need a thread for theories only!",
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ];
}

export function createInitialState(ownerId: string = DEMO_OWNER): FilmDataState {
  const titles = seedTitles(ownerId);
  const episodes = seedEpisodes(titles);
  const posts = seedPosts(titles);
  const reviews = seedReviews(titles);
  const main = titles.find((t) => t.slug === "midnight-crossing");
  const scheduledLives: ScheduledLive[] = main
    ? [
        {
          id: newId(),
          titleId: main.id,
          title: main.name,
          startsAt: new Date(Date.now() + 86400000 * 2).toISOString(),
          roomId: "u-demo",
          ownerUsername: "demo",
          description: "Demo: cast Q&A (scheduled)",
          ownerId: main.ownerId,
        },
      ]
    : [];

  const premiere = new Date(Date.now() + 25 * 60 * 1000);
  const premiereEvents: PremiereEvent[] = main
    ? [
        {
          id: newId(),
          titleId: main.id,
          titleName: `${main.name}`,
          featureStartsAt: premiere.toISOString(),
          preRollAdSeconds: 300,
          adVideoUrl:
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
          featureVideoUrl:
            "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
          capacity: 500,
          priceCents: 799,
          currency: "USD",
          description:
            "Demo premiere: 5 min sponsored pre-roll, then the feature - everyone synced to the same clock (VOD, not WebRTC).",
          ownerId: main.ownerId,
          createdAt: new Date().toISOString(),
        },
      ]
    : [];

  return {
    titles,
    episodes,
    uploads: [],
    scheduledLives,
    posts,
    notifications: [],
    messagePeers: seedMessagePeers(),
    directConversations: [],
    directMessages: [],
    userBlocks: [],
    events: [],
    liveChatByRoom: {},
    premiereEvents,
    premiereReservations: [],
    reviews,
    follows: [],
    postLikes: [],
    contentLikes: [],
    comments: [],
    bookmarks: [],
    premiereReminders: [],
    reports: [],
    ledger: [],
    titleAccessGrants: [],
    premiereShareClaims: [],
    stories: [],
    dismissedStoryIds: [],
    featureFlags: {
      premiere: true,
      live: true,
      communities: true,
      explore: true,
      clips: true,
    },
  };
}
