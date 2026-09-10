import { getPremiereTimeline, formatCountdown } from "@/domain/premiereSync";
import type { PremiereEvent, FilmDataState, Title } from "@/domain/types";

export type PremiereCard = {
  event: PremiereEvent;
  title?: Title;
  phase: ReturnType<typeof getPremiereTimeline>["phase"];
  countdownLabel: string;
  isUpcoming: boolean;
  isLive: boolean;
  isEnded: boolean;
};

export function listPremiereCards(state: FilmDataState): PremiereCard[] {
  const now = Date.now();
  return [...state.premiereEvents]
    .sort((a, b) => new Date(a.featureStartsAt).getTime() - new Date(b.featureStartsAt).getTime())
    .map((event) => {
      const tl = getPremiereTimeline(event, now);
      const title = state.titles.find((t) => t.id === event.titleId);
      const isEnded = tl.phase === "ended";
      const isLive = tl.phase === "ads" || tl.phase === "feature";
      const isUpcoming = tl.phase === "lobby";
      let countdownLabel = "";
      if (isUpcoming) {
        countdownLabel =
          tl.secondsUntilFeature > 3600
            ? formatCountdown(tl.secondsUntilFeature)
            : `Starts in ${formatCountdown(tl.secondsUntilFeature)}`;
      } else if (isLive) {
        countdownLabel = tl.phase === "ads" ? "Pre-show · ads rolling" : "Premiere live now";
      } else {
        countdownLabel = "Premiere ended";
      }
      return { event, title, phase: tl.phase, countdownLabel, isUpcoming, isLive, isEnded };
    });
}

export function upcomingPremieres(state: FilmDataState): PremiereCard[] {
  return listPremiereCards(state).filter((p) => p.isUpcoming || p.isLive);
}

export function watchAnytimeTitles(state: FilmDataState): Title[] {
  return state.titles
    .filter((t) => t.status === "published")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
