import { getPremiereTimeline } from "../domain/premiereSync";
import type { PremiereEvent, FilmDataState, Title, UploadAsset } from "../domain/types";

export type FilmJourneyStep =
  | "discover"
  | "film"
  | "ticket"
  | "premiere"
  | "watch"
  | "anytime";

export const FILM_JOURNEY_STEPS: { id: FilmJourneyStep; label: string }[] = [
  { id: "discover", label: "Discover" },
  { id: "film", label: "Film" },
  { id: "ticket", label: "Ticket" },
  { id: "premiere", label: "Premiere" },
  { id: "watch", label: "Watch" },
  { id: "anytime", label: "Anytime" },
];

export function findTitleTrailerUpload(
  state: FilmDataState,
  title: Title,
): UploadAsset | undefined {
  return state.uploads.find(
    (u) =>
      u.titleId === title.id &&
      u.kind === "trailer" &&
      u.status === "ready" &&
      (u.publicUrl || u.storagePath),
  );
}

export function featuredTrailerTitles(state: FilmDataState, limit = 6): Title[] {
  const withTrailer = new Set(
    state.uploads
      .filter((u) => u.kind === "trailer" && u.status === "ready")
      .map((u) => u.titleId),
  );
  return state.titles
    .filter((t) => t.status === "published" && withTrailer.has(t.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function getActivePremiereForTitle(
  state: FilmDataState,
  titleId: string,
  now = Date.now(),
): { event: PremiereEvent; phase: ReturnType<typeof getPremiereTimeline>["phase"] } | null {
  const events = state.premiereEvents
    .filter((e) => e.titleId === titleId)
    .sort((a, b) => a.featureStartsAt.localeCompare(b.featureStartsAt));

  const liveOrUpcoming = events.find((e) => {
    const phase = getPremiereTimeline(e, now).phase;
    return phase !== "ended";
  });
  if (liveOrUpcoming) {
    return {
      event: liveOrUpcoming,
      phase: getPremiereTimeline(liveOrUpcoming, now).phase,
    };
  }
  const last = events[events.length - 1];
  if (!last) return null;
  return { event: last, phase: getPremiereTimeline(last, now).phase };
}

export function resolveFilmJourneyStep(input: {
  onHome?: boolean;
  hasPremiere: boolean;
  premiereEnded: boolean;
  hasTicket: boolean;
  premiereLive: boolean;
  inFeature: boolean;
  canWatchOnProfile: boolean;
}): FilmJourneyStep {
  if (input.onHome) return "discover";
  if (!input.hasPremiere || input.premiereEnded) {
    return input.canWatchOnProfile ? "anytime" : "film";
  }
  if (!input.hasTicket) return "ticket";
  if (input.inFeature && input.hasTicket) return "watch";
  if (input.premiereLive && input.hasTicket) return "premiere";
  if (input.hasTicket) return "premiere";
  return "film";
}

export function stepIndex(step: FilmJourneyStep): number {
  return FILM_JOURNEY_STEPS.findIndex((s) => s.id === step);
}
