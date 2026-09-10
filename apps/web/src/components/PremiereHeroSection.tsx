import { Link } from "react-router-dom";
import { useFilmData } from "../context/FilmDataContext";
import { useRegionFilter } from "../hooks/useRegionFilter";
import { filterPremiereCardsByRegion } from "../lib/premiereEngagement";
import { upcomingPremieres } from "../lib/premiereCatalog";
import { formatShowtime } from "@/features/premiere/lib/premiereStatusCopy";
import { formatMoney } from "../lib/monetization";
import { PremiereShareBox } from "./premiere/PremiereShareBox";

export function PremiereHeroSection() {
  const { state, premiereReservationCount } = useFilmData();
  const { region } = useRegionFilter();
  const cards = filterPremiereCardsByRegion(upcomingPremieres(state), region);
  const hero = cards.find((c) => c.isLive) ?? cards.find((c) => c.isUpcoming) ?? cards[0];

  if (!hero) {
    return (
      <section className="premiere-hero premiere-hero--empty card">
        <p className="premiere-hero-eyebrow">Digital premiere</p>
        <h1 className="premiere-hero-title">Opening nights, online</h1>
        <p className="small muted">
          {region
            ? `No premieres in ${region} right now — try Global or Discover.`
            : "Ticketed premieres with a synced curtain — then films live on creator profiles."}
        </p>
        <Link to="/watch/premiere" className="auth-submit premiere-hero-cta">
          Browse premieres
        </Link>
      </section>
    );
  }

  const { event } = hero;
  const taken = premiereReservationCount(event.id);
  const price = formatMoney(event.priceCents, event.currency);

  return (
    <section className="premiere-hero card">
      <p className="premiere-hero-eyebrow">
        {hero.isLive ? "● Live premiere" : "Upcoming premiere"}
      </p>
      <h1 className="premiere-hero-title">{event.titleName}</h1>
      <p className="premiere-hero-countdown">{hero.countdownLabel}</p>
      <p className="small muted premiere-hero-meta">
        {formatShowtime(event.featureStartsAt)}
        {" · "}
        {price} · {taken}/{event.capacity} tickets
      </p>
      <div className="premiere-hero-actions">
        <Link to={`/premiere/${event.id}`} className="auth-submit premiere-hero-cta">
          {hero.isLive ? "Join premiere" : "Buy ticket"}
        </Link>
        {hero.title?.slug ? (
          <Link to={`/title/${hero.title.slug}`} className="btn-secondary">
            Film details
          </Link>
        ) : null}
        <Link to="/watch/premiere" className="btn-secondary">
          All premieres
        </Link>
      </div>
      <PremiereShareBox
        eventId={event.id}
        titleName={event.titleName}
        featureStartsAt={event.featureStartsAt}
        source="home"
      />
    </section>
  );
}
