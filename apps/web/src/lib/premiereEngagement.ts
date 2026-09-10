import type { FilmDataState, Title } from "../domain/types";
import type { PremiereCard } from "./premiereCatalog";
import { listPremiereCards } from "./premiereCatalog";

export function matchesRegion(title: Title | undefined, region: string): boolean {
  if (!region) return true;
  if (!title?.region) return true;
  return title.region.toLowerCase() === region.toLowerCase();
}

export function filterPremiereCardsByRegion(
  cards: PremiereCard[],
  region: string,
): PremiereCard[] {
  if (!region) return cards;
  return cards.filter((c) => matchesRegion(c.title, region));
}

export function filterTitlesByRegion<T extends { region?: string }>(
  titles: T[],
  region: string,
): T[] {
  if (!region) return titles;
  return titles.filter((t) => matchesRegion(t as Title, region));
}

export function premiereTrendingScore(
  state: FilmDataState,
  card: PremiereCard,
  ticketsSold: number,
): number {
  const title = card.title;
  let score = ticketsSold * 12;
  if (card.isLive) score += 80;
  if (card.isUpcoming) score += 30;
  if (title?.listingBoost === "featured") score += 50;
  const likes = (state.contentLikes ?? []).filter(
    (l) => l.targetType === "title" && l.targetId === card.event.titleId,
  ).length;
  score += likes * 3;
  return score;
}

export function trendingPremiereCards(
  state: FilmDataState,
  ticketsForEvent: (eventId: string) => number,
  region = "",
  limit = 5,
): PremiereCard[] {
  const cards = filterPremiereCardsByRegion(
    listPremiereCards(state).filter((c) => !c.isEnded),
    region,
  );
  return [...cards]
    .sort(
      (a, b) =>
        premiereTrendingScore(state, b, ticketsForEvent(b.event.id)) -
        premiereTrendingScore(state, a, ticketsForEvent(a.event.id)),
    )
    .slice(0, limit);
}
