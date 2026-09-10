import type { PremiereEvent } from "./types";

export type PremierePhase = "lobby" | "ads" | "feature" | "ended";

export type PremiereTimeline = {
  phase: PremierePhase;
  /** Unix ms when ad reel should start. */
  adsStartMs: number;
  /** Unix ms when feature film should start (premiere clock). */
  featureStartsMs: number;
  /** Seconds to seek into the *current* phase video (ads or feature). */
  seekSeconds: number;
  /** Seconds until ads start (lobby only). */
  secondsUntilAds: number;
  /** Seconds until feature starts (lobby or ads). */
  secondsUntilFeature: number;
};

export const SAMPLE_FEATURE_DURATION_SEC = 600;

export function getPremiereTimeline(
  event: PremiereEvent,
  nowMs: number = Date.now(),
): PremiereTimeline {
  const featureStartsMs = new Date(event.featureStartsAt).getTime();
  const preRollMs = Math.max(0, event.preRollAdSeconds) * 1000;
  const adsStartMs = featureStartsMs - preRollMs;

  if (nowMs < adsStartMs) {
    return {
      phase: "lobby",
      adsStartMs,
      featureStartsMs,
      seekSeconds: 0,
      secondsUntilAds: Math.max(0, (adsStartMs - nowMs) / 1000),
      secondsUntilFeature: Math.max(0, (featureStartsMs - nowMs) / 1000),
    };
  }

  if (nowMs < featureStartsMs) {
    const seekSeconds = Math.max(0, (nowMs - adsStartMs) / 1000);
    return {
      phase: "ads",
      adsStartMs,
      featureStartsMs,
      seekSeconds,
      secondsUntilAds: 0,
      secondsUntilFeature: Math.max(0, (featureStartsMs - nowMs) / 1000),
    };
  }

  const seekSeconds = Math.max(0, (nowMs - featureStartsMs) / 1000);
  if (seekSeconds > SAMPLE_FEATURE_DURATION_SEC + 120) {
    return {
      phase: "ended",
      adsStartMs,
      featureStartsMs,
      seekSeconds,
      secondsUntilAds: 0,
      secondsUntilFeature: 0,
    };
  }

  return {
    phase: "feature",
    adsStartMs,
    featureStartsMs,
    seekSeconds,
    secondsUntilAds: 0,
    secondsUntilFeature: 0,
  };
}

export function formatCountdown(totalSeconds: number): string {
  const s = Math.floor(Math.max(0, totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}
