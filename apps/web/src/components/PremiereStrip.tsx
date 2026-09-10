import { Link } from "react-router-dom";
import { useFilmData } from "../context/FilmDataContext";
import { useRegionFilter } from "../hooks/useRegionFilter";
import { filterPremiereCardsByRegion } from "../lib/premiereEngagement";
import { listPremiereCards } from "../lib/premiereCatalog";
import { formatMoney } from "../lib/monetization";

export function PremiereStrip() {
  const { state } = useFilmData();
  const { region } = useRegionFilter();
  const cards = filterPremiereCardsByRegion(
    listPremiereCards(state).filter((c) => !c.isEnded),
    region,
  ).slice(0, 6);
  if (cards.length <= 1) return null;

  return (
    <section className="premiere-strip-section">
      <div className="premiere-strip-head">
        <h2 className="section-label">Upcoming premieres</h2>
        <Link to="/watch/premiere" className="text-link small">
          See all
        </Link>
      </div>
      <ul className="premiere-strip">
        {cards.map(({ event, countdownLabel, isLive }) => (
          <li key={event.id}>
            <Link to={`/premiere/${event.id}`} className="premiere-strip-card">
              <span className={isLive ? "premiere-strip-live" : "premiere-strip-soon"}>
                {isLive ? "LIVE" : "SOON"}
              </span>
              <strong>{event.titleName}</strong>
              <span className="small muted">{countdownLabel}</span>
              <span className="small">{formatMoney(event.priceCents, event.currency)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
