import type {
  PremiereEvent,
  CommunityPost,
  FilmDataState,
  ScheduledLive,
  StoryClip,
  Title,
  TitleReview,
  UploadAsset,
} from "../domain/types";
import { activeStories } from "./stories";

export type UserFeedKind =
  | "post"
  | "review"
  | "upload"
  | "title"
  | "premiere"
  | "live"
  | "story";

export type UserFeedItem = {
  id: string;
  kind: UserFeedKind;
  createdAt: string;
  post?: CommunityPost;
  review?: TitleReview;
  upload?: UploadAsset;
  title?: Title;
  premiere?: PremiereEvent;
  live?: ScheduledLive;
  story?: StoryClip;
  contextLabel?: string;
};

export type UserFeedFilter = "all" | UserFeedKind;

export function buildUserFeed(state: FilmDataState, userId: string): UserFeedItem[] {
  const titleById = new Map(state.titles.map((t) => [t.id, t]));
  const titleBySlug = new Map(state.titles.map((t) => [t.slug, t]));
  const ownedTitleIds = new Set(
    state.titles.filter((t) => t.ownerId === userId).map((t) => t.id),
  );

  const items: UserFeedItem[] = [];

  for (const story of activeStories(state.stories ?? []).filter((s) => s.authorId === userId)) {
    items.push({
      id: `story-${story.id}`,
      kind: "story",
      createdAt: story.createdAt,
      story,
    });
  }

  for (const post of state.posts.filter((p) => p.authorId === userId)) {
    const title = titleBySlug.get(post.titleSlug);
    items.push({
      id: `post-${post.id}`,
      kind: "post",
      createdAt: post.createdAt,
      post,
      contextLabel: title ? title.name : post.titleSlug,
    });
  }

  for (const review of state.reviews.filter((r) => r.userId === userId)) {
    const title = titleById.get(review.titleId);
    items.push({
      id: `review-${review.id}`,
      kind: "review",
      createdAt: review.createdAt,
      review,
      contextLabel: title?.name,
    });
  }

  for (const upload of state.uploads.filter((u) => ownedTitleIds.has(u.titleId))) {
    const title = titleById.get(upload.titleId);
    items.push({
      id: `upload-${upload.id}`,
      kind: "upload",
      createdAt: upload.createdAt,
      upload,
      contextLabel: title?.name,
    });
  }

  for (const title of state.titles.filter((t) => t.ownerId === userId)) {
    items.push({
      id: `title-${title.id}`,
      kind: "title",
      createdAt: title.createdAt,
      title,
    });
  }

  for (const ev of state.premiereEvents.filter((c) => c.ownerId === userId)) {
    items.push({
      id: `premiere-${ev.id}`,
      kind: "premiere",
      createdAt: ev.createdAt,
      premiere: ev,
      contextLabel: ev.titleName,
    });
  }

  for (const live of state.scheduledLives.filter((l) => l.ownerId === userId)) {
    items.push({
      id: `live-${live.id}`,
      kind: "live",
      createdAt: live.startsAt,
      live,
      contextLabel: live.title,
    });
  }

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function filterUserFeed(items: UserFeedItem[], filter: UserFeedFilter): UserFeedItem[] {
  if (filter === "all") return items;
  return items.filter((i) => i.kind === filter);
}

export function feedKindLabel(kind: UserFeedKind): string {
  switch (kind) {
    case "post":
      return "Community post";
    case "review":
      return "Review";
    case "upload":
      return "Upload";
    case "title":
      return "Title";
    case "premiere":
      return "Premiere";
    case "live":
      return "Scheduled live";
    case "story":
      return "Clip";
  }
}
