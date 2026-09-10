import type {
  AnalyticsEvent,
  PremiereEvent,
  PremiereReservation,
  FilmDataState,
  LedgerEntry,
  Title,
} from "../domain/types";
import { newId } from "../domain/id";
import { CREATOR_REVENUE_SHARE, PLATFORM_COMMISSION_RATE, splitPayment } from "./monetization";

export type BusinessAnalytics = {
  grossCents: number;
  creatorNetCents: number;
  platformFeeCents: number;
  ticketsSold: number;
  premiereRevenueCents: number;
  titleAccessRevenueCents: number;
  liveGiftRevenueCents: number;
  coinSpendCents: number;
  boostRevenueCents: number;
  reservationsCount: number;
  paidTitleViews: number;
  upcomingPremieres: number;
  publishedTitles: number;
  paidTitles: number;
  freeTitles: number;
  fillRatePct: number;
  projectedMonthlyNet: number;
  commissionRatePct: number;
  revenueBySource: Record<string, number>;
  recentTransactions: {
    id: string;
    label: string;
    grossCents: number;
    netCents: number;
    at: string;
  }[];
};

const PLATFORM_CREATOR_ID = "__platform__";

export function buildBusinessAnalytics(
  state: FilmDataState,
  creatorId: string,
  events: AnalyticsEvent[],
): BusinessAnalytics {
  const myTitles = state.titles.filter((t) => t.ownerId === creatorId);
  const myEvents = state.premiereEvents.filter((e) => e.ownerId === creatorId);
  const myEventIds = new Set(myEvents.map((e) => e.id));

  const myReservations = state.premiereReservations.filter((r) => myEventIds.has(r.eventId));
  const ticketsSold = myReservations.reduce((n, r) => n + (r.ticketCount ?? 1), 0);

  const myLedger = state.ledger.filter(
    (l) => l.creatorId === creatorId && l.creatorId !== PLATFORM_CREATOR_ID,
  );
  const platformFees = state.ledger.filter(
    (l) => l.creatorId === PLATFORM_CREATOR_ID && l.meta?.fromCreatorId === creatorId,
  );

  let premiereRevenueCents = 0;
  let titleAccessRevenueCents = 0;
  let liveGiftRevenueCents = 0;
  let coinSpendCents = 0;
  let boostRevenueCents = 0;
  const revenueBySource: Record<string, number> = {};

  for (const row of myLedger) {
    const net = row.amountCents;
    revenueBySource[row.source] = (revenueBySource[row.source] ?? 0) + net;
    switch (row.source) {
      case "premiere_reservation":
        premiereRevenueCents += net;
        break;
      case "title_access":
        titleAccessRevenueCents += net;
        break;
      case "live_gift":
        liveGiftRevenueCents += net;
        break;
      case "coin_purchase":
        coinSpendCents += net;
        break;
      case "boost":
        boostRevenueCents += net;
        break;
      default:
        break;
    }
  }

  const creatorNetCents = myLedger.reduce((s, r) => s + r.amountCents, 0);
  const platformFeeCents = platformFees.reduce((s, r) => s + r.amountCents, 0);
  const grossCents = creatorNetCents + platformFeeCents;

  const capacity = myEvents.reduce((s, e) => s + e.capacity, 0);
  const fillRatePct = capacity > 0 ? Math.min(100, Math.round((ticketsSold / capacity) * 100)) : 0;

  const paidTitleViews = events.filter(
    (e) => e.userId !== creatorId && e.type === "title_access_purchase",
  ).length;

  const recentTransactions = [...myLedger]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 12)
    .map((row) => ({
      id: row.id,
      label: row.label,
      grossCents:
        typeof row.meta?.grossCents === "number"
          ? (row.meta.grossCents as number)
          : Math.round(row.amountCents / CREATOR_REVENUE_SHARE),
      netCents: row.amountCents,
      at: row.createdAt,
    }));

  return {
    grossCents,
    creatorNetCents,
    platformFeeCents,
    ticketsSold,
    premiereRevenueCents,
    titleAccessRevenueCents,
    liveGiftRevenueCents,
    coinSpendCents,
    boostRevenueCents,
    reservationsCount: myReservations.length,
    paidTitleViews,
    upcomingPremieres: myEvents.filter((e) => new Date(e.featureStartsAt) > new Date()).length,
    publishedTitles: myTitles.filter((t) => t.status === "published").length,
    paidTitles: myTitles.filter((t) => t.accessMode === "paid").length,
    freeTitles: myTitles.filter((t) => t.accessMode !== "paid").length,
    fillRatePct,
    projectedMonthlyNet: Math.round(creatorNetCents * 4),
    commissionRatePct: Math.round(PLATFORM_COMMISSION_RATE * 100),
    revenueBySource,
    recentTransactions,
  };
}

export function premiereTicketsUsed(
  reservations: PremiereReservation[],
  eventId: string,
): number {
  return reservations
    .filter((r) => r.eventId === eventId)
    .reduce((n, r) => n + (r.ticketCount ?? 1), 0);
}

export function titleNeedsPayment(title: Title): boolean {
  return title.accessMode === "paid" && (title.accessPriceCents ?? 0) > 0;
}

export function estimatePremiereGross(ev: PremiereEvent, ticketCount: number): number {
  return ev.priceCents * Math.max(1, ticketCount);
}

export function recordLedgerPair(
  creatorId: string,
  source: LedgerEntry["source"],
  label: string,
  grossCents: number,
  currency: string,
  meta: Record<string, unknown>,
): LedgerEntry[] {
  const { platformFeeCents, creatorNetCents } = splitPayment(grossCents);
  const at = new Date().toISOString();
  return [
    {
      id: newId(),
      creatorId,
      source,
      amountCents: creatorNetCents,
      currency,
      label,
      createdAt: at,
      meta: { ...meta, grossCents, platformFeeCents, netCents: creatorNetCents },
    },
    {
      id: newId(),
      creatorId: PLATFORM_CREATOR_ID,
      source: "platform_fee",
      amountCents: platformFeeCents,
      currency,
      label: `Platform fee · ${label}`,
      createdAt: at,
      meta: { ...meta, grossCents, fromCreatorId: creatorId },
    },
  ];
}
