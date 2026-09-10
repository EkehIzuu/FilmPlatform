import { Link } from "react-router-dom";
import { useFilmData } from "../context/FilmDataContext";
import { useRegionFilter } from "../hooks/useRegionFilter";
import { filterTitlesByRegion } from "../lib/premiereEngagement";
import { featuredTrailerTitles } from "../lib/filmJourney";

export function FeaturedTrailersSection() {
  const { state } = useFilmData();
  const { region } = useRegionFilter();
  const titles = filterTitlesByRegion(featuredTrailerTitles(state), region);

  if (titles.length === 0) return null;

  return (
    <section className="featured-trailers-section">
      <div className="premiere-strip-head">
        <h2 className="section-label">Featured films</h2>
        <p className="small muted">Trailers &amp; synopses — tap to buy tickets or save</p>
      </div>
      <ul className="featured-trailers-strip">
        {titles.map((t) => (
          <li key={t.id}>
            <Link to={`/title/${t.slug}`} className="featured-trailer-card">
              <strong>{t.name}</strong>
              <span className="small muted">
                {t.genre ?? (t.kind === "series" ? "Series" : "Film")}
                {t.accessMode === "paid" ? " · Paid" : " · Free"}
              </span>
              <span className="featured-trailer-cta small">View film →</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
