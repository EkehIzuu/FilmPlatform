import { Link } from "react-router-dom";
import { BackLink } from "../components/BackLink";
import { PageHeader } from "../components/PageHeader";
import { useFilmData } from "../context/FilmDataContext";

export function Saved() {
  const { listMyBookmarks, state } = useFilmData();
  const bookmarks = listMyBookmarks();

  const rows = bookmarks.map((b) => {
    if (b.targetType === "title") {
      const title = state.titles.find((t) => t.id === b.targetId);
      if (!title) return null;
      return {
        key: `title-${b.targetId}`,
        href: `/title/${title.slug}`,
        label: title.name,
        meta: "Title · Watch later",
      };
    }
    const ep = state.episodes.find((e) => e.id === b.targetId);
    const title = ep ? state.titles.find((t) => t.id === ep.titleId) : undefined;
    if (!ep || !title) return null;
    return {
      key: `ep-${b.targetId}`,
      href: `/title/${title.slug}/episode/${ep.id}`,
      label: `${title.name} · ${ep.label}`,
      meta: ep.name,
    };
  }).filter(Boolean) as { key: string; href: string; label: string; meta: string }[];

  return (
    <div className="page">
      <PageHeader title="Saved" subtitle="Watch later — titles and episodes you bookmarked." />
      <BackLink to="/profile" className="back-link--flush">
        Profile
      </BackLink>

      {rows.length === 0 ? (
        <p className="muted small" style={{ marginTop: "1rem" }}>
          Nothing saved yet. Tap <strong>Save</strong> on a title or episode to add it here.
        </p>
      ) : (
        <ul className="studio-library-list" style={{ marginTop: "1rem" }}>
          {rows.map((row) => (
            <li key={row.key}>
              <Link to={row.href} className="studio-library-row">
                <span>
                  <strong>{row.label}</strong>
                  <span className="small muted"> · {row.meta}</span>
                </span>
                <span className="small">Play →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
