import { Link } from "react-router-dom";
import { PremiereStackBar } from "../components/PremiereStackBar";
import { PremiereRecoveryBanner } from "../components/premiere/PremiereRecoveryBanner";
import { PremiereShareCodeBox } from "../components/premiere/PremiereShareCodeBox";
import { PageHeader } from "../components/PageHeader";
import { useFilmData } from "../context/FilmDataContext";
import { useAuth } from "../context/AuthContext";
import { getPremiereTimeline } from "../domain/premiereSync";
import {
  checkoutErrorMessage,
  formatShowtime,
  getPhaseStatusLine,
  reserveErrorMessage,
  ticketEntitlementSummary,
} from "@/features/premiere/lib/premiereStatusCopy";
import { canViewTitle } from "../lib/ageGate";
import { checkoutPremiereTicket } from "../services/payments";
import { useEffect, useState } from "react";
import { loadPremiereAttribution, parsePremiereAttribution, storePremiereAttribution } from "@/features/premiere/lib/premiereAttribution";

type Props = {
  embedded?: boolean;
};

export function PremiereList({ embedded = false }: Props) {
  const {
    listPremiereEvents,
    premiereReservationCount,
    hasPremiereAccess,
    reservePremiereSeat,
    togglePremiereReminder,
    hasPremiereReminder,
    state,
    trackEvent,
  } = useFilmData();
  const { user } = useAuth();
  const events = listPremiereEvents();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [ticketQty, setTicketQty] = useState<Record<string, number>>({});
  const [shareCodes, setShareCodes] = useState<Record<string, string>>({});
  const [checkoutSuccessByEvent, setCheckoutSuccessByEvent] = useState<Record<string, string>>({});
  const [checkoutErrorByEvent, setCheckoutErrorByEvent] = useState<Record<string, string>>({});
  const [attributionSeen, setAttributionSeen] = useState(false);

  // Capture attribution on list page too (e.g. if someone lands here first).
  useEffect(() => {
    if (attributionSeen) return;
    const attrib = parsePremiereAttribution(window.location.search);
    if (attrib.src || attrib.ref || attrib.code) {
      // We don't have an event id here, store globally under a sentinel.
      storePremiereAttribution("list", attrib);
    }
    setAttributionSeen(true);
  }, [attributionSeen]);

  const reserveWithCheckout = async (eventId: string) => {
    if (!user) return;
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return;
    const qty = Math.max(1, Math.min(10, ticketQty[eventId] ?? 1));
    setBusyId(eventId);
    setCheckoutErrorByEvent((s) => {
      const next = { ...s };
      delete next[eventId];
      return next;
    });
    try {
      const checkout = await checkoutPremiereTicket({
        email: user.email,
        amountCents: ev.priceCents * qty,
        currency: ev.currency,
        eventId: ev.id,
        eventTitle: ev.titleName,
        userId: user.id,
        ticketCount: qty,
      });
      if (!checkout.ok) {
        setCheckoutErrorByEvent((s) => ({
          ...s,
          [eventId]: checkoutErrorMessage(checkout.error),
        }));
        return;
      }
      const res = reservePremiereSeat(eventId, {
        reference: checkout.reference,
        status: checkout.demo ? "demo" : "paid",
        ticketCount: qty,
      });
      if (!res.ok) {
        setCheckoutErrorByEvent((s) => ({
          ...s,
          [eventId]: reserveErrorMessage(res.error),
        }));
        return;
      }
      if (res.shareCode) {
        setShareCodes((s) => ({ ...s, [eventId]: res.shareCode! }));
      }
      const msg = res.already
        ? `You already have a ticket for this screening.`
        : ticketEntitlementSummary(ev.titleName, qty, ev.featureStartsAt);
      setCheckoutSuccessByEvent((s) => ({ ...s, [eventId]: msg }));
      const attrib = loadPremiereAttribution(eventId);
      trackEvent("premiere_checkout", {
        eventId,
        reference: checkout.reference,
        demo: checkout.demo ?? false,
        ticketCount: qty,
        src: attrib.src,
        ref: attrib.ref,
        code: attrib.code,
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={embedded ? "watch-panel" : "page"}>
      {embedded ? null : (
        <PageHeader
          title="Premieres"
          subtitle="Ticketed synced showings — buy a seat, join at showtime, watch on profile after curtain."
        />
      )}
      {events.length === 0 ? (
        <div className="empty-state card">
          <p>No screenings scheduled yet.</p>
          <Link to="/" className="btn-secondary">
            Back to home
          </Link>
        </div>
      ) : (
        <ul className="premiere-list">
          {events.map((ev) => {
            const tl = getPremiereTimeline(ev);
            const taken = premiereReservationCount(ev.id);
            const soldOut = taken >= ev.capacity;
            const title = state.titles.find((t) => t.id === ev.titleId);
            const ageOk = title ? canViewTitle(user, title) : true;
            const access = hasPremiereAccess(ev.id) && ageOk;
            const showtime = formatShowtime(ev.featureStartsAt);

            return (
              <li key={ev.id} className="card premiere-card">
                <div className="premiere-card-main">
                  <h2>{ev.titleName}</h2>
                  <p className="muted small">{ev.description}</p>
                  <p className="small">
                    <strong>Showtime:</strong> {showtime}
                  </p>
                  <p className="small muted">
                    Pre-roll {Math.floor(ev.preRollAdSeconds / 60)} min · Seats {taken}/{ev.capacity}{" "}
                    · {(ev.priceCents / 100).toFixed(2)} {ev.currency}
                  </p>
                  <PremiereStackBar event={ev} compact />
                  <p className="premiere-phase small">{getPhaseStatusLine(tl)}</p>
                </div>
                <div className="premiere-card-actions">
                  {user ? (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => togglePremiereReminder(ev.id)}
                    >
                      {hasPremiereReminder(ev.id) ? "Reminder on" : "Remind me"}
                    </button>
                  ) : null}
                  {access ? (
                    <Link to={`/premiere/${ev.id}`} className="text-link">
                      {tl.phase === "ended"
                        ? "View screening room →"
                        : tl.phase === "lobby"
                          ? "Open ticket →"
                          : "Join screening →"}
                    </Link>
                  ) : !ageOk ? (
                    <PremiereRecoveryBanner
                      variant="warn"
                      message={`This screening is rated ${title?.minAge}+. Update your profile to verify age.`}
                      actions={[
                        { label: "Profile settings", to: "/profile/settings", primary: true },
                        { label: "Browse premieres", to: "/watch/premiere" },
                      ]}
                    />
                  ) : !user ? (
                    <PremiereRecoveryBanner
                      variant="info"
                      message="Sign in to buy a ticket for this showtime."
                      actions={[
                        { label: "Sign in", to: "/login", primary: true },
                        { label: "Redeem code", to: "/premiere/join" },
                      ]}
                    />
                  ) : tl.phase === "ended" ? (
                    <PremiereRecoveryBanner
                      variant="info"
                      message="This screening has ended. Tickets are no longer sold."
                      actions={[
                        { label: "My tickets", to: "/watch/tickets", primary: true },
                        { label: "Upcoming premieres", to: "/watch/premiere" },
                      ]}
                    />
                  ) : soldOut ? (
                    <PremiereRecoveryBanner
                      variant="warn"
                      message="Sold out. Check My tickets if you already purchased, or pick another premiere."
                      actions={[
                        { label: "My tickets", to: "/watch/tickets", primary: true },
                        { label: "Other premieres", to: "/watch/premiere" },
                      ]}
                    />
                  ) : (
                    <div className="premiere-buy-col">
                      <label className="small">
                        Tickets
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={ticketQty[ev.id] ?? 1}
                          onChange={(e) =>
                            setTicketQty((s) => ({
                              ...s,
                              [ev.id]: Number(e.target.value) || 1,
                            }))
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="btn-premiere"
                        disabled={busyId === ev.id}
                        onClick={() => void reserveWithCheckout(ev.id)}
                      >
                        {busyId === ev.id
                          ? "Processing…"
                          : `Buy tickets (${((ev.priceCents * (ticketQty[ev.id] ?? 1)) / 100).toFixed(2)} ${ev.currency})`}
                      </button>
                      {shareCodes[ev.id] ? (
                        <PremiereShareCodeBox code={shareCodes[ev.id]} titleName={ev.titleName} source="list" />
                      ) : null}
                      {checkoutErrorByEvent[ev.id] ? (
                        <PremiereRecoveryBanner
                          variant="error"
                          message={checkoutErrorByEvent[ev.id]}
                          actions={[
                            { label: "Try again", to: `/premiere/${ev.id}` },
                            { label: "My tickets", to: "/watch/tickets", primary: true },
                          ]}
                        />
                      ) : null}
                      {checkoutSuccessByEvent[ev.id] ? (
                        <PremiereRecoveryBanner
                          variant="success"
                          message={checkoutSuccessByEvent[ev.id]}
                          actions={[
                            { label: "Open My tickets", to: "/watch/tickets", primary: true },
                            { label: "Enter screening", to: `/premiere/${ev.id}` },
                          ]}
                        />
                      ) : null}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
