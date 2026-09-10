import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import type { Title, User } from "../domain/types";
import { formatCountdown, getPremiereTimeline } from "../domain/premiereSync";
import { titleNeedsPayment } from "../lib/businessAnalytics";
import {
  findTitleTrailerUpload,
  getActivePremiereForTitle,
  resolveFilmJourneyStep,
} from "../lib/filmJourney";
import { findTitlePlaybackUpload } from "../lib/episodePlayback";
import { formatShowtime } from "@/features/premiere/lib/premiereStatusCopy";
import { formatMoney } from "../lib/monetization";
import { FilmJourneyBar } from "./FilmJourneyBar";
import { TrailerPlayer } from "./TrailerPlayer";

type Props = {
  title: Title;
  owner: User | null;
  allowed: boolean;
};

export function TitlePremierePanel({ title, owner, allowed }: Props) {
  const { user } = useAuth();
  const {
    state,
    hasPremiereAccess,
    hasPremiereReminder,
    togglePremiereReminder,
    hasTitleAccess,
    toggleBookmark,
    isBookmarked,
  } = useFilmData();

  const trailer = findTitleTrailerUpload(state, title);
  const premiere = getActivePremiereForTitle(state, title.id);
  const event = premiere?.event;
  const phase = premiere?.phase ?? "ended";
  const hasTicket = event ? hasPremiereAccess(event.id) : false;
  const paidWatch = titleNeedsPayment(title);
  const hasAccess = hasTitleAccess(title.id);
  const canWatchOnProfile =
    allowed && title.kind === "movie" && !!findTitlePlaybackUpload(state, title);
  const tl = event ? getPremiereTimeline(event) : null;
  const countdown =
    phase === "lobby" && tl
      ? tl.secondsUntilFeature > 3600
        ? formatCountdown(tl.secondsUntilFeature)
        : `Starts in ${formatCountdown(tl.secondsUntilFeature)}`
      : phase === "ads"
        ? "Pre-show rolling"
        : phase === "feature"
          ? "Premiere live now"
          : phase === "ended"
            ? "Premiere ended"
            : "";

  const activeStep = resolveFilmJourneyStep({
    hasPremiere: !!event && phase !== "ended",
    premiereEnded: phase === "ended",
    hasTicket,
    premiereLive: phase === "ads" || phase === "feature",
    inFeature: phase === "feature",
    canWatchOnProfile: canWatchOnProfile && (!paidWatch || hasAccess),
  });

  const saved = user ? isBookmarked("title", title.id) : false;
  const priceLabel =
    event && phase !== "ended"
      ? formatMoney(event.priceCents, event.currency)
      : paidWatch
        ? formatMoney(title.accessPriceCents ?? 0, title.accessCurrency ?? "USD")
        : "Free";

  return (
    <section className="title-premiere-panel card">
      <FilmJourneyBar activeStep={activeStep} compact />

      {trailer ? (
        <TrailerPlayer
          streamUrl={trailer.publicUrl || trailer.storagePath}
          label={`${title.name} trailer`}
          className="title-premiere-trailer"
        />
      ) : (
        <div className="title-premiere-trailer-placeholder">
          <p className="small muted">Trailer coming soon</p>
        </div>
      )}

      <div className="title-premiere-meta">
        <p className="title-premiere-price">
          <span className="pill pill-accent">{priceLabel}</span>
          {event && phase !== "ended" ? (
            <span className="small muted"> · Premiere ticket</span>
          ) : paidWatch ? (
            <span className="small muted"> · Profile rental</span>
          ) : (
            <span className="small muted"> · Watch on profile</span>
          )}
        </p>
        {event && phase !== "ended" ? (
          <p className="title-premiere-countdown">
            <strong>{countdown}</strong>
            <span className="small muted">
              {" · "}
              {formatShowtime(event.featureStartsAt)}
            </span>
          </p>
        ) : null}
      </div>

      {allowed ? (
        <div className="title-premiere-ctas">
          {event && phase !== "ended" ? (
            <>
              <Link
                to={`/premiere/${event.id}`}
                className="auth-submit title-premiere-cta"
              >
                {hasTicket
                  ? phase === "feature" || phase === "ads"
                    ? "Join premiere"
                    : "View my ticket"
                  : event.priceCents === 0
                    ? "Reserve seat"
                    : "Buy ticket"}
              </Link>
              {user ? (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => togglePremiereReminder(event.id)}
                >
                  {hasPremiereReminder(event.id) ? "Reminder on" : "Remind me"}
                </button>
              ) : (
                <Link to="/login" className="btn-secondary">
                  Sign in to remind
                </Link>
              )}
            </>
          ) : null}
          {canWatchOnProfile ? (
            <Link
              to={`/title/${title.slug}/watch`}
              className={
                event && phase !== "ended" && !hasTicket
                  ? "btn-secondary title-premiere-cta"
                  : "auth-submit title-premiere-cta"
              }
            >
              {paidWatch && !hasAccess ? "Rent & watch" : "Watch on profile"}
            </Link>
          ) : null}
          {user ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => toggleBookmark("title", title.id)}
            >
              {saved ? "★ On watchlist" : "☆ Add to watchlist"}
            </button>
          ) : (
            <Link to="/login" className="btn-secondary">
              Sign in to save
            </Link>
          )}
          {owner?.username ? (
            <Link to={`/u/${owner.username}`} className="btn-secondary">
              Creator profile
            </Link>
          ) : null}
        </div>
      ) : (
        <p className="hint-banner small">Age verification required to buy tickets or watch.</p>
      )}

      {event && phase !== "ended" ? (
        <p className="small muted title-premiere-hint">
          Step 3–5: buy a ticket → join synced premiere → film unlocks on profile after opening night
          (per creator settings).
        </p>
      ) : canWatchOnProfile ? (
        <p className="small muted title-premiere-hint">
          No upcoming premiere — watch anytime on the creator profile.
        </p>
      ) : null}
    </section>
  );
}
