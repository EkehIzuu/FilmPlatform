import { formatCountdown } from "../../domain/premiereSync";

type Props = {
  phase: "lobby" | "ads" | "feature" | "ended";
  secondsUntilAds: number;
  secondsUntilFeature: number;
  titleName: string;
  featureStartsAt: string;
};

export function PremiereCountdownGate({
  phase,
  secondsUntilAds,
  secondsUntilFeature,
  titleName,
  featureStartsAt,
}: Props) {
  if (phase !== "lobby") return null;

  return (
    <div className="premiere-countdown-gate" role="status" aria-live="polite">
      <p className="premiere-countdown-gate-eyebrow">Countdown</p>
      <h2 className="premiere-countdown-gate-title">{titleName}</h2>
      <p className="premiere-countdown-gate-timer">
        Showtime starts in <strong>{formatCountdown(secondsUntilFeature)}</strong>
      </p>
      <p className="small muted">
        Pre-show begins in {formatCountdown(secondsUntilAds)}.
      </p>
      <p className="small muted">
        Scheduled screening time:{" "}
        {new Date(featureStartsAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} — all ticket holders join the same synced clock.
      </p>
    </div>
  );
}
