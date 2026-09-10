import { Link } from "react-router-dom";
import { useFilmData } from "../context/FilmDataContext";
import { useRegionFilter } from "../hooks/useRegionFilter";
import { filterTitlesByRegion } from "../lib/premiereEngagement";

/** Film-promo clips only — stories from creators with published titles. */
export function TrailerClipsSection() {
  const { listActiveStories, state } = useFilmData();
  const { region } = useRegionFilter();

  const creatorIds = new Set(
    filterTitlesByRegion(
      state.titles.filter((t) => t.status === "published"),
      region,
    ).map((t) => t.ownerId),
  );

  const clips = listActiveStories()
    .filter((s) => creatorIds.has(s.authorId))
    .slice(0, 8);

  if (clips.length === 0) return null;

  return (
    <section className="trailer-clips-section">
      <div className="premiere-strip-head">
        <h2 className="section-label">Trailer clips</h2>
        <p className="small muted">Behind the scenes &amp; teasers — film promotion only</p>
        <Link to="/clips" className="text-link small">
          All clips
        </Link>
      </div>
      <ul className="trailer-clips-strip">
        {clips.map((s) => (
          <li key={s.id}>
            <Link to={`/clips?user=${encodeURIComponent(s.authorId)}`} className="trailer-clip-card">
              <span className="trailer-clip-author">{s.authorName}</span>
              <span className="small muted trailer-clip-caption">
                {s.caption?.slice(0, 60) ?? "Sneak peek"}
                {(s.caption?.length ?? 0) > 60 ? "…" : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
