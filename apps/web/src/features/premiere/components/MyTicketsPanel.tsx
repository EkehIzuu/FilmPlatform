import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useFilmData } from "@/context/FilmDataContext";
import { formatMoney } from "@/lib/monetization";
import { PremiereShareCodeBox } from "@/components/premiere/PremiereShareCodeBox";
import { buildMyTicketRows, splitTicketRows } from "../lib/myTickets";
import { formatShowtime } from "../lib/premiereStatusCopy";

type Props = {
  compact?: boolean;
  showHeader?: boolean;
};

export function MyTicketsPanel({ compact, showHeader = true }: Props) {
  const { user } = useAuth();
  const { state } = useFilmData();

  if (!user) {
    return (
      <div className="card my-tickets-empty">
        <p className="muted small">Sign in to see your premiere tickets.</p>
        <Link to="/login" className="auth-submit">
          Sign in
        </Link>
      </div>
    );
  }

  const rows = buildMyTicketRows(state, user.id);
  const { upcoming, past } = splitTicketRows(rows);

  if (rows.length === 0) {
    return (
      <div className="card my-tickets-empty">
        <p className="muted small">No tickets yet — browse opening nights and buy a seat.</p>
        <Link to="/watch/premiere" className="btn-secondary">
          Browse premieres
        </Link>
      </div>
    );
  }

  const renderRow = (row: (typeof rows)[0]) => {
    const { event, reservation, title, statusLabel, canJoin, canWatchProfile, phase } = row;
    const tickets = reservation.ticketCount ?? 1;
    const redeemed = reservation.ticketsRedeemed ?? 1;
    const shareLeft = reservation.shareCode ? tickets - redeemed : 0;

    return (
      <li key={reservation.id} className="card my-ticket-row">
        <div className="my-ticket-row-main">
          <span
            className={
              phase === "feature" || phase === "ads"
                ? "premiere-strip-live"
                : phase === "ended"
                  ? "small muted"
                  : "premiere-strip-soon"
            }
          >
            {statusLabel}
          </span>
          <strong className="my-ticket-title">{event.titleName}</strong>
          <p className="small muted">
            Showtime {formatShowtime(event.featureStartsAt)}
            {" · "}
            {formatMoney(reservation.amountCents, event.currency)}
            {tickets > 1 ? ` · ${tickets} seats` : " · 1 seat"}
          </p>
          <p className="small premiere-ticket-access-hint">
            {phase === "ended"
              ? "Access ended with curtain."
              : phase === "feature" || phase === "ads"
                ? "Your seat is active — join now."
                : "Your seat unlocks at showtime — open when countdown reaches zero."}
          </p>
          {reservation.shareCode && shareLeft > 0 ? (
            <div>
              <p className="small muted">Share seats left: {shareLeft}</p>
              <PremiereShareCodeBox code={reservation.shareCode} titleName={event.titleName} source="tickets" />
            </div>
          ) : null}
        </div>
        <div className="my-ticket-actions">
          {canJoin ? (
            <Link to={`/premiere/${event.id}`} className="auth-submit my-ticket-cta">
              {phase === "feature" || phase === "ads" ? "Join screening" : "Open ticket"}
            </Link>
          ) : phase === "ended" ? (
            <>
              {canWatchProfile && title?.slug ? (
                <Link to={`/title/${title.slug}/watch`} className="auth-submit my-ticket-cta">
                  Watch on profile
                </Link>
              ) : null}
              <Link to="/watch/premiere" className="btn-secondary">
                Browse premieres
              </Link>
            </>
          ) : null}
          {title?.slug && canJoin ? (
            <Link to={`/title/${title.slug}`} className="btn-secondary">
              Film page
            </Link>
          ) : null}
        </div>
      </li>
    );
  };

  if (compact) {
    return (
      <section className="my-tickets-strip-section">
        {showHeader ? (
          <div className="premiere-strip-head">
            <h2 className="section-label">My tickets</h2>
            <Link to="/my-tickets" className="text-link small">
              All tickets
            </Link>
          </div>
        ) : null}
        <ul className="premiere-strip">
          {upcoming.slice(0, 4).map((row) => (
            <li key={row.reservation.id}>
              <Link
                to={`/premiere/${row.event.id}`}
                className="premiere-strip-card premiere-strip-card--owned"
              >
                <span
                  className={
                    row.phase === "feature" || row.phase === "ads"
                      ? "premiere-strip-live"
                      : "premiere-strip-soon"
                  }
                >
                  {row.phase === "feature" ? "ON NOW" : row.phase === "ads" ? "PRE-SHOW" : "TICKET"}
                </span>
                <strong>{row.event.titleName}</strong>
                <span className="small muted">{row.statusLabel}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <div className="my-tickets-panel">
      {upcoming.length > 0 ? (
        <section>
          <h2 className="section-label">Upcoming &amp; live</h2>
          <ul className="my-tickets-list">{upcoming.map(renderRow)}</ul>
        </section>
      ) : null}
      {past.length > 0 ? (
        <section style={{ marginTop: "1.25rem" }}>
          <h2 className="section-label">Past premieres</h2>
          <p className="small muted">Watch the film on the creator profile if they left it up.</p>
          <ul className="my-tickets-list">{past.map(renderRow)}</ul>
        </section>
      ) : null}
    </div>
  );
}
