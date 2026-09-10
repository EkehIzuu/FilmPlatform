import type { AnalyticsEvent, LedgerEntry } from "../domain/types";

export type StudioAnalyticsStats = {
  total: number;
  byType: Record<string, number>;
  aiActions: number;
  localizedLanguages: number;
  dataSaverRuns: number;
  grossNgn: number;
  projectedMonthlyNgn: number;
};

export function buildStudioAnalyticsStats(
  events: AnalyticsEvent[],
  ledger: LedgerEntry[],
  userId: string,
): StudioAnalyticsStats {
  const mine = events.filter((e) => e.userId === userId);
  const byType: Record<string, number> = {};
  for (const e of mine) {
    byType[e.type] = (byType[e.type] ?? 0) + 1;
  }
  const aiActions =
    (byType.ai_subtitle_generated ?? 0) +
    (byType.ai_dubbing_generated ?? 0) +
    (byType.ai_promo_generated ?? 0);
  const languageSet = new Set(
    mine
      .filter((e) => e.type.startsWith("ai_"))
      .map((e) => (typeof e.meta?.language === "string" ? e.meta.language : ""))
      .filter(Boolean),
  );
  const dataSaverRuns = mine.filter(
    (e) =>
      e.type === "ai_promo_generated" &&
      typeof e.meta?.priceNgn === "number" &&
      (e.meta.priceNgn as number) <= 1500,
  ).length;
  const grossNgn = ledger.reduce((sum, row) => sum + row.amountCents / 100, 0);
  return {
    total: mine.length,
    byType,
    aiActions,
    localizedLanguages: languageSet.size,
    dataSaverRuns,
    grossNgn,
    projectedMonthlyNgn: Math.round(grossNgn * 8),
  };
}
