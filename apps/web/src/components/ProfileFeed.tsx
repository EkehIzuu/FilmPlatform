import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import {
  feedKindLabel,
  filterUserFeed,
  type UserFeedFilter,
  type UserFeedItem,
} from "../lib/userFeed";
import { livePathForScheduled } from "../lib/livePaths";
import { resolveMediaUrl } from "../services/mediaStorage";
import { CommentThread } from "./CommentThread";
import { EngagementBar } from "./EngagementBar";
import { UserAvatar } from "./UserAvatar";

type Props = {
  items: UserFeedItem[];
  filter: UserFeedFilter;
  emptyHint: string;
  showAuthor?: boolean;
  authorName?: string;
  authorAvatarUrl?: string;
  layout?: "list" | "grid";
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ProfileFeed({
  items,
  filter,
  emptyHint,
  showAuthor = false,
  authorName = "",
  authorAvatarUrl,
  layout = "list",
}: Props) {
  const { user } = useAuth();
  const { state } = useFilmData();
  const visible = filterUserFeed(items, filter);

  if (visible.length === 0) {
    return (
      <div className="profile-feed-empty">
        <p className="muted small">{emptyHint}</p>
        <p className="small">
          <Link to="/communities" className="text-link">
            Browse communities
          </Link>
          {user?.isCreator ? (
            <>
              {" "}
              ·{" "}
              <Link to="/creator/upload" className="text-link">
                Upload media
              </Link>
            </>
          ) : null}
        </p>
      </div>
    );
  }

  if (layout === "grid") {
    const clips = visible.filter((item) => item.kind === "story" && item.story);
    if (clips.length === 0) {
      return (
        <div className="profile-feed-empty">
          <p className="muted small">{emptyHint}</p>
        </div>
      );
    }
    return (
      <ul className="profile-ig-grid">
        {clips.map((item) => {
          const story = item.story!;
          const src = resolveMediaUrl(story.mediaUrl);
          return (
            <li key={item.id} className="profile-ig-grid-item">
              <Link to={`/watch/clips?user=${encodeURIComponent(story.authorId)}`} className="profile-ig-grid-link">
                {story.mediaType === "video" ? (
                  <video
                    className="profile-ig-grid-media"
                    src={src}
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img className="profile-ig-grid-media" src={src} alt="" loading="lazy" />
                )}
                {story.mediaType === "video" ? (
                  <span className="profile-ig-grid-badge" aria-hidden>
                    ▶
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="profile-feed-list">
      {visible.map((item) => (
        <li key={item.id} className="profile-feed-item">
          <div className="profile-feed-item-head">
            {showAuthor ? (
              <UserAvatar
                displayName={authorName}
                avatarUrl={authorAvatarUrl}
                size="sm"
              />
            ) : null}
            <div className="profile-feed-item-meta">
              <span className="pill">{feedKindLabel(item.kind)}</span>
              {item.contextLabel ? (
                <span className="muted small"> · {item.contextLabel}</span>
              ) : null}
              <span className="muted small profile-feed-when">{formatWhen(item.createdAt)}</span>
            </div>
          </div>

          {item.kind === "story" && item.story ? (
            <>
              <p className="post-body">{item.story.caption || "Clip"}</p>
              <div className="clips-media-wrap profile-feed-story-media">
                {item.story.mediaType === "video" ? (
                  <video
                    className="clips-media"
                    src={resolveMediaUrl(item.story.mediaUrl)}
                    controls
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img
                    className="clips-media"
                    src={resolveMediaUrl(item.story.mediaUrl)}
                    alt=""
                    loading="lazy"
                  />
                )}
              </div>
              <EngagementBar targetType="story" targetId={item.story.id} />
              <CommentThread targetType="story" targetId={item.story.id} />
              <Link
                to={`/clips?user=${encodeURIComponent(item.story.authorId)}`}
                className="text-link small"
              >
                View in Clips →
              </Link>
            </>
          ) : null}

          {item.kind === "post" && item.post ? (
            <>
              <p className="post-body">{item.post.body}</p>
              {item.post.titleSlug ? (
                <Link
                  to={`/communities/${item.post.titleSlug}`}
                  className="text-link small"
                >
                  View thread →
                </Link>
              ) : null}
              <EngagementBar targetType="post" targetId={item.post.id} />
              <CommentThread targetType="post" targetId={item.post.id} />
            </>
          ) : null}

          {item.kind === "review" && item.review ? (
            <>
              <p className="small">
                <strong>{item.review.rating}/5</strong>
                {item.contextLabel ? (
                  <span className="muted">
                    {" "}
                    ·{" "}
                    {(() => {
                      const title = state.titles.find((t) => t.id === item.review!.titleId);
                      return title ? (
                        <Link to={`/title/${title.slug}`} className="text-link">
                          {item.contextLabel}
                        </Link>
                      ) : (
                        item.contextLabel
                      );
                    })()}
                  </span>
                ) : null}
              </p>
              <p className="post-body">{item.review.body}</p>
            </>
          ) : null}

          {item.kind === "upload" && item.upload ? (
            <>
              <p className="small">
                <strong>{item.upload.fileName}</strong>
                <span className="pill" style={{ marginLeft: "0.35rem" }}>
                  {item.upload.kind}
                </span>
                <span className="muted"> · {item.upload.status}</span>
              </p>
              {item.upload.status === "ready" &&
              (item.upload.publicUrl || item.upload.storagePath) ? (
                <a
                  href={resolveMediaUrl(item.upload.publicUrl || item.upload.storagePath)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-link small"
                >
                  Open file →
                </a>
              ) : null}
            </>
          ) : null}

          {item.kind === "title" && item.title ? (
            <>
              <p className="post-body">
                <strong>{item.title.name}</strong>
                <span className="pill" style={{ marginLeft: "0.35rem" }}>
                  {item.title.status}
                </span>
              </p>
              {item.title.description ? (
                <p className="small muted">{item.title.description}</p>
              ) : null}
              <Link to={`/title/${item.title.slug}`} className="text-link small">
                View title →
              </Link>
            </>
          ) : null}

          {item.kind === "premiere" && item.premiere ? (
            <>
              <p className="post-body">
                <strong>{item.premiere.titleName}</strong>
              </p>
              <p className="small muted">
                Premiere {formatWhen(item.premiere.featureStartsAt)} ·{" "}
                {(item.premiere.priceCents / 100).toFixed(2)} {item.premiere.currency}
              </p>
              <Link to={`/premiere/${item.premiere.id}`} className="text-link small">
                Open screening →
              </Link>
            </>
          ) : null}

          {item.kind === "live" && item.live ? (
            <>
              <p className="post-body">
                <strong>{item.live.title}</strong>
              </p>
              <p className="small muted">{item.live.description || "Scheduled live session"}</p>
              <p className="small muted">Starts {formatWhen(item.live.startsAt)}</p>
              <Link to={livePathForScheduled(item.live)} className="text-link small">
                Join live →
              </Link>
            </>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
