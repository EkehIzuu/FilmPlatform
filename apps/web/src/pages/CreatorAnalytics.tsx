import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { useFilmData } from "../context/FilmDataContext";
import { buildBusinessAnalytics } from "../lib/businessAnalytics";
import { formatMoney } from "../lib/monetization";

type PromoSnapshot = {
  clicks: number;
  checkouts: number;
  conversionPct: number;
};

function formatDelta(n: number): string {
  if (n > 0) return `+${n}`;
  return `${n}`;
}

export function CreatorAnalytics() {
  const { user } = useAuth();
  const { listAnalyticsEvents, state } = useFilmData();
  const events = listAnalyticsEvents();
  const [promoWindowDays, setPromoWindowDays] = useState<7 | 30>(7);

  const biz = useMemo(
    () => (user?.isCreator ? buildBusinessAnalytics(state, user.id, events) : null),
    [state, user, events],
  );

  const promoSourceStats = useMemo(() => {
    if (!user?.isCreator) return [];
    const now = Date.now();
    const cutoff = now - promoWindowDays * 24 * 60 * 60 * 1000;
    const creatorEventIds = new Set(
      state.premiereEvents.filter((e) => e.ownerId === user.id).map((e) => e.id),
    );
    const clicksBySource: Record<string, number> = {};
    const checkoutsBySource: Record<string, number> = {};

    for (const e of events) {
      const at = new Date(e.createdAt).getTime();
      if (Number.isNaN(at) || at < cutoff) continue;

      if (e.type === "premiere_promo_click") {
        const src = typeof e.meta?.channel === "string" ? e.meta.channel : "unknown";
        clicksBySource[src] = (clicksBySource[src] ?? 0) + 1;
        continue;
      }

      if (e.type === "premiere_checkout") {
        const eventId = typeof e.meta?.eventId === "string" ? e.meta.eventId : "";
        if (!creatorEventIds.has(eventId)) continue;
        const src = typeof e.meta?.src === "string" ? e.meta.src : "unknown";
        checkoutsBySource[src] = (checkoutsBySource[src] ?? 0) + 1;
      }
    }

    const allSources = new Set([...Object.keys(clicksBySource), ...Object.keys(checkoutsBySource)]);
    return [...allSources]
      .map((src) => {
        const clicks = clicksBySource[src] ?? 0;
        const checkouts = checkoutsBySource[src] ?? 0;
        const conversionPct = clicks > 0 ? Math.round((checkouts / clicks) * 100) : null;
        return { src, clicks, checkouts, conversionPct };
      })
      .sort((a, b) => b.checkouts - a.checkouts || b.clicks - a.clicks);
  }, [events, promoWindowDays, state.premiereEvents, user]);

  const promoTrend = useMemo(() => {
    if (!user?.isCreator) return null;
    const now = Date.now();
    const windowMs = promoWindowDays * 24 * 60 * 60 * 1000;
    const currentStart = now - windowMs;
    const previousStart = currentStart - windowMs;
    const creatorEventIds = new Set(
      state.premiereEvents.filter((e) => e.ownerId === user.id).map((e) => e.id),
    );

    const mk = (): PromoSnapshot => ({ clicks: 0, checkouts: 0, conversionPct: 0 });
    const current = mk();
    const previous = mk();

    for (const e of events) {
      const at = new Date(e.createdAt).getTime();
      if (Number.isNaN(at) || at < previousStart || at > now) continue;
      const bucket = at >= currentStart ? current : previous;

      if (e.type === "premiere_promo_click") {
        bucket.clicks += 1;
        continue;
      }

      if (e.type === "premiere_checkout") {
        const eventId = typeof e.meta?.eventId === "string" ? e.meta.eventId : "";
        if (!creatorEventIds.has(eventId)) continue;
        bucket.checkouts += 1;
      }
    }

    current.conversionPct = current.clicks > 0 ? Math.round((current.checkouts / current.clicks) * 100) : 0;
    previous.conversionPct = previous.clicks > 0 ? Math.round((previous.checkouts / previous.clicks) * 100) : 0;

    return {
      current,
      previous,
      deltaClicks: current.clicks - previous.clicks,
      deltaCheckouts: current.checkouts - previous.checkouts,
      deltaConversionPct: current.conversionPct - previous.conversionPct,
    };
  }, [events, promoWindowDays, state.premiereEvents, user]);

  const topConvertingPremiere = useMemo(() => {
    if (!user?.isCreator) return null;
    const now = Date.now();
    const cutoff = now - promoWindowDays * 24 * 60 * 60 * 1000;
    const creatorEvents = state.premiereEvents.filter((e) => e.ownerId === user.id);
    const eventById = new Map(creatorEvents.map((e) => [e.id, e]));
    const rows: Record<string, { checkouts: number; bySource: Record<string, number> }> = {};

    for (const e of events) {
      if (e.type !== "premiere_checkout") continue;
      const at = new Date(e.createdAt).getTime();
      if (Number.isNaN(at) || at < cutoff) continue;
      const eventId = typeof e.meta?.eventId === "string" ? e.meta.eventId : "";
      if (!eventById.has(eventId)) continue;
      const src = typeof e.meta?.src === "string" ? e.meta.src : "unknown";
      if (!rows[eventId]) rows[eventId] = { checkouts: 0, bySource: {} };
      rows[eventId].checkouts += 1;
      rows[eventId].bySource[src] = (rows[eventId].bySource[src] ?? 0) + 1;
    }

    const ranked = Object.entries(rows)
      .map(([eventId, row]) => {
        const event = eventById.get(eventId);
        const topSource = Object.entries(row.bySource).sort((a, b) => b[1] - a[1])[0];
        return {
          eventId,
          title: event?.titleName ?? "Untitled premiere",
          startsAt: event?.featureStartsAt ?? "",
          checkouts: row.checkouts,
          topSource: topSource?.[0] ?? "unknown",
          topSourceCheckouts: topSource?.[1] ?? 0,
        };
      })
      .sort((a, b) => b.checkouts - a.checkouts);

    return ranked[0] ?? null;
  }, [events, promoWindowDays, state.premiereEvents, user]);

  const promoRecommendations = useMemo(() => {
    const notes: string[] = [];
    if (!promoTrend) return notes;

    if (promoTrend.current.clicks === 0) {
      notes.push("Start distribution: post your tracked premiere link on WhatsApp and X at least once this week.");
      return notes;
    }

    if (promoTrend.deltaClicks < 0) {
      notes.push(
        `Top of funnel is down (${formatDelta(promoTrend.deltaClicks)} clicks vs previous ${promoWindowDays}d). Increase posting frequency and repost 2-3 hours before showtime.`,
      );
    } else if (promoTrend.deltaClicks > 0) {
      notes.push(
        `Awareness is improving (${formatDelta(promoTrend.deltaClicks)} clicks). Keep the same posting rhythm and reuse your best-performing message.`,
      );
    }

    if (promoTrend.deltaConversionPct < 0) {
      notes.push(
        `Conversion dipped (${formatDelta(promoTrend.deltaConversionPct)} pts). Tighten your CTA: include showtime and “buy seat now” in first line of every promo post.`,
      );
    } else if (promoTrend.deltaConversionPct > 0) {
      notes.push(
        `Conversion improved (${formatDelta(promoTrend.deltaConversionPct)} pts). Double down on the channels bringing ticket checkouts.`,
      );
    }

    if (topConvertingPremiere) {
      notes.push(
        `Prioritize “${topConvertingPremiere.title}” in the next ${promoWindowDays}d. Best source is ${topConvertingPremiere.topSource.toUpperCase()} (${topConvertingPremiere.topSourceCheckouts} checkouts).`,
      );
    }

    const bestSource = promoSourceStats[0];
    if (bestSource && bestSource.checkouts > 0) {
      notes.push(
        `Primary channel: ${bestSource.src.toUpperCase()} (${bestSource.checkouts} checkouts). Route most traffic there first, then test one secondary channel.`,
      );
    }

    const lowConv = promoSourceStats.find(
      (r) => r.clicks >= 5 && (r.conversionPct ?? 0) <= 5,
    );
    if (lowConv) {
      notes.push(
        `Fix low-converting source ${lowConv.src.toUpperCase()} (${lowConv.conversionPct ?? 0}%): shorten copy and send direct tracked links close to showtime.`,
      );
    }

    if (notes.length === 0) {
      notes.push("Current promo performance is stable. Keep cadence consistent and monitor the top source weekly.");
    }

    return notes.slice(0, 5);
  }, [promoTrend, promoWindowDays, topConvertingPremiere, promoSourceStats]);

  return (
    <div className="page">
      <PageHeader
        title="Business analytics"
        subtitle="Revenue, tickets, commissions, and growth — demo numbers from your local ledger."
      />

      {!user?.isCreator || !biz ? (
        <p className="hint-banner">Creator account required.</p>
      ) : (
        <>
          <div className="card biz-hero">
            <div>
              <span className="stat-label">Your net earnings</span>
              <span className="stat-num stat-num--lg">{formatMoney(biz.creatorNetCents)}</span>
            </div>
            <div>
              <span className="stat-label">Gross sales</span>
              <span className="stat-num">{formatMoney(biz.grossCents)}</span>
            </div>
            <div>
              <span className="stat-label">Platform fee ({biz.commissionRatePct}%)</span>
              <span className="stat-num">{formatMoney(biz.platformFeeCents)}</span>
            </div>
            <div>
              <span className="stat-label">Projected monthly (est.)</span>
              <span className="stat-num">{formatMoney(biz.projectedMonthlyNet)}</span>
            </div>
          </div>

          <div className="card-grid card-grid--compact" style={{ marginTop: "1rem" }}>
            <div className="card">
              <h2 className="form-title">Premiere tickets</h2>
              <p className="stat-num">{biz.ticketsSold}</p>
              <p className="small muted">
                {biz.reservationsCount} purchases · {biz.fillRatePct}% capacity fill
              </p>
              <p className="small">
                <strong>{formatMoney(biz.premiereRevenueCents)}</strong> net from premieres
              </p>
            </div>
            <div className="card">
              <h2 className="form-title">Title rentals</h2>
              <p className="stat-num">{biz.paidTitleViews}</p>
              <p className="small muted">Paid profile watches (events)</p>
              <p className="small">
                <strong>{formatMoney(biz.titleAccessRevenueCents)}</strong> net from VOD access
              </p>
            </div>
            <div className="card">
              <h2 className="form-title">Live gifts</h2>
              <p className="stat-num">{formatMoney(biz.liveGiftRevenueCents)}</p>
              <p className="small muted">Tips during profile lives</p>
            </div>
            <div className="card">
              <h2 className="form-title">Boosts &amp; promos</h2>
              <p className="stat-num">{formatMoney(biz.boostRevenueCents)}</p>
              <p className="small muted">Featured placement &amp; explore boosts</p>
            </div>
            <div className="card">
              <h2 className="form-title">Catalog</h2>
              <p className="small">
                {biz.publishedTitles} published · {biz.paidTitles} paid · {biz.freeTitles} free
              </p>
              <p className="small muted">{biz.upcomingPremieres} upcoming premieres</p>
            </div>
          </div>

          <section className="card" style={{ marginTop: "1rem" }}>
            <h2 className="form-title">Revenue by source</h2>
            {Object.keys(biz.revenueBySource).length === 0 ? (
              <p className="muted small">No sales yet — schedule a premiere or set a title price.</p>
            ) : (
              <ul className="ledger-list">
                {Object.entries(biz.revenueBySource).map(([k, v]) => (
                  <li key={k} className="small">
                    <strong>{k.replace(/_/g, " ")}</strong> — {formatMoney(v)}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card" style={{ marginTop: "1rem" }}>
            <div className="premiere-strip-head">
              <h2 className="form-title">Premiere promo conversion</h2>
              <div className="btn-row">
                <button
                  type="button"
                  className={promoWindowDays === 7 ? "btn-secondary" : "text-btn"}
                  onClick={() => setPromoWindowDays(7)}
                >
                  7d
                </button>
                <button
                  type="button"
                  className={promoWindowDays === 30 ? "btn-secondary" : "text-btn"}
                  onClick={() => setPromoWindowDays(30)}
                >
                  30d
                </button>
              </div>
            </div>
            {promoTrend ? (
              <div className="card-grid card-grid--compact" style={{ marginBottom: "0.75rem" }}>
                <div className="card">
                  <p className="small muted">Promo clicks ({promoWindowDays}d)</p>
                  <p className="stat-num">{promoTrend.current.clicks}</p>
                  <p className="small muted">
                    vs prev {promoWindowDays}d: {formatDelta(promoTrend.deltaClicks)}
                  </p>
                </div>
                <div className="card">
                  <p className="small muted">Ticket checkouts ({promoWindowDays}d)</p>
                  <p className="stat-num">{promoTrend.current.checkouts}</p>
                  <p className="small muted">
                    vs prev {promoWindowDays}d: {formatDelta(promoTrend.deltaCheckouts)}
                  </p>
                </div>
                <div className="card">
                  <p className="small muted">Conversion ({promoWindowDays}d)</p>
                  <p className="stat-num">{promoTrend.current.conversionPct}%</p>
                  <p className="small muted">
                    vs prev {promoWindowDays}d: {formatDelta(promoTrend.deltaConversionPct)} pts
                  </p>
                </div>
              </div>
            ) : null}

            {topConvertingPremiere ? (
              <div className="hint-banner" style={{ marginBottom: "0.75rem" }}>
                <strong>Top converting premiere:</strong> {topConvertingPremiere.title} ·{" "}
                {topConvertingPremiere.checkouts} checkouts in {promoWindowDays}d
                <span className="small muted">
                  {" "}
                  (best source: {topConvertingPremiere.topSource.toUpperCase()} ·{" "}
                  {topConvertingPremiere.topSourceCheckouts})
                </span>
              </div>
            ) : (
              <p className="small muted" style={{ marginBottom: "0.75rem" }}>
                No premiere checkouts yet in this window.
              </p>
            )}

            {promoSourceStats.length === 0 ? (
              <p className="muted small">
                No promo signals yet. Share from Creator Premiere to start tracking clicks and checkouts by source.
              </p>
            ) : (
              <ul className="ledger-list">
                {promoSourceStats.map((row) => (
                  <li key={row.src} className="small">
                    <strong>{row.src.toUpperCase()}</strong> — {row.checkouts} checkout
                    {row.checkouts === 1 ? "" : "s"} from {row.clicks} promo click
                    {row.clicks === 1 ? "" : "s"}
                    {row.conversionPct != null ? (
                      <span className="muted"> · conversion {row.conversionPct}%</span>
                    ) : (
                      <span className="muted"> · conversion N/A</span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="card" style={{ marginTop: "0.85rem" }}>
              <h3 className="form-title">Recommended actions</h3>
              {promoRecommendations.length === 0 ? (
                <p className="small muted">No recommendations yet.</p>
              ) : (
                <ul className="ledger-list">
                  {promoRecommendations.map((line) => (
                    <li key={line} className="small">
                      {line}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="card" style={{ marginTop: "1rem" }}>
            <h2 className="form-title">Recent transactions</h2>
            {biz.recentTransactions.length === 0 ? (
              <p className="muted small">No ledger rows yet.</p>
            ) : (
              <ul className="ledger-list">
                {biz.recentTransactions.map((row) => (
                  <li key={row.id} className="small">
                    <strong>{formatMoney(row.netCents)}</strong> net · {row.label}
                    <span className="muted"> — gross {formatMoney(row.grossCents)}</span>
                    <br />
                    <span className="muted">{new Date(row.at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="small muted" style={{ marginTop: "1rem" }}>
            <Link to="/creator/monetization" className="text-link">
              Monetization tools
            </Link>
            {" · "}
            <Link to="/creator/premiere" className="text-link">
              Schedule premiere
            </Link>
            {" · "}
            <Link to="/creator/titles" className="text-link">
              Title pricing
            </Link>
          </p>
        </>
      )}
    </div>
  );
}
