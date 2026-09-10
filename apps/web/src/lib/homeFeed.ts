import type { FilmDataState } from "../domain/types";
import {
  feedKindLabel,
  filterUserFeed,
  type UserFeedFilter,
  type UserFeedItem,
} from "./userFeed";
import { activeStories } from "./stories";

export type { UserFeedFilter, UserFeedItem };
export { feedKindLabel, filterUserFeed };

/** Feed from followed creators (users + title owners) and followed title hubs. */
export function buildFollowingFeed(
  state: FilmDataState,
  userId: string,
): UserFeedItem[] {
  const followedUserIds = new Set(
    state.follows
      .filter((f) => f.followerId === userId && f.targetType === "user")
      .map((f) => f.targetId),
  );
  const followedTitleIds = new Set(
    state.follows
      .filter((f) => f.followerId === userId && f.targetType === "title")
      .map((f) => f.targetId),
  );
  const followedSlugs = new Set(
    state.titles.filter((t) => followedTitleIds.has(t.id)).map((t) => t.slug),
  );

  for (const tid of followedTitleIds) {
    const t = state.titles.find((x) => x.id === tid);
    if (t?.ownerId) followedUserIds.add(t.ownerId);
  }

  const titleById = new Map(state.titles.map((t) => [t.id, t]));
  const titleBySlug = new Map(state.titles.map((t) => [t.slug, t]));
  const items: UserFeedItem[] = [];

  for (const story of activeStories(state.stories ?? [])) {
    if (!followedUserIds.has(story.authorId)) continue;
    items.push({
      id: `feed-story-${story.id}`,
      kind: "story",
      createdAt: story.createdAt,
      story,
      contextLabel: story.authorName,
    });
  }

  for (const post of state.posts) {
    const fromAuthor = followedUserIds.has(post.authorId);
    const fromTitle = followedSlugs.has(post.titleSlug);
    if (!fromAuthor && !fromTitle) continue;
    const title = titleBySlug.get(post.titleSlug);
    items.push({
      id: `feed-post-${post.id}`,
      kind: "post",
      createdAt: post.createdAt,
      post,
      contextLabel: title?.name ?? post.titleSlug,
    });
  }

  for (const live of state.scheduledLives) {
    if (!followedUserIds.has(live.ownerId)) continue;
    if (new Date(live.startsAt) < new Date()) continue;
    items.push({
      id: `feed-live-${live.id}`,
      kind: "live",
      createdAt: live.startsAt,
      live,
      contextLabel: live.title,
    });
  }

  for (const ev of state.premiereEvents) {
    if (!followedUserIds.has(ev.ownerId)) continue;
    if (new Date(ev.featureStartsAt) < new Date(Date.now() - 86400000)) continue;
    items.push({
      id: `feed-premiere-${ev.id}`,
      kind: "premiere",
      createdAt: ev.featureStartsAt,
      premiere: ev,
      contextLabel: ev.titleName,
    });
  }

  for (const review of state.reviews) {
    if (!followedUserIds.has(review.userId)) continue;
    const title = titleById.get(review.titleId);
    if (title && !followedTitleIds.has(title.id) && !followedUserIds.has(review.userId)) continue;
    items.push({
      id: `feed-review-${review.id}`,
      kind: "review",
      createdAt: review.createdAt,
      review,
      contextLabel: title?.name,
    });
  }

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
