import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import type { PremiereEvent, Title, User } from "../../domain/types";
import { formatCountdown, type PremiereTimeline } from "../../domain/premiereSync";
import { FilmJourneyBar } from "../FilmJourneyBar";
import { PremiereStackBar } from "../PremiereStackBar";
import { PremiereChatPanel } from "./PremiereChatPanel";
import { PremiereCountdownGate } from "./PremiereCountdownGate";
import { PremiereReactionOverlay } from "./PremiereReactionOverlay";

type Props = {
  event: PremiereEvent;
  title?: Title;
  owner: User | null;
  tl: PremiereTimeline;
  children: ReactNode;
  showLobbyVideo?: boolean;
};

export function PremierePlayerShell({
  event,
  title,
  owner,
  tl,
  children,
  showLobbyVideo,
}: Props) {
  const phase = tl.phase;
  const chatDisabled = phase === "ended";
  const formatElapsed = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="page page-premiere page-premiere-player premiere-player-shell">
      <FilmJourneyBar
        activeStep={
          phase === "ended" ? "anytime" : phase === "feature" ? "watch" : "premiere"
        }
        compact
      />

      <header className="premiere-shell-header">
        <p className="premiere-hero-eyebrow">
          {phase === "feature"
            ? "● Showtime in progress"
            : phase === "ads"
              ? "Pre-show screening"
              : phase === "lobby"
                ? "Screening lobby"
                : "Curtain call"}
        </p>
        <h1 className="premiere-shell-title">{event.titleName}</h1>
      </header>

      <PremiereStackBar event={event} owner={owner} compact />

      <div className={`premiere-clock card premiere-shell-clock premiere-shell-clock--${phase}`}>
        {phase === "lobby" && (
          <p>
            <strong>Lobby open</strong> — pre-show starts in{" "}
            <strong>{formatCountdown(tl.secondsUntilAds)}</strong>
            <span className="muted"> · showtime in {formatCountdown(tl.secondsUntilFeature)}</span>
          </p>
        )}
        {phase === "ads" && (
          <p>
            <strong>Pre-show on air</strong> — feature starts in{" "}
            <strong>{formatCountdown(tl.secondsUntilFeature)}</strong>
          </p>
        )}
        {phase === "feature" && (
          <p>
            <strong>Main screening live</strong> — everyone is on the same timeline.
            <span className="muted"> Joining late starts you at {formatElapsed(tl.seekSeconds)}.</span>
          </p>
        )}
        {phase === "ended" && (
          <p>
            <strong>Curtain closed</strong> — this screening has ended.
            {title?.slug ? (
              <>
                {" "}
                <Link to={`/title/${title.slug}/watch`} className="text-link">
                  Watch on profile →
                </Link>
              </>
            ) : (
              <>
                {" "}
                <Link to="/watch/tickets" className="text-link">
                  Back to My tickets →
                </Link>
              </>
            )}
          </p>
        )}
      </div>

      <div className="premiere-experience-layout">
        <div className="premiere-experience-main">
          {phase === "lobby" && !showLobbyVideo ? (
            <PremiereCountdownGate
              phase={phase}
              secondsUntilAds={tl.secondsUntilAds}
              secondsUntilFeature={tl.secondsUntilFeature}
              titleName={event.titleName}
              featureStartsAt={event.featureStartsAt}
            />
          ) : null}
          <div className="premiere-player-stage">
            {children}
            <PremiereReactionOverlay eventId={event.id} disabled={chatDisabled} />
          </div>
          {phase === "lobby" && showLobbyVideo ? (
            <p className="small muted premiere-unmute-hint">
              Screening room is warming up. Chat is open before showtime.
            </p>
          ) : null}
        </div>
        <PremiereChatPanel
          eventId={event.id}
          titleName={event.titleName}
          disabled={chatDisabled}
        />
      </div>

      {title?.slug ? (
        <p className="small premiere-shell-links">
          <Link to={`/title/${title.slug}`} className="text-link">
            Film page
          </Link>
        </p>
      ) : null}
    </div>
  );
}
