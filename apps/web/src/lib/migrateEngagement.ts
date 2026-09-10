import type { ContentLike, FilmDataState } from "../domain/types";

export function withEngagementMigrated(state: FilmDataState): FilmDataState {
  let contentLikes = state.contentLikes ?? [];
  if (contentLikes.length === 0 && (state.postLikes?.length ?? 0) > 0) {
    contentLikes = state.postLikes.map(
      (l): ContentLike => ({
        userId: l.userId,
        targetType: "post",
        targetId: l.postId,
        createdAt: l.createdAt,
      }),
    );
  }
  return {
    ...state,
    events: state.events ?? [],
    contentLikes,
    comments: state.comments ?? [],
    bookmarks: state.bookmarks ?? [],
    postLikes: [],
  };
}
