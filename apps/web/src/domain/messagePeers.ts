import type { FilmDataState, MessagePeer } from "./types";

export function seedMessagePeers(): MessagePeer[] {
  return [
    {
      id: "fan-demo",
      displayName: "Kwesi",
      username: "kwesi",
      isCreator: false,
    },
    {
      id: "creator-amara",
      displayName: "Amara Okafor",
      username: "amara",
      isCreator: true,
    },
    {
      id: "__seed_creator__",
      displayName: "Demo Creator",
      username: "democreator",
      isCreator: true,
    },
  ];
}

/** Merge directory peers with authors seen in feed data. */
export function collectSearchablePeers(
  state: FilmDataState,
  excludeUserId: string,
): MessagePeer[] {
  const byId = new Map<string, MessagePeer>();

  for (const p of state.messagePeers ?? []) {
    if (p.id !== excludeUserId) byId.set(p.id, p);
  }

  for (const post of state.posts) {
    if (post.authorId === excludeUserId || byId.has(post.authorId)) continue;
    byId.set(post.authorId, {
      id: post.authorId,
      displayName: post.authorName,
    });
  }

  for (const review of state.reviews) {
    if (review.userId === excludeUserId || byId.has(review.userId)) continue;
    byId.set(review.userId, {
      id: review.userId,
      displayName: review.authorName,
    });
  }

  for (const story of state.stories ?? []) {
    if (story.authorId === excludeUserId || byId.has(story.authorId)) continue;
    byId.set(story.authorId, {
      id: story.authorId,
      displayName: story.authorName,
      avatarUrl: story.authorAvatarUrl,
    });
  }

  return [...byId.values()].sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );
}
