import type { AnalyticsEvent, FilmDataState } from "../domain/types";

export type TitleAudienceFunnel = {
  titleId: string;
  titleName: string;
  slug: string;
  pageViews: number;
  plays: number;
  ticketCheckouts: number;
  premiereJoins: number;
  viewToPlayPct: number;
  playToTicketPct: number;
};

export type AudienceInsights = {
  funnels: TitleAudienceFunnel[];
  totalPlays: number;
  totalPremiereJoins: number;
  avgViewToPlayPct: number;
};

export function buildAudienceInsights(
  state: FilmDataState,
  creatorId: string,
  events: AnalyticsEvent[],
): AudienceInsights {
  const myTitles = state.titles.filter((t) => t.ownerId === creatorId);
  const myEventIds = new Set(
    state.premiereEvents.filter((e) => e.ownerId === creatorId).map((e) => e.id),
  );
  const eventToTitle = new Map(
    state.premiereEvents.filter((e) => e.ownerId === creatorId).map((e) => [e.id, e.titleId]),
  );

  const funnels: TitleAudienceFunnel[] = myTitles.map((t) => {
    const pageViews = events.filter(
      (e) => e.type === "title_view" && e.meta?.titleId === t.id,
    ).length;
    const plays = events.filter(
      (e) => e.type === "title_play" && e.meta?.titleId === t.id,
    ).length;
    const ticketCheckouts = events.filter((e) => {
      if (e.type !== "premiere_checkout") return false;
      const eventId = e.meta?.eventId;
      return typeof eventId === "string" && eventToTitle.get(eventId) === t.id;
    }).length;
    const premiereJoins = events.filter((e) => {
      if (e.type !== "premiere_player_open") return false;
      const eventId = e.meta?.eventId;
      return typeof eventId === "string" && eventToTitle.get(eventId) === t.id;
    }).length;

    const viewToPlayPct = pageViews > 0 ? Math.round((plays / pageViews) * 100) : 0;
    const playToTicketPct = plays > 0 ? Math.round((ticketCheckouts / plays) * 100) : 0;

    return {
      titleId: t.id,
      titleName: t.name,
      slug: t.slug,
      pageViews,
      plays,
      ticketCheckouts,
      premiereJoins,
      viewToPlayPct,
      playToTicketPct,
    };
  });

  const sorted = funnels.sort((a, b) => b.pageViews - a.pageViews);
  const withViews = sorted.filter((f) => f.pageViews > 0);
  const avgViewToPlayPct =
    withViews.length > 0
      ? Math.round(withViews.reduce((s, f) => s + f.viewToPlayPct, 0) / withViews.length)
      : 0;

  return {
    funnels: sorted,
    totalPlays: sorted.reduce((s, f) => s + f.plays, 0),
    totalPremiereJoins: events.filter(
      (e) =>
        e.type === "premiere_player_open" &&
        typeof e.meta?.eventId === "string" &&
        myEventIds.has(e.meta.eventId as string),
    ).length,
    avgViewToPlayPct,
  };
}
