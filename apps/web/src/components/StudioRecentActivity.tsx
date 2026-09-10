import { Link } from "react-router-dom";
import { livePathForScheduled } from "../lib/livePaths";
import { feedKindLabel, type UserFeedItem } from "../lib/userFeed";

type Props = {
  items: UserFeedItem[];
};

function itemHref(item: UserFeedItem): string | undefined {
  if (item.story) return `/clips?user=${encodeURIComponent(item.story.authorId)}`;
  if (item.post && item.contextLabel) return `/title/${item.post.titleSlug}`;
  if (item.live) return livePathForScheduled(item.live);
  if (item.premiere) return `/premiere/${item.premiere.id}`;
  if (item.title) return `/title/${item.title.slug}`;
  return undefined;
}

export function StudioRecentActivity({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <section className="studio-recent">
      <h2 className="studio-tools-section-label">Recent activity</h2>
      <ul className="studio-recent-list">
        {items.map((item) => {
          const href = itemHref(item);
          const label = item.contextLabel ?? feedKindLabel(item.kind);
          const inner = (
            <>
              <span className="pill">{feedKindLabel(item.kind)}</span>
              <span className="studio-recent-text">{label}</span>
              <time className="small muted">
                {new Date(item.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </time>
            </>
          );
          return (
            <li key={item.id}>
              {href ? (
                <Link to={href} className="studio-recent-row">
                  {inner}
                </Link>
              ) : (
                <div className="studio-recent-row">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
