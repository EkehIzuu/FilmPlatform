import { Link } from "react-router-dom";
import { useFilmData } from "../context/FilmDataContext";
import { useRegionFilter } from "../hooks/useRegionFilter";
import { filterTitlesByRegion } from "../lib/premiereEngagement";
import { watchAnytimeTitles } from "../lib/premiereCatalog";

export function WatchAnytimeSection() {
  const { state } = useFilmData();
  const { region } = useRegionFilter();
  const titles = filterTitlesByRegion(watchAnytimeTitles(state), region).slice(0, 6);

  if (titles.length === 0) return null;

  return (
    <section className="watch-anytime-section">
      <div className="premiere-strip-head">
        <h2 className="section-label">Now showing</h2>
        <p className="small muted">After opening night — free or rent on creator profiles</p>
        <Link to="/explore" className="text-link small">
          Discover all
        </Link>
      </div>
      <div className="explore-grid watch-anytime-grid">
        {titles.map((t) => (
          <Link key={t.id} to={`/title/${t.slug}`} className="explore-card">
            <h3 className="watch-anytime-title">{t.name}</h3>
            <p className="small muted">
              {t.accessMode === "paid"
                ? `Rent on profile`
                : "Free on profile"}
              {t.kind === "series" ? " · Series" : " · Movie"}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
