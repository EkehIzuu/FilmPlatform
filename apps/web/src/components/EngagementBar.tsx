import type { BookmarkTargetType, EngagementTargetType } from "../domain/types";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";

type Props = {
  targetType: EngagementTargetType;
  targetId: string;
  showBookmark?: boolean;
  bookmarkType?: BookmarkTargetType;
  compact?: boolean;
};

export function EngagementBar({
  targetType,
  targetId,
  showBookmark = false,
  bookmarkType,
  compact = false,
}: Props) {
  const { user } = useAuth();
  const { toggleLike, likeCount, userLiked, toggleBookmark, isBookmarked } = useFilmData();

  const liked = userLiked(targetType, targetId);
  const count = likeCount(targetType, targetId);
  const bType = bookmarkType ?? (targetType === "episode" ? "episode" : "title");
  const canBookmark =
    showBookmark && (targetType === "title" || targetType === "episode") && !!user;
  const saved = canBookmark && isBookmarked(bType, targetId);

  return (
    <div className={`engagement-bar${compact ? " engagement-bar--compact" : ""}`}>
      {user ? (
        <button
          type="button"
          className={liked ? "like-btn liked" : "like-btn"}
          onClick={() => toggleLike(targetType, targetId)}
          aria-pressed={liked}
        >
          ♥ {count > 0 ? count : "Like"}
        </button>
      ) : (
        <span className="like-btn like-btn--static muted small">♥ {count}</span>
      )}
      {canBookmark ? (
        <button
          type="button"
          className={saved ? "bookmark-btn bookmark-btn--saved" : "bookmark-btn"}
          onClick={() => toggleBookmark(bType, targetId)}
          aria-pressed={saved}
          title={saved ? "Remove from saved" : "Save for later"}
        >
          {saved ? "★ Saved" : "☆ Save"}
        </button>
      ) : null}
    </div>
  );
}
