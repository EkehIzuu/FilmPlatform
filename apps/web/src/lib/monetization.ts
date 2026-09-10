/** Platform monetization rules (demo — wire to Paystack splits in production). */

export const PLATFORM_COMMISSION_RATE = 0.15;

export const CREATOR_REVENUE_SHARE = 1 - PLATFORM_COMMISSION_RATE;

export function splitPayment(grossCents: number): {
  grossCents: number;
  platformFeeCents: number;
  creatorNetCents: number;
} {
  const gross = Math.max(0, Math.round(grossCents));
  const platformFeeCents = Math.round(gross * PLATFORM_COMMISSION_RATE);
  const creatorNetCents = gross - platformFeeCents;
  return { grossCents: gross, platformFeeCents, creatorNetCents };
}

export function formatMoney(cents: number, currency = "USD"): string {
  const amount = cents / 100;
  if (currency === "NGN") return `₦${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  return `${amount.toFixed(2)} ${currency}`;
}

export const COIN_PACKS = [
  { id: "coins-100", coins: 100, priceCents: 500, currency: "USD", label: "100 coins" },
  { id: "coins-550", coins: 550, priceCents: 2500, currency: "USD", label: "550 coins (+10%)" },
  { id: "coins-1200", coins: 1200, priceCents: 5000, currency: "USD", label: "1,200 coins (+20%)" },
] as const;

export const LIVE_GIFTS = [
  { id: "rose", label: "Rose", coins: 10, creatorShare: 0.7 },
  { id: "clapper", label: "Clapper", coins: 50, creatorShare: 0.7 },
  { id: "spotlight", label: "Spotlight", coins: 200, creatorShare: 0.7 },
] as const;

export const BOOST_PRODUCTS = [
  { id: "featured-7d", label: "Featured placement (7 days)", priceCents: 15000, currency: "USD" },
  { id: "explore-boost", label: "Explore boost (48h)", priceCents: 8000, currency: "USD" },
] as const;

export function generateShareCode(): string {
  const chunk = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${chunk()}-${chunk()}`;
}
