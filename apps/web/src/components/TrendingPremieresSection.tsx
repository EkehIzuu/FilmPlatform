import { Link } from "react-router-dom";
import { useFilmData } from "../context/FilmDataContext";
import { useRegionFilter } from "../hooks/useRegionFilter";
import { trendingPremiereCards } from "../lib/premiereEngagement";
import { formatMoney } from "../lib/monetization";

export function TrendingPremieresSection() {
  const { state, premiereReservationCount } = useFilmData();
  const { region } = useRegionFilter();
  const cards = trendingPremiereCards(state, premiereReservationCount, region, 5);

  if (cards.length === 0) return null;

  return (
    <section className="trending-premieres-section">
      <div className="premiere-strip-head">
        <h2 className="section-label">Trending premieres</h2>
        <p className="small muted">Tickets sold &amp; buzz{region ? ` · ${region}` : ""}</p>
      </div>
      <ol className="trending-premieres-list">
        {cards.map((card, i) => {
          const sold = premiereReservationCount(card.event.id);
          return (
            <li key={card.event.id}>
              <Link to={`/premiere/${card.event.id}`} className="trending-premiere-row">
                <span className="trending-premiere-rank" aria-hidden>
                  {i + 1}
                </span>
                <span className="trending-premiere-body">
                  <strong>{card.event.titleName}</strong>
                  <span className="small muted">
                    {card.countdownLabel}
                    {" · "}
                    {formatMoney(card.event.priceCents, card.event.currency)}
                    {sold > 0 ? ` · ${sold} tickets` : ""}
                  </span>
                </span>
                <span className="trending-premiere-cta small">
                  {card.isLive ? "Join" : "Tickets"}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
