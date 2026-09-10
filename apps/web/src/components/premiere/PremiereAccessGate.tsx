import { Link } from "react-router-dom";
import type { PremiereEvent, Title, User } from "../../domain/types";
import { getPremiereTimeline } from "../../domain/premiereSync";
import { PremiereStackBar } from "../PremiereStackBar";
import { PremiereShareCodeBox } from "./PremiereShareCodeBox";
import { isPaystackConfigured } from "../../services/payments";
import {
  formatShowtime,
  getPhaseStatusLine,
} from "@/features/premiere/lib/premiereStatusCopy";
import { PremiereRecoveryBanner } from "./PremiereRecoveryBanner";

type Props = {
  event: PremiereEvent;
  title?: Title;
  owner: User | null;
  userEmail?: string;
  ticketQty: number;
  onTicketQtyChange: (n: number) => void;
  checkoutBusy: boolean;
  checkoutError: string;
  checkoutSuccess?: string;
  shareCode: string | null;
  onBuy: () => void;
  returnTo?: string;
};

export function PremiereAccessGate({
  event,
  title,
  owner,
  userEmail,
  ticketQty,
  onTicketQtyChange,
  checkoutBusy,
  checkoutError,
  checkoutSuccess,
  shareCode,
  onBuy,
  returnTo,
}: Props) {
  const tl = getPremiereTimeline(event);
  const showtime = formatShowtime(event.featureStartsAt);
  const ended = tl.phase === "ended";

  return (
    <div className="page page-premiere premiere-access-gate">
      <header className="premiere-access-header">
        <p className="premiere-hero-eyebrow">Ticket required</p>
        <h1 className="premiere-access-title">{event.titleName}</h1>
        <p className="small muted">
          Showtime {showtime} · {getPhaseStatusLine(tl)}
        </p>
      </header>

      <PremiereStackBar event={event} owner={owner} compact />

      {ended ? (
        <PremiereRecoveryBanner
          variant="info"
          message="This screening has ended. Tickets are no longer sold for this showtime."
          actions={[
            { label: "My tickets", to: "/watch/tickets", primary: true },
            { label: "Browse premieres", to: "/watch/premiere" },
            ...(title?.slug
              ? [{ label: "Watch on profile", to: `/title/${title.slug}/watch` }]
              : []),
          ]}
        />
      ) : (
        <div className="card premiere-gate premiere-access-card">
          <p className="muted">
            {(event.priceCents / 100).toFixed(2)} {event.currency} per ticket · {event.capacity}{" "}
            seats · You unlock entry at showtime in My tickets.
          </p>
          {userEmail ? (
            <div className="premiere-buy-col">
              <label className="small">
                Tickets
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={ticketQty}
                  onChange={(e) => onTicketQtyChange(Number(e.target.value) || 1)}
                />
              </label>
              <button
                type="button"
                className="btn-premiere"
                disabled={checkoutBusy}
                onClick={onBuy}
              >
                {checkoutBusy
                  ? "Processing…"
                  : event.priceCents === 0
                    ? "Reserve free seat"
                    : `Buy tickets (${((event.priceCents * ticketQty) / 100).toFixed(2)} ${event.currency})`}
              </button>
              {shareCode ? (
                <PremiereShareCodeBox code={shareCode} titleName={event.titleName} source="gate" />
              ) : null}
            </div>
          ) : (
            <PremiereRecoveryBanner
              variant="info"
              message="Sign in to buy a ticket for this screening."
              actions={[
                { label: "Sign in", to: returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login", primary: true },
                { label: "Create account", to: returnTo ? `/signup?next=${encodeURIComponent(returnTo)}` : "/signup" },
                { label: "Redeem share code", to: "/premiere/join" },
              ]}
            />
          )}
          <p className="small muted">
            {isPaystackConfigured()
              ? "Secure Paystack checkout — your ticket is saved after verification."
              : "Demo checkout — your ticket is saved on this device."}
          </p>
          {checkoutError ? (
            <PremiereRecoveryBanner
              variant="error"
              message={checkoutError}
              actions={[
                { label: "My tickets", to: "/watch/tickets", primary: true },
                { label: "Browse premieres", to: "/watch/premiere" },
              ]}
            />
          ) : null}
          {checkoutSuccess ? (
            <PremiereRecoveryBanner
              variant="success"
              message={checkoutSuccess}
              actions={[
                { label: "Open My tickets", to: "/watch/tickets", primary: true },
                { label: "Enter screening", to: `/premiere/${event.id}` },
              ]}
            />
          ) : null}
        </div>
      )}

      {title?.slug ? (
        <Link to={`/title/${title.slug}`} className="text-link small">
          ← Film details &amp; trailer
        </Link>
      ) : null}
    </div>
  );
}
